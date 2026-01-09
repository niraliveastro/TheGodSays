const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Free Numerology Calculator - Complete Numerology Analysis",
  description: "Get your complete numerology analysis using Pythagorean and Chaldean systems. Calculate your Life Path, Destiny, Soul Urge, Dream, and Power numbers. Discover your personality traits, strengths, and life insights through numerology.",
  keywords: [
    "numerology",
    "numerology calculator",
    "life path number",
    "destiny number",
    "soul urge number",
    "pythagorean numerology",
    "chaldean numerology",
    "numerology reading",
    "name numerology",
    "birth number"
  ],
  openGraph: {
    title: "Free Numerology Calculator - Complete Analysis | NiraLive Astro",
    description: "Get your complete numerology analysis using Pythagorean and Chaldean systems. Calculate your Life Path, Destiny, Soul Urge, and more.",
    url: `${SITE_URL}/numerology`,
    type: "website",
  },
  twitter: {
    title: "Free Numerology Calculator - Complete Analysis | NiraLive Astro",
    description: "Get your complete numerology analysis using Pythagorean and Chaldean systems. Calculate your Life Path, Destiny, and more.",
  },
  alternates: {
    canonical: `${SITE_URL}/numerology`,
  },
};

export default function NumerologyLayout({ children }) {
  return <>{children}</>;
}

