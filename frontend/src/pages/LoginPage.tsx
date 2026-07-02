import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'

const taglines = ['Create', 'Elevate', 'Ship', 'Build', 'Launch', 'Innovate']

function AnimatedWord({ text }: { text: string }) {
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const [displayText, setDisplayText] = useState(text)

  useEffect(() => {
    if (displayText === text) return
    setPhase('out')
    const t1 = setTimeout(() => {
      setDisplayText(text)
      setPhase('in')
    }, 180)
    const t2 = setTimeout(() => {
      setPhase('idle')
    }, 380)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [text])

  return (
    <div className="relative inline-flex h-14 md:h-16 min-w-[200px]">
      <span
        className={`absolute inset-x-0 text-2xl md:text-3xl font-bold leading-none transition-all duration-[180ms] ease-in-out ${
          phase === 'out'
            ? 'opacity-0 -translate-y-3 scale-[0.92]'
            : phase === 'in'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-100 translate-y-0'
        } text-primary-400`}
      >
        {displayText}
      </span>
    </div>
  )
}

function LoginClient() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [taglineIndex, setTaglineIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % taglines.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      await login(email, password)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left panel — brand side */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center bg-[#0a0a0f] relative overflow-hidden select-none">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative text-center z-10 px-8">
          <h1 className="text-7xl md:text-8xl font-black tracking-tight text-white leading-none mb-8">
            Arko
          </h1>

          <div className="flex justify-center mb-5">
            <AnimatedWord text={taglines[taglineIndex]} />
          </div>

          <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
            Your all-in-one workspace for tasks, notes, finance, reminders, and team messaging.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center bg-[#09090b] px-4">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="text-lg font-bold text-white">Arko</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-800/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="block w-full rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="block w-full rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-primary-700 transition-colors active:scale-[0.97]"
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{' '}
            <a href="/register" className="font-medium text-primary-500 hover:text-primary-400 transition-colors">
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginClient />
}
