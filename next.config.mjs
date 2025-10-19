/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'https://www.thegodsays.com/', 'json.freeastrologyapi.com'],
    // For production, you might want to add your production domain here
    // domains: ['your-production-domain.com'],
  },
  // Enable production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig