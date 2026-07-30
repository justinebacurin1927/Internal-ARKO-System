import { ImageResponse } from 'next/og'

export const alt = 'Arko — We build web, mobile, automation and AI'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <span style={{ fontSize: 72, fontWeight: 900, color: '#b8ff2e', letterSpacing: -2 }}>
            ARKO
          </span>
          <span
            style={{
              fontSize: 24,
              color: '#8a8a80',
              textTransform: 'uppercase',
              letterSpacing: 4,
            }}
          >
            Software Studio
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 88,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: -3,
          }}
        >
          <span>We build web, mobile,</span>
          <span style={{ color: '#b8ff2e' }}>automation & AI</span>
        </div>
        <div style={{ fontSize: 28, color: '#8a8a80' }}>arkodevph.vercel.app</div>
      </div>
    ),
    size,
  )
}
