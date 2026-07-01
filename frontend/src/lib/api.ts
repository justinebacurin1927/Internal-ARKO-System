const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || err.message || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name?: string) =>
    request<{ token: string; user: any }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  me: () => request<any>('/auth/me/'),

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

  // Users
  searchUsers: (query?: string) =>
    request<any[]>(`/users/search/${query ? `?query=${query}` : ''}`),
}
