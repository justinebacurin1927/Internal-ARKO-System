'use client'

export default function HeroFunnel() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex w-full max-w-lg items-stretch border-4 border-ink">
      <input
        type="text"
        placeholder="what are you building?"
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
