import { Inter } from "next/font/google";
import "./globals.css";
import "./globals-responsive.css";

import { Providers } from "./providers";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AstrologerRedirect from "@/components/AstrologerRedirect";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import SEOStructuredData from "@/components/SEOStructuredData";
import EnvironmentBanner from "@/components/EnvironmentBanner";
const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";
const SITE_NAME = "NiraLive Astro - AI-Powered Astrology Platform";
const SITE_DESCRIPTION = "An AI‑powered astrology & vastu platform for kundli matching, predictions, consultations, and cosmic planning. Talk to expert astrologers, get AI kundli analysis, and access advanced astrology tools.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Talk to Astrologer Online | AI Kundli, Matching & Predictions",
    template: `%s | ${SITE_NAME}`,
  },
  description: "AI‑powered astrology platform. Talk to expert astrologers, get kundli matching, predictions, vastu & cosmic insights. India & NRI friendly.",
  keywords: [
    "talk to astrologer",
    "online astrologer",
    "astrologer consultation",
    "kundli matching",
    "kundli matching for marriage",
    "AI kundli matching",
    "kundli prediction",
    "AI astrology",
    "vastu analysis online",
    "chat with astrologer",
    "astrologer for marriage",
    "astrology prediction",
    "planetary transits",
    "cosmic events astrology",
    "numerology prediction",
    "hindu panchang",
    "indian astrologer in usa",
    "indian astrologer in uk",
    "astrologer for nri",
    "online astrologer for nri"
  ],
  authors: [{ name: "NiraLive Astro" }],
  creator: "NiraLive Astro",
  publisher: "NiraLive Astro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NiraLive Astro",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "510x510" },

    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/favicon.png", sizes: "any" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: "@niraliveastro",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when you get them
    google: "fIXrjkSibBeeiNhwWYI5HksQEHygbeeyy7QlcCaydFc",
    // yandex: "your-yandex-verification-code",
    // yahoo: "your-yahoo-verification-code",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// Viewport and themeColor must be exported separately (Next.js 14+ requirement)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#d4af37",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Resource hints for faster external connections */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        {/* Razorpay script removed from head - now loads on-demand in Wallet component */}
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        {/* Cosmic Theme - Falling Stars & Particles */}
        <div className="falling-stars-1"></div>
        <div className="falling-stars-2"></div>
        <div className="falling-stars-3"></div>
        {/* Scattered Stars & Meteoroids */}
        <div className="scattered-stars"></div>
        <div className="meteoroids"></div>
        
        {/* Analytics Scripts */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <MicrosoftClarity CLARITY_PROJECT_ID={process.env.NEXT_PUBLIC_CLARITY_ID} />
        )}
        
        {/* Structured Data for SEO */}
        <SEOStructuredData />
        
        {/* Persistent modal portal root */}
        <div id="modal-root" />
        <Providers>
           {/* ✅ STAGING BANNER (Preview only) */}
           <EnvironmentBanner />
          <AstrologerRedirect />
          <Navigation />
          {children}
          <Footer />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
