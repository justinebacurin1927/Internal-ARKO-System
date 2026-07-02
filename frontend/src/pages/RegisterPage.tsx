import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      setError('')
      await register(email, password, name || undefined)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left panel — brand side */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center bg-[#0a0a0f] relative overflow-hidden select-none">
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
          <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
            Your all-in-one workspace for tasks, notes, finance, reminders, and team messaging.
          </p>
        </div>
      </div>

      {/* Right panel — register form */}
      <div className="flex flex-1 items-center justify-center bg-[#09090b] px-4">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="text-lg font-bold text-white">Arko</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">Create Account</h1>
            <p className="text-sm text-zinc-500 mt-1">Join Arko to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-800/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="block w-full rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="block w-full rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="block w-full rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-accent-700 transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />Creating…</> : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-accent-500 hover:text-accent-400 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
