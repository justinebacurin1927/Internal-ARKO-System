import type { Metadata } from 'next'

// Auth screens are app UI, not indexable content — keep them out of search.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
