import CountUp from './_components/CountUp'
import RotatingText from './_components/RotatingText'
import ScrollServices from './_components/ScrollServices'
import ScrollProcess from './_components/ScrollProcess'
import ScrollWork from './_components/ScrollWork'
import ContactForm from './_components/ContactForm'
import HeroFunnel from './_components/HeroFunnel'
import ScrollReveal from './_components/ScrollReveal'
import Squares from './_components/Squares'

const HERO_ROLES = ['websites', 'mobile apps', 'automation', 'ai tools']

type Stat = {
  to: number
  suffix?: string
  label: string
  displayText?: string
}

const STATS: Stat[] = [
  { to: 4, suffix: '', label: 'disciplines under one roof' },
  { to: 2, suffix: '', label: 'platforms from one codebase' },
  { to: 0, suffix: '', label: 'your product, our focus', displayText: '' },
  { to: 0, suffix: '', label: 'middlemen between you and the code' },
]


function Hero() {
  return (
    <section id="top" data-bg="light" className="relative overflow-hidden bg-acid text-ink">
      <div className="relative z-10">
        <div className="px-6 pb-16 pt-32 md:px-10 md:pb-24 md:pt-44">
          <p className="eyebrow mb-6 text-ink/70">Arkō — software studio</p>
          <h1 className="display text-[clamp(2.75rem,11vw,9rem)]">
            We build
            <br />
            <span className="mt-2 inline-flex bg-ink px-3 py-1 text-acid">
              <RotatingText texts={HERO_ROLES} />
            </span>
          </h1>
          <div className="mt-10 flex flex-col gap-6">
            <p className="max-w-md text-base font-medium text-ink/80 md:text-lg">
              You bring the idea. We design it, build it across web and mobile, then wire in
              the automation and AI that make it run on its own.
            </p>
            <HeroFunnel />
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="display pointer-events-none absolute -bottom-10 right-0 select-none text-[22vw] leading-none text-ink/10"
      >
        ARKO
      </div>
    </section>
  )
}

function Marquee() {
  const words = 'SITES · APPS · SYSTEMS · TOOLS · CODE · SHIP · '
  return (
    <div className="relative overflow-hidden border-y-4 border-ink bg-ink py-5">
      <div className="absolute inset-0 opacity-70">
        <Squares direction="left" speed={0.5} squareSize={46} />
      </div>
      <div className="marquee-track display relative z-10 text-4xl text-acid md:text-6xl">
        <span className="pr-4">{words.repeat(6)}</span>
        <span className="pr-4">{words.repeat(6)}</span>
      </div>
    </div>
  )
}

function Stats() {
  return (
    <section className="grid grid-cols-2 border-b-4 border-ink bg-ink md:grid-cols-4">
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className={`border-acid/20 p-8 md:p-10 ${i !== 0 ? 'border-l-4' : ''} ${i < 2 ? 'border-b-4 md:border-b-0' : ''}`}
        >
          {s.displayText !== undefined ? (
            <span className="display text-5xl text-acid md:text-6xl">{s.displayText}</span>
          ) : (
            <CountUp to={s.to} suffix={s.suffix} className="display text-5xl text-acid md:text-6xl" />
          )}
          <div className="eyebrow mt-3 text-white/55">{s.label}</div>
        </div>
      ))}
    </section>
  )
}

