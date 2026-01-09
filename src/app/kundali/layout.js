const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Free Online Kundali (Birth Chart) Generator - Janam Kundali",
  description: "Generate your free Janam Kundali (birth chart) online. Get detailed Vedic astrology birth chart with planetary positions, house divisions, and personalized astrological insights. Accurate calculations based on your date, time, and place of birth.",
  keywords: [
    "kundali",
    "birth chart",
    "janam kundali",
    "horoscope",
    "vedic astrology",
    "birth chart online",
    "free kundali",
    "kundali generator",
    "astrology chart",
    "natal chart",
    "horoscope chart"
  ],
  openGraph: {
    title: "Free Online Kundali (Birth Chart) Generator | NiraLive Astro",
    description: "Generate your free Janam Kundali (birth chart) online. Get detailed Vedic astrology birth chart with planetary positions and personalized insights.",
    url: `${SITE_URL}/kundali`,
    type: "website",
  },
  twitter: {
    title: "Free Online Kundali (Birth Chart) Generator | NiraLive Astro",
    description: "Generate your free Janam Kundali (birth chart) online. Get detailed Vedic astrology birth chart with planetary positions.",
  },
  alternates: {
    canonical: `${SITE_URL}/kundali`,
  },
};

export default function KundaliLayout({ children }) {
  return <>{children}</>;
}

