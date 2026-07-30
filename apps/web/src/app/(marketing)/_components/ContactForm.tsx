'use client'

import { useActionState, useEffect, useState } from 'react'
import { type ContactState, sendContact } from '../actions/contact'
import StarBorder from './StarBorder'

const LS_KEY = 'arko_submitted'
const initial: ContactState = { status: 'idle' }

const FIELDS = [
  { name: 'name', label: 'Your name', type: 'text' },
  { name: 'email', label: 'Work email', type: 'email' },
] as const

function readPersisted(): ContactState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as ContactState
    if (p.status === 'success' || p.status === 'exhausted') return p
    return null
  } catch {
    return null
  }
}

function persist(st: ContactState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(st)) } catch { /* noop */ }
}

export default function ContactForm() {
  const [doneState, setDoneState] = useState<ContactState | null>(null)
  const [state, formAction, pending] = useActionState(sendContact, initial)

  // Hydration-safe: restore from localStorage after mount
  useEffect(() => {
    setDoneState(readPersisted())
  }, [])

  // Persist done states so they survive future refreshes
  useEffect(() => {
    if (state.status === 'success' || state.status === 'exhausted') {
      persist(state)
      setDoneState(state)
    }
  }, [state])

  // — render —
  // Use live state if done, otherwise fall back to persisted state
  const final: ContactState | null =
    state.status === 'success' || state.status === 'exhausted' ? state : doneState

  if (final && final.status === 'success') {
    return (
      <div className="flex h-full flex-col justify-center gap-4">
        <p className="display text-3xl text-acid md:text-4xl">Message sent.</p>
        <p className="max-w-sm text-base font-medium text-white/70">{final.message}</p>
      </div>
    )
  }

  if (final && final.status === 'exhausted') {
    return (
      <div className="flex h-full flex-col justify-center gap-4">
        <p className="display text-3xl text-acid md:text-4xl">Inbox full.</p>
        <p className="max-w-sm text-base font-medium text-white/70">
          Thanks for reaching out. Reach us directly at{' '}
          <a href="mailto:arkodevph@gmail.com" className="text-acid underline underline-offset-4">
            arkodevph@gmail.com
          </a>
        </p>
      </div>
    )
  }

  // SSR / first paint: match the form so hydration doesn't mismatch
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {FIELDS.map((f) => (
        <label key={f.name} className="flex flex-col gap-2">
          <span className="eyebrow text-white/50">{f.label}</span>
          <input
            name={f.name}
            type={f.type}
            required
            className="border-b-2 border-white/20 bg-transparent py-3 text-lg font-medium outline-none transition-colors focus:border-acid"
          />
        </label>
      ))}
      <label className="flex flex-col gap-2">
        <span className="eyebrow text-white/50">What are you building?</span>
        <textarea
          name="message"
          rows={3}
          required
          className="resize-none border-b-2 border-white/20 bg-transparent py-3 text-lg font-medium outline-none transition-colors focus:border-acid"
        />
      </label>

      {state.status === 'error' && (
        <p className="mono text-sm text-red-400" aria-live="polite">
          {state.message}
        </p>
      )}

      <StarBorder as="button" disabled={pending} className="mt-4 self-start">
        {pending ? 'Sending...' : 'Send it →'}
      </StarBorder>
    </form>
  )
}
