'use server'

import { createHmac, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

export type ContactState = {
  status: 'idle' | 'success' | 'error' | 'exhausted'
  message?: string
}

const TO = 'arkodevph@gmail.com'
const COOKIE_NAME = 'rl'
const MAX_ATTEMPTS = 3
const COOLDOWN_MS = 60_000

// Deterministic signing key so cookies survive across Server Action calls.
// Set RATE_LIMIT_SECRET in env for persistence across deploys.
function signKey(): string {
  const env = process.env.RATE_LIMIT_SECRET
  if (env) return env
  if (!(globalThis as any).__rlKey) (globalThis as any).__rlKey = randomBytes(32).toString('hex')
  return (globalThis as any).__rlKey
}

type RateData = { a: number; t: number }

function checkLimit(data: RateData | null, now: number): { allowed: boolean; retryAfterSec: number; next: RateData; exhausted: boolean } {
  // Hard cap — 3 submissions max
  if (data && data.a >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: 0, next: data, exhausted: true }
  }

  if (!data) {
    return { allowed: true, retryAfterSec: 0, next: { a: 1, t: now }, exhausted: false }
  }

  const elapsed = now - data.t

  if (elapsed < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
    return { allowed: false, retryAfterSec: remaining, next: data, exhausted: false }
  }

  return { allowed: true, retryAfterSec: 0, next: { a: data.a + 1, t: now }, exhausted: false }
}

/** Encode + HMAC-sign rate data into a cookie value. */
function encode(data: RateData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = createHmac('sha256', signKey()).update(payload).digest('base64url').slice(0, 12)
  return `${payload}.${sig}`
}

/** Verify signature + decode. Returns null if tampered. */
function decode(raw: string): RateData | null {
  try {
    const dot = raw.lastIndexOf('.')
    if (dot === -1) return null
    const payload = raw.slice(0, dot)
    const sig = raw.slice(dot + 1)
    const expected = createHmac('sha256', signKey()).update(payload).digest('base64url').slice(0, 12)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
}

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()

  if (!name || !email) {
    return { status: 'error', message: 'Add your name and email so we can reply.' }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: 'error', message: 'That email does not look right.' }
  }

  // — Gibberish guard (no API needed) —
  if (message.length < 3) {
    return { status: 'error', message: 'Tell us a bit more about what you are building.' }
  }

  const words = message.trim().split(/\s+/)
  const lower = message.toLowerCase()

  // Must have at least 3 words
  if (words.length < 3) {
    return { status: 'error', message: 'Tell us a bit more about what you are building.' }
  }

  // Keyboard smash / repeated chars
  if (/(.)\1{4,}|(?:^|\s)[a-z]{1,2}(?:\s|$)/i.test(message)) {
    return { status: 'error', message: 'Please write a real message — we are people, not robots.' }
  }

  // Single word repeated 3+ times
  const unique = new Set(words.map((w) => w.toLowerCase()))
  if (unique.size <= 1) {
    return { status: 'error', message: 'That does not look like a real project description.' }
  }

  // Low character variety — mash patterns like "asdf", "qwerty"
  const chars = new Set(lower.replace(/\s/g, ''))
  if (chars.size < 4) {
    return { status: 'error', message: 'Please describe your project in more detail.' }
  }

  // — Rate limit via signed cookie (survives page refresh)
  const cookieStore = await cookies()
  const existing = cookieStore.get(COOKIE_NAME)?.value
  const data = existing ? decode(existing) : null
  const now = Date.now()

  const { allowed, retryAfterSec, next, exhausted } = checkLimit(data, now)

  // Write cookie — survives refresh
  cookieStore.set(COOKIE_NAME, encode(next), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.ceil(COOLDOWN_MS / 1000) * MAX_ATTEMPTS,
  })

  if (!allowed) {
    if (exhausted) {
      return { status: 'exhausted', message: 'You have used all available submissions.' }
    }
    return {
      status: 'error',
      message: retryAfterSec < 60
        ? `Slow down. Try again in ${retryAfterSec} seconds.`
        : `Slow down. Try again in ${Math.ceil(retryAfterSec / 60)} minute${Math.ceil(retryAfterSec / 60) > 1 ? 's' : ''}.`,
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      status: 'error',
      message: `Email is not connected yet. Reach us directly at ${TO}.`,
    }
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: 'Arko Site <onboarding@resend.dev>',
      to: TO,
      replyTo: email,
      subject: `New project inquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message || '(no message)'}`,
    })
    if (error) {
      return { status: 'error', message: `Could not send. Email us at ${TO}.` }
    }
    return { status: 'success', message: 'Got it. We will get back to you within a day.' }
  } catch {
    return { status: 'error', message: `Could not send. Email us at ${TO}.` }
  }
}
