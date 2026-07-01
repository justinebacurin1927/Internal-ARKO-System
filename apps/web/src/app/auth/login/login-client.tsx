'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@arko/ui'
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Animated word rotator ──────────────────────────────────────────

const WORDS = ['BUILD', 'CRAFT', 'CREATE', 'SHIP', 'SCALE']

function RotatingWord() {
  const [index, setIndex] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const prefersReduced = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReduced.current = mq.matches
    if (mq.matches) return

    const interval = setInterval(() => {
      setFlipping(true)
      setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length)
        setFlipping(false)
      }, 300)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="relative inline-block">
      <span
        className={`inline-block font-heading font-bold tracking-tighter text-primary-400 transition-all duration-300 ${
          flipping ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {WORDS[index]}
      </span>
    </span>
  )
}

// ─── Login form ─────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setJustRegistered(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500">
          Sign in to your Arko workspace
        </p>
      </div>

      {justRegistered && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary-500/15 bg-primary-500/10 p-3">
          <p className="text-sm text-primary-300">
            Account created. Sign in to get started.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-800 bg-[#18181b] p-8">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
            className="block w-full rounded-xl border border-zinc-700 bg-[#1f1f23] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-all duration-150 focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="block w-full rounded-xl border border-zinc-700 bg-[#1f1f23] px-4 py-2.5 pr-11 text-sm text-white placeholder:text-zinc-500 transition-all duration-150 focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/15 bg-red-500/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-primary-500 font-medium text-black transition-all duration-150 hover:bg-primary-400 active:scale-[0.98]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="font-medium text-primary-400 transition-colors hover:text-primary-300">
          Create one
        </Link>
      </p>
    </div>
  )
}

// ─── Export for the page ────────────────────────────────────────────

export default function LoginClient() {
  return (
    <>
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 lg:px-16 py-12 lg:py-0">
        <div className="w-full max-w-lg">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase font-heading">
            Arko
          </p>
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-bold tracking-tighter leading-none text-white font-heading">
            Arko
          </h1>
          <p className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tighter leading-none text-primary-400 font-heading">
            <RotatingWord />
          </p>
          <p className="mt-8 max-w-sm text-sm leading-relaxed text-zinc-500">
            Build with clarity. Arko connects your money, tasks, and team in
            one place.
          </p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 lg:px-8 py-12 lg:py-0">
        <LoginForm />
      </div>
    </>
  )
}
