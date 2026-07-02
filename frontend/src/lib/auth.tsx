import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from './api'

interface User {
  id: string
  name: string
  email: string
  image: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.me()
        .then(setUser)
        .catch(() => { localStorage.removeItem('token'); setToken(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password)
    localStorage.setItem('token', res.token)
    if (res.refresh) localStorage.setItem('refresh', res.refresh)
    setToken(res.token)
    setUser(res.user)
  }

  const register = async (email: string, password: string, name?: string) => {
    const res = await api.register(email, password, name)
    localStorage.setItem('token', res.token)
    if (res.refresh) localStorage.setItem('refresh', res.refresh)
    setToken(res.token)
    setUser(res.user)
  }

  const refreshUser = async () => {
    try {
      const u = await api.me()
      setUser(u)
    } catch {
      // ignore
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
