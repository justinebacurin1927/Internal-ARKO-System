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
}
module.exports = nextConfig
