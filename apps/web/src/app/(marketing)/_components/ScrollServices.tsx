'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCallback, useRef } from 'react'
import StarBorder from './StarBorder'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SLIDES: { lead: string; accent: string; resolve?: boolean }[] = [
  { lead: 'Looking for', accent: 'frontend development?' },
  { lead: 'Backend', accent: 'systems?' },
  { lead: 'Cross-platform', accent: 'mobile apps?' },
  { lead: 'Workflows on', accent: 'automation?' },
  { lead: 'Products with', accent: 'AI that ships?' },
  { lead: 'Whatever you need,', accent: 'we build it.', resolve: true },
]

export default function ScrollServices() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const counterRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const hintRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([])

  const paint = useCallback((progress: number) => {
    // ——— TEXT SLIDES (always work, no video dependency) ———
    const total = SLIDES.length
    const active = Math.min(total - 1, Math.floor(progress * total))
    const lastSlideStart = (total - 1) / total

    slideRefs.current.forEach((el, i) => {
      if (!el) return
      const isActive = i === active
      el.style.opacity = isActive ? '1' : '0'
      el.style.transform = isActive
        ? 'translateY(0) scale(1)'
        : `translateY(${i < active ? '-2rem' : '2rem'}) scale(0.97)`
      el.style.filter = isActive ? 'blur(0px)' : 'blur(10px)'
      el.style.pointerEvents = isActive ? 'auto' : 'none'
    })

    if (counterRef.current)
      counterRef.current.textContent = `${String(active + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
    if (progressRef.current) progressRef.current.style.width = `${progress * 100}%`

    dotRefs.current.forEach((dot, i) => {
      if (!dot) return
      dot.style.background = i <= active ? 'var(--color-acid)' : 'rgba(255,255,255,0.2)'
    })

    if (labelRef.current)
      labelRef.current.style.opacity = String(Math.max(0, 1 - progress * 3))
    if (hintRef.current)
      hintRef.current.style.opacity = String(Math.max(0, 1 - progress * total * 2))

    const finalProg = Math.max(0, (progress - lastSlideStart) / (1 - lastSlideStart))

    // ——— VIDEO EFFECTS (best-effort, only if video loaded) ———
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return

    video.style.filter = `brightness(${0.35 + finalProg * 0.3})`

    if (scrimRef.current) {
      const o = 0.35 - progress * 0.15
      scrimRef.current.style.opacity = String(Math.max(0.15, o))
    }
  }, [])

  // Create ScrollTrigger immediately — text always works, video seeking is extra
  useGSAP(
    () => {
      const section = sectionRef.current
      const video = videoRef.current
      if (!section || !video) return

      const refresh = () => ScrollTrigger.refresh()
      video.addEventListener('loadedmetadata', refresh)

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
        onUpdate(self) {
          // Text transitions always
          paint(self.progress)

          // Video seeking is best-effort
          const video = videoRef.current
          if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
          const lastFrame = Math.max(0, video.duration - 1 / 30)
          try { video.currentTime = self.progress * lastFrame } catch {}
        },
      })
      paint(0)

      return () => {
        video.removeEventListener('loadedmetadata', refresh)
        trigger.kill()
      }
    },
    { scope: sectionRef },
  )

  return (
    <section id="services" ref={sectionRef} className="relative" style={{ height: '1200vh' }}>
      <div
        className="sticky top-0 flex h-screen items-center overflow-hidden bg-ink"
        style={{ backgroundImage: 'url(/services-poster.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >

        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster="/services-poster.jpg"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ willChange: 'contents', transform: 'translateZ(0)', filter: 'brightness(0.35)' }}
        >
          <source src="/services.mp4" type="video/mp4" />
        </video>

        <div
          ref={scrimRef}
          className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />

        <div className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/10">
          <div ref={progressRef} className="h-full bg-acid transition-none" style={{ width: '0%' }} />
        </div>

        <div className="absolute bottom-6 right-6 z-30 flex gap-1.5 md:right-10">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              ref={(el) => { dotRefs.current[i] = el }}
              className="h-2 w-2 transition-colors duration-300"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-8 md:px-10">
          <span ref={labelRef} className="eyebrow text-acid">What we build</span>
          <span ref={counterRef} className="eyebrow mono text-white/60">01 / 06</span>
        </div>

        <div className="relative z-10 w-full px-6 md:px-10">
          <div className="relative h-[16rem] max-w-3xl md:h-[20rem]">
            {SLIDES.map((s, i) => (
              <div
                key={s.accent}
                ref={(el) => { slideRefs.current[i] = el }}
                className="absolute inset-0 flex flex-col justify-center transition-all duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
                style={{ opacity: 0 }}
              >
                <h2 className="display text-[clamp(2.5rem,8vw,6.5rem)] text-white">
                  {s.lead}
                  <br />
                  <span className="text-acid">{s.accent}</span>
                </h2>
                {s.resolve && (
                  <div className="mt-8">
                    <StarBorder as="a" href="#contact">
                      Start a project →
                    </StarBorder>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <span
          ref={hintRef}
          className="eyebrow absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-white/40"
        >
          scroll
        </span>
      </div>
    </section>
  )
}
