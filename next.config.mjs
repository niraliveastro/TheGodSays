/** @type {import('next').NextConfig} */
const nextConfig = {
  // SEO: Use trailing slashes site-wide. Next.js 301-redirects /x to /x/ automatically.
  // This aligns with redirect destinations (e.g. /kundli-matching/) and fixes talk-to-astrologer.
  trailingSlash: true,
  images: {
    // We use our custom image optimization API (/api/image-optimize) for better control
    // Keep unoptimized: true to allow external images, but our custom API handles optimization
    unoptimized: true,
    
    // Configure local patterns for image optimization API route
    localPatterns: [
      {
        pathname: '/api/image-optimize',
        search: 'url=*',
      },
    ],
    
    // Allow Firebase Storage and other image domains
    remotePatterns: [
      { 
        protocol: 'https', 
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      { 
        protocol: 'https', 
        hostname: '**.firebasestorage.googleapis.com',
        pathname: '/**',
      },
      { 
        protocol: 'https', 
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      { 
        protocol: 'https', 
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      { 
        protocol: 'https', 
        hostname: 'i.imgur.com',
        pathname: '/**',
      },
    ],
    
    // Keep domains for backward compatibility
    domains: [
      'localhost',
      'niraliveastro.com',
      'www.niraliveastro.com',
      'rahunow.com',
      'www.rahunow.com',
      'json.freeastrologyapi.com',
      'images.unsplash.com',
      'storage.googleapis.com',
      'firebasestorage.googleapis.com',
    ],
    
    // Image quality settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
    // Increase body size limit for file uploads (50MB)
    serverActions: {
      bodySizeLimit: '50mb',
    },
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
      {
        // CSS files - prevent aggressive caching
        source: '/:path*.css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Next.js CSS chunks
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Static images
        source: '/:path*.{jpg,jpeg,png,gif,webp,svg,ico}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next.js static assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Fonts
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  // SEO URL restructuring - 301 redirects (permanent)
  async redirects() {
    return [
      // 1. CORE MONEY & AUTHORITY PAGES
      {
        source: '/matching',
        destination: '/kundli-matching/',
        permanent: true,
      },
      {
        source: '/new-matching',
        destination: '/kundli-matching/',
        permanent: true,
      },
      {
        source: '/predictions',
        destination: '/kundli-prediction/',
        permanent: true,
      },
      {
        source: '/new-predictions',
        destination: '/kundli-prediction/',
        permanent: true,
      },
      {
        source: '/ai-predictions',
        destination: '/kundli-prediction/ai/',
        permanent: true,
      },
      // talk-to-astrologer: trailingSlash: true handles /talk-to-astrologer → /talk-to-astrologer/ automatically
      
      // 2. COSMIC / TRANSIT AUTHORITY CLUSTER
      {
        source: '/cosmic-event-tracker',
        destination: '/cosmic-events/',
        permanent: true,
      },
      {
        source: '/transit',
        destination: '/planetary-transits/',
        permanent: true,
      },
      {
        source: '/maha-dasas',
        destination: '/dashas/mahadasha/',
        permanent: true,
      },
      {
        source: '/panchang/maha-dasas',
        destination: '/dashas/mahadasha/',
        permanent: true,
      },
      
      // 3. PANCHANG & MUHURAT (CRITICAL - FIX SPELLING)
      {
        source: '/panchang/calender',
        destination: '/panchang/calendar/',
        permanent: true,
      },
      {
        source: '/calendar',
        destination: '/panchang/calendar/',
        permanent: true,
      },
      {
        source: '/panchang/kundali',
        destination: '/panchang/kundli/',
        permanent: true,
      },
      {
        source: '/choghadiya-timings',
        destination: '/panchang/choghadiya/',
        permanent: true,
      },
      {
        source: '/panchang/choghadiya-timings',
        destination: '/panchang/choghadiya/',
        permanent: true,
      },
      {
        source: '/hora-timings',
        destination: '/panchang/hora/',
        permanent: true,
      },
      {
        source: '/panchang/hora-timings',
        destination: '/panchang/hora/',
        permanent: true,
      },
      {
        source: '/tithi-timings',
        destination: '/panchang/tithi/',
        permanent: true,
      },
      
      // 5. KUNDLI STANDARDIZATION
      {
        source: '/kundali',
        destination: '/kundli/',
        permanent: true,
      },
      {
        source: '/personalized',
        destination: '/kundli/personalized/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig