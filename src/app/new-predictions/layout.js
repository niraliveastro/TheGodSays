const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Daily Astrological Predictions - Personalized Horoscope Predictions",
  description: "Get personalized daily, weekly, and monthly astrological predictions based on your birth chart. Understand what the planets have in store for you with accurate Vedic astrology predictions for all aspects of life.",
  keywords: [
    "astrology predictions",
    "daily predictions",
    "weekly predictions",
    "monthly predictions",
    "horoscope predictions",
    "astrological forecast",
    "vedic predictions",
    "future predictions",
    "astrology forecast"
  ],
  openGraph: {
    title: "Daily Astrological Predictions - Personalized Forecasts | NiraLive Astro",
    description: "Get personalized daily, weekly, and monthly astrological predictions based on your birth chart with accurate Vedic astrology.",
    url: `${SITE_URL}/predictions`,
    type: "website",
  },
  twitter: {
    title: "Daily Astrological Predictions - Personalized Forecasts | NiraLive Astro",
    description: "Get personalized daily, weekly, and monthly astrological predictions based on your birth chart.",
  },
  alternates: {
    canonical: `${SITE_URL}/predictions`,
  },
};

export default function PredictionsLayout({ children }) {
  return <>{children}</>;
}

