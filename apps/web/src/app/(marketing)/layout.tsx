import type { Metadata } from 'next'
import SiteHeader from './_components/SiteHeader'
import SmoothScrollProvider from './_components/SmoothScrollProvider'
import Preloader from './_components/Preloader'

const TITLE = 'Arko — We build web, mobile, automation and AI'
const DESCRIPTION =
  'Arko is a small software studio. We design and ship web and mobile products, then wire in the automation and AI that make them run on their own.'

export const metadata: Metadata = {
  metadataBase: new URL('https://arkodevph.vercel.app'),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Arko',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Arko',
  url: 'https://arkodevph.vercel.app',
  description: DESCRIPTION,
  slogan: 'We build web, mobile, automation and AI',
}

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="landing-root">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
      />
      <Preloader />
      <SmoothScrollProvider>
        <SiteHeader />
        <main>{children}</main>
      </SmoothScrollProvider>
    </div>
  )
}
