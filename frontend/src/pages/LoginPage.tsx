import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { Loader2 } from 'lucide-react'

/* ─── Fallback quotes when the API is unreachable ─── */

const fallbackQuotes = [
  { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { content: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { content: "Make it simple, but significant.", author: "Don Draper" },
  { content: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs" },
  { content: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { content: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { content: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { content: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { content: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { content: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { content: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { content: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { content: "Everything you can imagine is real.", author: "Pablo Picasso" },
  { content: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { content: "Great things never come from comfort zones.", author: "Roy T. Bennett" },
  { content: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { content: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { content: "The secret of getting ahead is getting started.", author: "Mark Twain" },
]

interface Quote {
  content: string
  author: string
}

/* ─── Quote hook (cached in sessionStorage — survives refresh, resets on sign in/out) ─── */

const CACHE_KEY = 'arko-session-quote'

function useQuote(): { quote: Quote | null; loading: boolean } {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check sessionStorage
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        setQuote(JSON.parse(cached))
        setLoading(false)
        return
      } catch { /* fall through to fetch */ }
    }

    // Fetch from quotable.io
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    fetch('https://api.quotable.io/quotes/random?limit=1', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const q: Quote = { content: data[0].content, author: data[0].author }
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(q))
          setQuote(q)
        } else {
          throw new Error('Unexpected response')
        }
      })
      .catch(() => {
        const idx = Math.floor(Math.random() * fallbackQuotes.length)
        setQuote(fallbackQuotes[idx])
      })
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return { quote, loading }
}

/* ─── Loading shimmer for quote panel ─── */

function QuoteSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg mx-auto px-8 gap-5">
      <div className="h-36 w-24 animate-pulse rounded bg-white/5" />
      <div className="space-y-3 w-full">
        <div className="h-6 bg-white/5 animate-pulse rounded w-3/4" />
        <div className="h-6 bg-white/5 animate-pulse rounded w-2/3" />
        <div className="h-6 bg-white/5 animate-pulse rounded w-1/2" />
      </div>
      <div className="h-4 bg-white/5 animate-pulse rounded w-1/3 mt-2" />
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      setError('')
      await login(email, password)
      // Clear cached quote so next sign-in gets a fresh one
      sessionStorage.removeItem(CACHE_KEY)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#09090b] px-6">
      <div className="w-full max-w-sm">
        {/* Mobile-brand */}
        <div className="lg:hidden text-center mb-8">
          <span className="font-display text-3xl text-white/85" style={{ letterSpacing: '0.10em' }}>
            A R K O
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-medium text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800/50 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
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
              className="block w-full rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="block w-full rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-accent-700 transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />Signing in…</>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Don&apos;t have an account?{' '}
          <a href="/register" className="font-medium text-accent-500 hover:text-accent-400 transition-colors">
            Create one
          </a>
        </p>
      </div>
    </div>
  )
}

/* ─── Quote panel ─── */

function QuotePanel({ quote, loading }: { quote: Quote | null; loading: boolean }) {
  return (
    <div className="hidden lg:flex lg:w-[55%] flex-col bg-[#0A0B0D] relative overflow-hidden select-none">
      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Subtle gradient glow */}
      <div
        className="absolute -top-1/2 -right-1/4 w-[80%] aspect-square rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #2D6A4F 0%, transparent 70%)',
        }}
      />

      {/* Quote content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12">
        {loading ? (
          <QuoteSkeleton />
        ) : quote ? (
          <div
            className="flex flex-col items-center w-full max-w-xl animate-[fade-in_0.8s_ease-out]"
          >
            {/* ARKO wordmark — big and centered above the quote */}
            <h1
              className="font-display text-[clamp(36px,4.5vw,64px)] leading-none text-white/85 mb-10"
              style={{ letterSpacing: '0.10em' }}
            >
              A R K O
            </h1>

            {/* Massive opening quotation mark */}
            <div
              className="relative w-full"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 0.7 }}
            >
              <span
                className="block select-none leading-none"
                style={{
                  fontSize: 'clamp(140px, 18vw, 240px)',
                  color: 'rgba(201, 149, 74, 0.08)',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '-0.04em',
                }}
              >
                &ldquo;
              </span>

              {/* Quote text */}
              <div
                className="absolute inset-0 flex items-center pl-[clamp(36px,5vw,60px)] pr-2"
                style={{ top: 'clamp(24px, 3vw, 48px)' }}
              >
                <blockquote>
                  <p
                    className="font-serif text-[clamp(18px,2.2vw,30px)] leading-[1.5] text-[#E8E5DE] font-normal"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {quote.content}
                  </p>
                </blockquote>
              </div>
            </div>

            {/* Attribution */}
            <div className="self-end mt-6 mr-2">
              <cite
                className="not-italic text-[clamp(13px,1.1vw,16px)] text-zinc-500"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}
              >
                &mdash; {quote.author}
              </cite>
            </div>

            {/* Daily quote label */}
            <div className="mt-auto mb-8">
              <span
                className="text-[10px] uppercase tracking-[0.2em] text-zinc-700"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Quote of the day
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

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
