const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "AI Kundli Prediction | Personalized Astrology & Life Timeline",
  description: "Get AI‑powered kundli predictions for career, marriage & future phases. Chat with AI or consult astrologers anytime.",
  keywords: [
    "kundli prediction",
    "AI astrology",
    "astrology prediction",
    "AI kundli prediction",
    "astrological predictions",
    "daily predictions",
    "weekly predictions",
    "monthly predictions",
    "horoscope predictions",
    "vedic predictions"
  ],
  openGraph: {
    title: "AI Kundli Prediction | Personalized Astrology & Life Timeline",
    description: "Get AI‑powered kundli predictions for career, marriage & future phases. Chat with AI or consult astrologers anytime.",
    url: `${SITE_URL}/kundli-prediction/`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Kundli Prediction | Personalized Astrology & Life Timeline",
    description: "Get AI‑powered kundli predictions for career, marriage & future phases. Chat with AI or consult astrologers anytime.",
  },
  alternates: {
    canonical: `${SITE_URL}/kundli-prediction/`,
  },
};

export default function KundliPredictionLayout({ children }) {
  return <>{children}</>;
}