function Intro() {
  return (
    <section className="bg-acid px-6 py-20 text-ink md:px-10 md:py-28" data-bg="light">
      <ScrollReveal>
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <h2 className="display text-[clamp(3rem,9vw,7rem)]">
            Ship.<span className="text-ink/40">*</span>
          </h2>
          <div className="max-w-xl">
            <p className="eyebrow mb-6 text-ink/60">*We handle the hard parts.</p>
            <p className="text-lg font-medium leading-relaxed md:text-2xl">
              Most good ideas die in the gap between design and done. We live in that gap, so
              your product{' '}
              <span className="bg-ink px-2 text-acid">actually gets built</span> and reaches
              real people, without you managing five contractors to get there.
            </p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}

function Contact() {
  return (
    <section id="contact" className="bg-ink px-6 py-24 md:px-10">
      <ScrollReveal>
      <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:gap-20">
        <div>
          <h2 className="display text-[clamp(2.5rem,9vw,6.5rem)] text-acid">
            Let&apos;s
            <br />
            build
          </h2>
          <p className="mt-6 max-w-sm text-base font-medium text-white/70">
            Tell us what you are trying to make. We will tell you the fastest honest way to
            get it shipped.
          </p>
          <p className="eyebrow mt-10 text-white/40">arkodevph@gmail.com</p>
        </div>
        <ContactForm />
      </div>
      </ScrollReveal>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-white">
      {/* ——— ghost watermark ——— */}
      <div
        aria-hidden
        className="display pointer-events-none absolute -bottom-4 right-0 select-none text-[clamp(12rem,30vw,36rem)] leading-none text-white/[0.02]"
      >
        ARKO
      </div>

      {/* ——— Squares texture ——— */}
      <div className="absolute inset-0 opacity-[0.08]">
        <Squares
          direction="diagonal"
          speed={0.15}
          squareSize={36}
          borderColor="rgba(184,255,46,0.12)"
          hoverFillColor="rgba(184,255,46,0.06)"
        />
      </div>

      {/* ——— thick acid-green top border with badge ——— */}
      <div className="relative z-10 border-t-8 border-acid">
        <span className="mono absolute left-6 top-0 -translate-y-1/2 bg-acid px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink">
          Est. 2025
        </span>
      </div>

      {/* ——— main grid ——— */}
      <div className="relative z-10 grid border-t border-white/10 md:grid-cols-[1.5fr_1.5fr_2fr]">
        {/* col 1 — brand */}
        <div className="border-b border-white/10 p-8 md:border-b-0 md:border-r md:p-10">
          <div className="display text-4xl tracking-tighter text-acid">ARKO</div>
          <p className="mono mt-3 max-w-xs text-sm leading-relaxed text-white/45">
            A software studio that designs, builds and ships web and mobile products — without
            the overhead.
          </p>
          <div className="mono mt-8 space-y-2 text-sm">
            <a
              href="mailto:arkodevph@gmail.com"
              className="inline-flex items-center gap-2 text-white/60 underline underline-offset-4 transition-colors hover:text-acid"
            >
              <span className="text-acid">→</span> arkodevph@gmail.com
            </a>
          </div>
          <div className="mono mt-6 flex gap-5 text-xs text-white/30">
            <a
              href="https://github.com/justrhey"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-acid"
            >
              GitHub ↗
            </a>
            <span className="text-white/15">/</span>
            <a
              href="mailto:arkodevph@gmail.com"
              className="transition-colors hover:text-acid"
            >
              Email
            </a>
          </div>
        </div>

        {/* col 2 — what we do */}
        <div className="border-b border-white/10 p-8 md:border-b-0 md:border-r md:p-10">
          <p className="eyebrow text-acid">What we do</p>
          <ul className="mono mt-6 space-y-3 text-sm">
            {([
              ['Product websites', '#work'],
              ['Cross-platform apps', '#work'],
              ['Automation pipelines', '#work'],
              ['AI features & agents', '#work'],
              ['Design & prototyping', '#work'],
              ['Performance audits', '#work'],
            ] as const).map(([s, href]) => (
              <li key={s}>
                <a
                  href={href}
                  className="group inline-flex items-center gap-2 text-white/50 underline underline-offset-4 transition-colors hover:text-acid"
                >
                  <span className="text-acid/0 transition-colors group-hover:text-acid">▸</span>
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* col 3 — CTA (featured) */}
        <div className="relative flex flex-col items-start p-8 md:p-10">
          <p className="eyebrow text-acid/60">Start building</p>
          <p className="display mt-4 text-[clamp(2rem,5vw,3.5rem)] leading-[0.85] text-white">
            Let&apos;s
            <br />
            make it
            <br />
            <span className="text-acid">real.</span>
          </p>
          <a
            href="#contact"
            className="mono group mt-6 inline-flex items-center gap-3 border-2 border-acid px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-acid transition-all hover:bg-acid hover:text-ink"
          >
            Start a project
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </a>
          <p className="mono mt-6 text-xs text-white/30">
            Or email{' '}
            <a
              href="mailto:arkodevph@gmail.com"
              className="text-white/60 underline underline-offset-4 transition-colors hover:text-acid"
            >
              arkodevph@gmail.com
            </a>
          </p>
        </div>
      </div>

      {/* ——— marquee separator band ——— */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 bg-ink-soft py-4">
        <div className="marquee-track mono text-xs uppercase tracking-[0.2em] text-white/20">
          <span className="pr-8">Sites · Apps · Systems · Tools · Code · </span>
          <span className="pr-8">Sites · Apps · Systems · Tools · Code · </span>
        </div>
      </div>

      {/* ——— bottom stripe ——— */}
      <div className="relative z-10 flex flex-col items-start justify-between gap-3 px-8 py-5 md:flex-row md:items-center md:px-10">
        <p className="mono text-[0.65rem] text-white/25">
          © {new Date().getFullYear()} Arko Studio
        </p>
        <p className="mono text-[0.65rem] text-white/25">
          Built with Next.js · Deployed on Vercel
        </p>
        <p className="mono text-[0.65rem] text-white/25">
          Philippines
        </p>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <main>
      <Hero />
      <Marquee />
      <Stats />
      <Intro />
      <ScrollServices />
      <ScrollWork />
      <ScrollProcess />
      <Contact />
      <Footer />
    </main>
  )
}
