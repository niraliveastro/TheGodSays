const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Kundali Matching - Free Online Horoscope Matching for Marriage",
  description: "Check compatibility with free online Kundali matching (Ashtakoot matching). Get detailed compatibility analysis for marriage based on Vedic astrology. Calculate Guna Milan score and understand your relationship compatibility.",
  keywords: [
    "kundali matching",
    "horoscope matching",
    "marriage matching",
    "gun milan",
    "ashtakoot matching",
    "compatibility",
    "vedic astrology matching",
    "marriage compatibility",
    "kundli matching",
    "astrology matching"
  ],
  openGraph: {
    title: "Kundali Matching - Free Online Horoscope Matching | NiraLive Astro",
    description: "Check compatibility with free online Kundali matching. Get detailed compatibility analysis for marriage based on Vedic astrology.",
    url: `${SITE_URL}/matching`,
    type: "website",
  },
  twitter: {
    title: "Kundali Matching - Free Online Horoscope Matching | NiraLive Astro",
    description: "Check compatibility with free online Kundali matching. Get detailed compatibility analysis for marriage.",
  },
  alternates: {
    canonical: `${SITE_URL}/matching`,
  },
};

export default function MatchingLayout({ children }) {
  return <>{children}</>;
}

