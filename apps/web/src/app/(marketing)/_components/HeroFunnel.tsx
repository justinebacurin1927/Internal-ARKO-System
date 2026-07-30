'use client'

import { useState } from 'react'

export default function HeroFunnel() {
  const [idea, setIdea] = useState('')

  const scrollToContact = () => {
    const contactForm = document.getElementById('contact-form')
    const destination = contactForm ?? document.getElementById('contact')
    destination?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.dispatchEvent(new CustomEvent('arko:funnel', { detail: idea.trim() }))
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('#contact-form textarea[name="message"]')?.focus()
    }, 500)
  }

  return (
    <div className="flex w-full max-w-lg items-stretch border-4 border-ink">
      <input
        type="text"
        placeholder="what are you building?"
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-sm font-medium text-ink outline-none placeholder:text-ink/30"
        onKeyDown={(e) => {
          if (e.key === 'Enter') scrollToContact()
        }}
      />
      <button
        type="button"
        onClick={scrollToContact}
        className="cursor-pointer border-l-4 border-ink bg-ink px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-acid transition-none hover:bg-ink/80"
      >
        Tell us
      </button>
    </div>
  )
}
