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
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600 mb-4">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <h1 className="text-xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-gray-400 mt-1">Join Arko to get started</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6 shadow-card">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters" required className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20" />
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-accent-700 transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />Creating…</> : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account? <a href="/login" className="font-medium text-accent-600 hover:text-accent-700">Sign in</a>
        </p>
      </div>
    </div>
  )
}
