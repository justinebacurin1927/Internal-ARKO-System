const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh')
}

async function attemptRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem('token', data.access)
    return true
  } catch {
    return false
  }
}

let refreshing: Promise<boolean> | null = null

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  let res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  // 401 → try refreshing the token once
  if (res.status === 401 && getRefreshToken()) {
    // Deduplicate concurrent refresh attempts
    if (!refreshing) refreshing = attemptRefresh()
    const ok = await refreshing
    refreshing = null
    if (ok) {
      const newToken = getToken()
      res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
          ...options.headers,
        },
      })
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || err.message || 'Request failed')
  }
  return res.json()
}

export const api = {
  health: () => request<{ status: string }>('/health/'),

  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; refresh: string; user: any }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name?: string) =>
    request<{ token: string; refresh: string; user: any }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  me: () => request<any>('/auth/me/'),
  updateProfile: (data: any) =>
    request<any>('/auth/me/', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (old_password: string, new_password: string) =>
    request<any>('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),

  // Tasks
  getTasks: () => request<any[]>('/tasks/'),
  createTask: (data: any) =>
    request<any>('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) =>
    request<any>(`/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    request<void>(`/tasks/${id}/`, { method: 'DELETE' }),

  // Finance
  getBalance: () => request<{ balance: number; income: number; expenses: number }>('/finance/balance/'),
  getTransactions: (months?: number) =>
    request<any[]>(`/finance/transactions/${months ? `?months=${months}` : ''}`),
  createTransaction: (data: any) =>
    request<any>('/finance/transactions/', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: any) =>
    request<any>(`/finance/transactions/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) =>
    request<void>(`/finance/transactions/${id}/`, { method: 'DELETE' }),
  getCategories: () => request<any[]>('/finance/categories/'),

  // Messages
  getConversations: () => request<any[]>('/messages/conversations/'),
  getMessages: (conversationId: string, cursor?: string) =>
    request<any>(`/messages/${conversationId}/?limit=50${cursor ? `&cursor=${cursor}` : ''}`),
  sendMessage: (conversationId: string, content: string) =>
    request<any>(`/messages/${conversationId}/`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  createConversation: (participantId: string) =>
    request<any>('/messages/conversations/create/', {
      method: 'POST',
      body: JSON.stringify({ participant_id: participantId }),
    }),

  // Reminders
  getReminders: () => request<any[]>('/reminders/'),
  createReminder: (data: any) =>
    request<any>('/reminders/', { method: 'POST', body: JSON.stringify(data) }),
  toggleReminder: (id: string) =>
    request<any>(`/reminders/${id}/toggle/`, { method: 'PATCH' }),
  deleteReminder: (id: string) =>
    request<void>(`/reminders/${id}/`, { method: 'DELETE' }),

  // Notes
  getNotes: () => request<any[]>('/notes/'),
  getNote: (id: string) => request<any>(`/notes/${id}/`),
  createNote: (data: any) =>
    request<any>('/notes/', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: any) =>
    request<any>(`/notes/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNote: (id: string) =>
    request<void>(`/notes/${id}/`, { method: 'DELETE' }),

  // Calendar events
  getEvents: (dateFrom?: string, dateTo?: string) =>
    request<any[]>(`/events/${dateFrom || dateTo ? `?${dateFrom ? `date_from=${dateFrom}` : ''}${dateFrom && dateTo ? '&' : ''}${dateTo ? `date_to=${dateTo}` : ''}` : ''}`),
  createEvent: (data: any) =>
    request<any>('/events/', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: any) =>
    request<any>(`/events/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEvent: (id: string) =>
    request<void>(`/events/${id}/`, { method: 'DELETE' }),

  // Sprints
  getSprints: (activeOnly?: boolean) =>
    request<any[]>(`/events/sprints/${activeOnly ? '?active=true' : ''}`),
  createSprint: (data: any) =>
    request<any>('/events/sprints/', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  searchUsers: (query?: string) =>
    request<any[]>(`/users/search/${query ? `?query=${query}` : ''}`),
}
