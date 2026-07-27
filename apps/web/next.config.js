const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/*': ['../../node_modules/next/dist/compiled/source-map/**'],
  },
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
  devIndicators: {
    position: 'bottom-right',
  },
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
      },
      { source: '/dashboard/calendar', destination: '/dashboard/events', permanent: true },
    ]
  },
}
module.exports = nextConfig
