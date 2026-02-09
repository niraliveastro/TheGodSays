const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Free Online Kundli Generator | Birth Chart Calculator",
  description: "Generate your free kundli (birth chart) online. Accurate Vedic astrology birth chart with planetary positions, houses & nakshatra.",
  keywords: [
    "kundli",
    "kundli online",
    "birth chart",
    "horoscope",
    "free kundli",
    "kundli generator",
    "vedic astrology",
    "birth chart calculator",
    "janam kundli"
  ],
  openGraph: {
    title: "Free Online Kundli Generator | Birth Chart Calculator",
    description: "Generate your free kundli (birth chart) online. Accurate Vedic astrology birth chart with planetary positions, houses & nakshatra.",
    url: `${SITE_URL}/kundli/`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Kundli Generator | Birth Chart Calculator",
    description: "Generate your free kundli (birth chart) online. Accurate Vedic astrology birth chart with planetary positions, houses & nakshatra.",
  },
  alternates: {
    canonical: `${SITE_URL}/kundli/`,
  },
};

export default function KundliLayout({ children }) {
  return <>{children}</>;
}
