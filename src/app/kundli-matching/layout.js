const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Kundli Matching for Marriage | AI Matching Beyond Guna Milan",
  description: "Advanced AI kundli matching analyzing dosha, dasha & planetary aspects. Get compatibility report & astrologer guidance.",
  keywords: [
    "kundli matching",
    "kundli matching for marriage",
    "AI kundli matching",
    "kundali matching",
    "horoscope matching",
    "marriage matching",
    "gun milan",
    "ashtakoot matching",
    "compatibility",
    "vedic astrology matching"
  ],
  openGraph: {
    title: "Kundli Matching for Marriage | AI Matching Beyond Guna Milan",
    description: "Advanced AI kundli matching analyzing dosha, dasha & planetary aspects. Get compatibility report & astrologer guidance.",
    url: `${SITE_URL}/kundli-matching/`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kundli Matching for Marriage | AI Matching Beyond Guna Milan",
    description: "Advanced AI kundli matching analyzing dosha, dasha & planetary aspects. Get compatibility report & astrologer guidance.",
  },
  alternates: {
    canonical: `${SITE_URL}/kundli-matching/`,
  },
};

export default function KundliMatchingLayout({ children }) {
  return <>{children}</>;
}
