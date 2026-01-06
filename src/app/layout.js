import { Inter } from "next/font/google";
import "./globals.css";
import "./globals-responsive.css";

import { Providers } from "./providers";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Navigation from "@/components/Navigation";
import AstrologerRedirect from "@/components/AstrologerRedirect";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import SEOStructuredData from "@/components/SEOStructuredData";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rahunow.com";
const SITE_NAME = "NiraLive Astro - Vedic Astrology & Panchang";
const SITE_DESCRIPTION = "Get your daily Panchang, personalized Kundali, numerology readings, and live consultations with expert astrologers. Your complete Vedic astrology platform.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "vedic astrology",
    "panchang",
    "kundali",
    "birth chart",
    "horoscope",
    "numerology",
    "astrologer",
    "online astrology",
    "daily panchang",
    "hindu calendar",
    "kundali matching",
    "astrological predictions",
    "live astrology consultation",
    "online astrologer",
    "jyotish",
    "astrology calculator",
    "hora timings",
    "choghadiya",
    "muhurat",
    "dasha predictions",
    "transit analysis"
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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/favicon.ico", sizes: "any" },
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
    creator: "@rahunow",
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
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
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
          <AstrologerRedirect />
          <Navigation />
          {children}
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
