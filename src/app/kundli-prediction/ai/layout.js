const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "AI Predictions - High-Converting Astrological Insights | NiraLive Astro",
  description: "Get personalized AI-powered astrological predictions with life area scores, 30-day snapshots, timeline forecasts, and family compatibility insights. Unlock your cosmic clarity.",
  keywords: [
    "AI predictions",
    "astrology predictions",
    "life area scores",
    "30 day predictions",
    "family compatibility",
    "astrological insights",
    "vedic predictions",
    "personalized astrology"
  ],
  openGraph: {
    title: "AI Predictions - High-Converting Astrological Insights | NiraLive Astro",
    description: "Get personalized AI-powered astrological predictions with life area scores, timeline forecasts, and family compatibility insights.",
    url: `${SITE_URL}/kundli-prediction/ai/`,
    type: "website",
  },
  twitter: {
    title: "AI Predictions - High-Converting Astrological Insights | NiraLive Astro",
    description: "Get personalized AI-powered astrological predictions with life area scores and timeline forecasts.",
  },
  alternates: {
    canonical: `${SITE_URL}/kundli-prediction/ai/`,
  },
};

export default function AIPredictionsLayout({ children }) {
  return <>{children}</>;
}
