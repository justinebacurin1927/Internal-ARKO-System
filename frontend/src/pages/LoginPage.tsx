import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { Loader2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'

/* ─── Fallback quotes ─── */

const fallbackQuotes = [
  { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { content: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { content: "Make it simple, but significant.", author: "Don Draper" },
  { content: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs" },
  { content: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { content: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { content: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { content: "Quality is not an act, it is a habit.", author: "Aristotle" },
]

interface Quote { content: string; author: string }

/* ─── Quote hook ─── */

const CACHE_KEY = 'arko-session-quote'

function useQuote(): { quote: Quote | null; loading: boolean } {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try { setQuote(JSON.parse(cached)); setLoading(false); return }
      catch { /* fall through */ }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    fetch('https://api.quotable.io/quotes/random?limit=1', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const q: Quote = { content: data[0].content, author: data[0].author }
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(q))
          setQuote(q)
        } else { throw new Error('Unexpected response') }
      })
      .catch(() => { setQuote(fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]) })
      .finally(() => { clearTimeout(timeout); setLoading(false) })

    return () => { clearTimeout(timeout); controller.abort() }
  }, [])

  return { quote, loading }
}

/* ─── Quote panel ─── */

function QuotePanel({ quote, loading }: { quote: Quote | null; loading: boolean }) {
  return (
    <div className="hidden lg:flex lg:w-[55%] flex-col bg-[#09090B] relative overflow-hidden select-none">
      {/* Ambient gradient orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[70%] aspect-square rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, #2D6A4F 0%, transparent 70%)',
          animation: 'float-drift 30s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[60%] aspect-square rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #40916C 0%, transparent 70%)',
          animation: 'float-drift-slow 40s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[40%] right-[-10%] w-[40%] aspect-square rounded-full opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle, #C28B5E 0%, transparent 70%)',
          animation: 'float-drift 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Subtle ambient shimmer */}
      <div
        className="absolute inset-0 opacity-[0.03] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
          animation: 'shimmer-shift 8s ease-in-out infinite',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-12 pt-8 pb-12">
        {/* ARKO wordmark */}
        <span
          className="select-none font-display-smooth text-[clamp(40px,5vw,72px)] leading-none text-white/85"
          style={{ fontWeight: 700, animation: 'fade-in-left 0.8s ease-out' }}
        >
          A R K O
        </span>

        {/* Quote */}
        <div className="flex flex-col justify-center flex-1 min-h-0 max-w-xl mx-auto w-full">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-5 w-16 rounded bg-white/5" />
              <div className="space-y-3">
                <div className="h-7 bg-white/5 rounded w-full" />
                <div className="h-7 bg-white/5 rounded w-5/6" />
                <div className="h-7 bg-white/5 rounded w-4/6" />
              </div>
              <div className="h-4 bg-white/5 rounded w-1/3" />
            </div>
          ) : quote ? (
            <div style={{ animation: 'fade-in 0.8s ease-out' }}>
              {/* Decorative opening */}
              <div className="mb-6">
                <span
                  className="block select-none leading-none"
                  style={{
                    fontSize: 'clamp(100px, 12vw, 180px)',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontFamily: "'Alfa Slab One', serif",
                    fontWeight: 400,
                    lineHeight: 0.6,
                  }}
                >
                  &ldquo;
                </span>
              </div>
              <blockquote className="-mt-4">
                <p
                  className="font-serif text-[clamp(17px,2vw,26px)] leading-[1.6] text-[#E8E5DE] font-normal"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {quote.content}
                </p>
              </blockquote>
              <cite
                className="block mt-5 not-italic text-[clamp(13px,1vw,15px)] text-zinc-500"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}
              >
                &mdash; {quote.author}
              </cite>
              <div className="mt-auto pt-12">
                <span
                  className="text-[9px] uppercase tracking-[0.25em] text-zinc-700"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Quote of the day
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ─── Login form ─── */

function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [touchError, setTouchError] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setTouchError(false)
    try {
      setError('')
      await login(email, password)
      sessionStorage.removeItem(CACHE_KEY)
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setTouchError(true)
      setTimeout(() => setTouchError(false), 500)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#09090B] px-6 relative overflow-hidden">
      {/* Subtle right-side glow */}
      <div
        className="absolute top-[-30%] right-[-20%] w-[60%] aspect-square rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #2D6A4F 0%, transparent 70%)' }}
      />

      <div
        ref={formRef}
        className="relative w-full max-w-sm"
        style={{ animation: 'fade-in-up 0.6s ease-out' }}
      >
        {/* Mobile-brand */}
        <div className="lg:hidden text-center mb-8">
          <span className="font-display-smooth text-3xl text-white/85">
            A R K O
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.06] p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-7" style={{ animation: 'fade-in-up 0.5s ease-out 0.1s both' }}>
            <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Sign in to your dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className={`mb-5 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2.5 ${touchError ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Lock className="h-3.5 w-3.5 shrink-0 text-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4"
            style={{ animation: 'fade-in-up 0.5s ease-out 0.2s both' }}
          >
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-accent-500/60 focus:outline-none focus:ring-2 focus:ring-accent-500/15 focus:bg-white/[0.05] transition-all duration-200"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 pr-11 text-sm text-white placeholder:text-zinc-600 focus:border-accent-500/60 focus:outline-none focus:ring-2 focus:ring-accent-500/15 focus:bg-white/[0.05] transition-all duration-200"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setRemember((s) => !s)}
                  className={`h-4 w-4 rounded border transition-all duration-150 flex items-center justify-center ${
                    remember
                      ? 'bg-accent-600 border-accent-600'
                      : 'border-zinc-700 group-hover:border-zinc-500'
                  }`}
                >
                  {remember && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors select-none cursor-pointer"
                      onClick={() => setRemember((s) => !s)}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Remember me
                </span>
              </label>
              <a
                href="/forgot-password"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-600/20 hover:bg-accent-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in&hellip;
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Social login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-3 text-zinc-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 active:scale-[0.98]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 active:scale-[0.98]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </button>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div
          className="mt-5 flex items-center justify-center gap-1.5"
          style={{ animation: 'fade-in-up 0.5s ease-out 0.5s both' }}
        >
          <ShieldCheck className="h-3 w-3 text-zinc-700" />
          <span className="text-[10px] text-zinc-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Encrypted &amp; secure
          </span>
        </div>

        {/* Signup link */}
        <p
          className="mt-5 text-center text-sm text-zinc-500"
          style={{ fontFamily: "'DM Sans', sans-serif", animation: 'fade-in-up 0.5s ease-out 0.3s both' }}
        >
          Don&apos;t have an account?{' '}
          <a href="/register" className="font-medium text-accent-500 hover:text-accent-400 transition-colors">
            Create one
          </a>
        </p>

        {/* Divider */}
        <div className="mt-8 border-t border-white/[0.04]" />

        {/* Legal links */}
        <div
          className="mt-4 flex items-center justify-center gap-4"
          style={{ animation: 'fade-in-up 0.5s ease-out 0.6s both' }}
        >
          <a href="/terms" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>Terms</a>
          <span className="text-zinc-700 select-none text-[6px]">&#x25C9;</span>
          <a href="/privacy" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>Privacy</a>
          <span className="text-zinc-700 select-none text-[6px]">&#x25C9;</span>
          <a href="/cookies" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>Cookies</a>
        </div>

        {/* Copyright */}
        <p className="mt-3 text-center text-[10px] text-zinc-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          &copy; 2026 Arko. All rights reserved.
        </p>
      </div>
    </div>
  )
}

/* ─── Shake animation ─── */

const styleSheet = typeof document !== 'undefined' ? (() => {
  const el = document.createElement('style')
  el.textContent = `@keyframes shake { 0%,100% { transform: translateX(0) } 10%,30%,50%,70%,90% { transform: translateX(-4px) } 20%,40%,60%,80% { transform: translateX(4px) } }`
  document.head.appendChild(el)
  return el
})() : null

/* ─── Page ─── */

export default function LoginPage() {
  const { quote, loading } = useQuote()

  return (
    <div className="flex min-h-[100dvh]">
      <QuotePanel quote={quote} loading={loading} />
      <LoginForm />
    </div>
  )
}
