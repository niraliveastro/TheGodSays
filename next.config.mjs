/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from ANY URL/site (maximum flexibility)
    // This disables Next.js image optimization but allows any external image
    unoptimized: true,
    
    // Alternative: If you want optimization, use remotePatterns for specific domains
    // Uncomment the remotePatterns below and set unoptimized: false
    // remotePatterns: [
    //   { protocol: 'https', hostname: 'images.unsplash.com' },
    //   { protocol: 'https', hostname: 'i.imgur.com' },
    //   { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    //   // Add more domains as needed
    // ],
    
    // Keep domains for backward compatibility (optional)
    domains: [
      'localhost',
      'rahunow.com',
      'www.rahunow.com',
      'json.freeastrologyapi.com',
      'images.unsplash.com'
    ],
  },
  // Enable production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  // Enable faster routing
  reactStrictMode: true,
  swcMinify: true,
  // Optimize bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  // Security and SEO headers
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
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate',
          },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig