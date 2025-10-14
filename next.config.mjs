/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    // For production, you might want to add your production domain here
    // domains: ['your-production-domain.com'],
  },
  // Enable production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize for production
  swcMinify: true,
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
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]
  },
}

export default nextConfig












































// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     domains: ['localhost'],
//     // For production, you might want to add your production domain here
//     // domains: ['your-production-domain.com'],
//   },
//   // Enable production optimizations
//   compiler: {
//     removeConsole: process.env.NODE_ENV === 'production',
//   },
//   // Optimize for production
//   swcMinify: true,
//   // Security headers
//   async headers() {
//     return [
//       {
//         source: '/(.*)',
//         headers: [
//           {
//             key: 'X-Frame-Options',
//             value: 'DENY',
//           },
//           {
//             key: 'X-Content-Type-Options',
//             value: 'nosniff',
//           },
//         ],
//       },
//     ]
//   },
// }

// export default nextConfig
