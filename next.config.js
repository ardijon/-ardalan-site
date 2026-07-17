/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    // Strip console.* in production except errors/warnings.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    // Local images under /public are always allowed; remotePatterns is
    // future-proofing for any remote avatars/CDN assets added later.
    remotePatterns: [],
  },
}

module.exports = nextConfig
