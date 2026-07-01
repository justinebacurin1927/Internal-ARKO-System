/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  transpilePackages: [
    '@arko/ui',
    '@arko/db',
    '@arko/finance',
    '@arko/workflows',
    '@arko/tasks',
    '@arko/dashboard',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  devIndicators: false,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
      },
    ]
  },
}
module.exports = nextConfig
