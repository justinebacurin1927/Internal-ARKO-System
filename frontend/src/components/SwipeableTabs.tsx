import { useState, useRef, useCallback } from 'react'

interface Tab {
  id: string
  label: string
}

interface SwipeableTabsProps {
  tabs: [Tab, Tab]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: [React.ReactNode, React.ReactNode]
  /** Default true — dark tab bar. Set false for light mode. */
  light?: boolean
}

export default function SwipeableTabs({ tabs, activeTab, onTabChange, children, light }: SwipeableTabsProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [sliding, setSliding] = useState(false)
  const [slideOffset, setSlideOffset] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const activeIndex = tabs.findIndex((t) => t.id === activeTab)
  const minSwipe = 50

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setSliding(true)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return
      const current = e.targetTouches[0].clientX
      setTouchEnd(current)

      const diff = current - touchStart
      const clamped =
        activeIndex === 0
          ? Math.max(0, diff)
          : activeIndex === tabs.length - 1
            ? Math.min(0, diff)
            : diff
      setSlideOffset(clamped)
    },
    [touchStart, activeIndex, tabs.length],
  )

  const handleTouchEnd = useCallback(() => {
    setSliding(false)
    setSlideOffset(0)

    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd

    if (Math.abs(distance) > minSwipe) {
      const nextIndex = distance > 0
        ? Math.min(activeIndex + 1, tabs.length - 1)
        : Math.max(activeIndex - 1, 0)

      if (nextIndex !== activeIndex) {
        onTabChange(tabs[nextIndex].id)
      }
    }
  }, [touchStart, touchEnd, activeIndex, onTabChange, tabs])

  return (
    <div className="flex h-full flex-col">
      {/* ── Tab bar ── */}
      <div className="relative shrink-0 px-3 pt-3">
        <div className={`flex gap-1 rounded-xl p-1 ${light ? 'bg-stone-100' : 'bg-zinc-800/50'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? light ? 'text-stone-900' : 'text-white'
                  : light ? 'text-stone-400 hover:text-stone-700' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeTab === tab.id && (
                <span className={`absolute inset-0 rounded-lg shadow-sm ${light ? 'bg-white shadow-stone-200/80' : 'bg-accent-600'}`} />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content with swipe ── */}
      <div
        ref={contentRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-200 ease-out"
          style={{
            transform:
              sliding && slideOffset !== 0
                ? `translateX(calc(-${activeIndex * 100}% + ${slideOffset}px))`
                : `translateX(-${activeIndex * 100}%)`,
          }}
        >
          <div className="h-full w-full shrink-0 overflow-y-auto">
            {children[0]}
          </div>
          <div className="h-full w-full shrink-0 overflow-y-auto">
            {children[1]}
          </div>
        </div>
      </div>
    </div>
  )
}
