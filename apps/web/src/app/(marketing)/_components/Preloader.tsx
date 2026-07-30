'use client'

import { useEffect, useRef, useState } from 'react'

let _blobUrl: string | null = null
export function getPreloadedVideoUrl(): string | null {
  return _blobUrl
}

export default function Preloader() {
  const [dismissed, setDismissed] = useState(false)
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading')
  const videoRef = useRef<HTMLVideoElement>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // iOS: must play/pause before seeking works
    const activate = () => {
      video.play()
      video.pause()
    }
    document.addEventListener('touchstart', activate, { once: true })

    // Fetch video blob
    fetch('/services.mp4')
      .then((r) => r.blob())
      .then((blob) => {
        _blobUrl = URL.createObjectURL(blob)
        video.src = _blobUrl
        video.load()
        const poll = () => {
          if (Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 2) {
            video.currentTime = 0
            setPhase('ready')
            return
          }
          setTimeout(poll, 150)
        }
        poll()
      })
      .catch(() => {
        setPhase('ready')
      })

    // Safety: show enter button after 8s no matter what
    setTimeout(() => {
      if (phaseRef.current === 'loading') setPhase('ready')
    }, 8000)

    return () => {
      document.removeEventListener('touchstart', activate)
    }
  }, [])

  if (dismissed) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink">
      {/* hidden video — preload + iOS unlock */}
      <video ref={videoRef} muted playsInline preload="auto" className="hidden" />

      {/* tap target when ready */}
      {phase === 'ready' && (
        <button
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={() => setDismissed(true)}
          aria-label="Enter site"
        />
      )}

      {/* content */}
      <div className="pointer-events-none text-center">
        <div className="display text-acid text-[clamp(4rem,20vw,10rem)] leading-none">
          ARKO
        </div>
        <p className="mono mt-3 text-sm tracking-[0.3em] text-white/30">
          SOFTWARE STUDIO
        </p>

        <div className="mono mt-10 text-xs font-semibold tracking-[0.25em] text-white/50">
          {phase === 'loading' ? '▸ LOADING' : '● TAP TO ENTER'}
        </div>

        {phase === 'loading' && (
          <div className="mx-auto mt-4 h-[2px] w-48 overflow-hidden bg-white/10">
            <div className="h-full w-1/2 animate-pulse bg-acid" />
          </div>
        )}
      </div>
    </div>
  )
}
