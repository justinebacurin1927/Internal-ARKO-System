'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const WORK = [
  {
    kind: 'web',
    title: 'Product websites',
    copy: 'Landing pages and marketing sites that load fast and convert.',
    tags: ['Next.js', 'Tailwind', 'Framer'],
    icon: '◇',
    color: '#b8ff2e',
  },
  {
    kind: 'mobile',
    title: 'Cross-platform apps',
    copy: 'One codebase shipped to iOS and Android, store to home screen.',
    tags: ['React Native', 'Expo', 'Gesture'],
    icon: '◎',
    color: '#b8ff2e',
  },
  {
    kind: 'automation',
    title: 'Automation pipelines',
    copy: 'Quiet systems that move data and trigger work while you sleep.',
    tags: ['n8n', 'Cron', 'Webhooks'],
    icon: '⚡',
    color: '#b8ff2e',
  },
  {
    kind: 'ai',
    title: 'AI features',
    copy: 'Chat, retrieval and agents built into products people already use.',
    tags: ['LLMs', 'RAG', 'Agents'],
    icon: '◆',
    color: '#b8ff2e',
  },
]

export default function ScrollWork() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const cornerRefs = useRef<(HTMLDivElement | null)[]>([])

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return

      // Animate each card on scroll
      cardRefs.current.forEach((el, i) => {
        if (!el) return

        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          end: 'top 40%',
          scrub: 0.8,
          onUpdate(self) {
            const p = Math.min(1, self.progress * 1.2)
            el.style.opacity = String(p)
            el.style.transform = `translateY(${(1 - p) * 60}px) scale(${0.92 + p * 0.08})`
          },
        })
      })

      // Decorative corner brackets animate in
      cornerRefs.current.forEach((el) => {
        if (!el) return
        ScrollTrigger.create({
          trigger: el,
          start: 'top 80%',
          end: 'top 40%',
          scrub: 0.5,
          onUpdate(self) {
            el.style.opacity = String(Math.min(1, self.progress * 2))
          },
        })
      })
    },
    { scope: sectionRef },
  )

  return (
    <section id="work" ref={sectionRef} className="relative bg-ink px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        {/* header */}
        <div className="mb-16 md:mb-20">
          <p className="mono text-sm font-semibold tracking-[0.2em] text-acid/50">what we build</p>
          <h2 className="display mt-2 text-[clamp(3rem,12vw,10rem)] leading-none text-acid">
            Work
          </h2>
          <p className="mono mt-4 text-sm text-white/40">The kind of thing we make</p>
        </div>

        {/* cards grid */}
        <div className="grid gap-px overflow-hidden border-4 border-acid bg-acid md:grid-cols-2">
          {WORK.map((item, i) => (
            <div
              key={item.title}
              ref={(el) => { cardRefs.current[i] = el }}
              className="group relative bg-ink p-8 transition-colors duration-500 md:p-14"
              style={{ opacity: 0, transform: 'translateY(60px) scale(0.92)' }}
            >
              {/* corner brackets — decorative */}
              <div
                ref={(el) => { cornerRefs.current[i] = el }}
                className="pointer-events-none absolute right-4 top-4 text-acid/20 transition-all duration-500 group-hover:text-acid/60"
                style={{ opacity: 0 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 4L20 20L4 20" />
                </svg>
              </div>

              {/* kind label */}
              <div className="eyebrow text-acid/60 transition-colors duration-300 group-hover:text-acid">
                {item.kind}
              </div>

              {/* icon + title row */}
              <div className="mt-6 flex items-start gap-4">
                <span className="display mt-1 text-3xl text-acid/20 transition-colors duration-300 group-hover:text-acid/60 md:text-4xl">
                  {item.icon}
                </span>
                <h3 className="display text-3xl text-white transition-colors duration-300 group-hover:text-acid md:text-5xl">
                  {item.title}
                </h3>
              </div>

              {/* description */}
              <p className="mt-6 max-w-sm text-sm font-medium leading-relaxed text-white/50 transition-colors duration-300 group-hover:text-white/70">
                {item.copy}
              </p>

              {/* tech tags */}
              <div className="mono mt-8 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-acid/20 px-3 py-1.5 text-xs font-semibold tracking-wider text-acid/50 transition-all duration-300 group-hover:border-acid/60 group-hover:text-acid"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* hover line — slides in from left */}
              <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-acid transition-all duration-500 group-hover:w-full" />
            </div>
          ))}
        </div>

        {/* bottom CTA */}
        <div className="mono mt-16 flex items-center gap-4 text-sm font-semibold tracking-wider text-white/30">
          <span className="h-[2px] flex-1 bg-white/10" />
          <a href="#contact" className="transition-colors hover:text-acid">
            See what fits your project →
          </a>
          <span className="h-[2px] flex-1 bg-white/10" />
        </div>
      </div>
    </section>
  )
}
