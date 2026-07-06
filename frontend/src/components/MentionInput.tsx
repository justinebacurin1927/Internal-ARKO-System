import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { AtSign } from 'lucide-react'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
  onSubmit?: () => void
  autoFocus?: boolean
}

export default function MentionInput({
  value,
  onChange,
  placeholder = 'Write a comment…',
  minRows = 2,
  onSubmit,
  autoFocus,
}: MentionInputProps) {
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.searchUsers(),
  })

  const filteredUsers = (users ?? []).filter(
    (u: any) =>
      u.name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(mentionSearch.toLowerCase()),
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      onChange(val)
      const pos = e.target.selectionStart || 0
      setCursorPos(pos)

      // Check for @ trigger
      const beforeCursor = val.slice(0, pos)
      const atIndex = beforeCursor.lastIndexOf('@')
      if (atIndex !== -1) {
        const afterAt = beforeCursor.slice(atIndex + 1)
        // Only show if there's no space before @, or it's at start
        const charBefore = atIndex > 0 ? beforeCursor[atIndex - 1] : ' '
        if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
          setMentionSearch(afterAt)
          setMentionOpen(true)
        } else {
          setMentionOpen(false)
        }
      } else {
        setMentionOpen(false)
      }
    },
    [onChange],
  )

  const selectUser = (user: any) => {
    const beforeAt = value.slice(0, cursorPos)
    const atIndex = beforeAt.lastIndexOf('@')
    const afterAt = value.slice(cursorPos)
    const newValue = beforeAt.slice(0, atIndex) + `@${user.name || user.email} ` + afterAt
    onChange(newValue)
    setMentionOpen(false)
    textareaRef.current?.focus()
  }

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMentionOpen(false)
    }
    if (mentionOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mentionOpen])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMentionOpen(false)
      }
    }
    if (mentionOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mentionOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={minRows}
        className="min-h-[60px] w-full resize-none rounded-lg border border-border-subtle bg-white px-2.5 py-1.5 text-xs outline-none placeholder:text-text-tertiary focus:border-accent-500"
      />

      {mentionOpen && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-lg border border-border-subtle bg-white p-1 shadow-card"
        >
          {filteredUsers.slice(0, 5).map((u: any) => (
            <button
              key={u.id}
              type="button"
              onClick={() => selectUser(u)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-accent-50/60 transition-colors cursor-pointer"
            >
              <AtSign className="h-3 w-3 shrink-0" />
              <span className="truncate">{u.name || u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
