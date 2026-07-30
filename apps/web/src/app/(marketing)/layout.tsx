import type { Metadata } from 'next'
import SiteHeader from './_components/SiteHeader'
import SmoothScrollProvider from './_components/SmoothScrollProvider'
import Preloader from './_components/Preloader'

export const metadata: Metadata = {
  title: 'Arko — We build web, mobile, automation and AI',
  description:
    'Arko is a small software studio. We design and ship web and mobile products, then wire in the automation and AI that make them run on their own.',
}

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="landing-root">
      <Preloader />
      <SmoothScrollProvider>
        <SiteHeader />
        {children}
      </SmoothScrollProvider>
    </div>
  )
}
