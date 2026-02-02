const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Numerology Prediction | AI‑Based Number & Life Path Analysis",
  description: "Discover life path, destiny & numerology cycles using AI + classical numerology. Combine with kundli for better accuracy.",
  keywords: [
    "numerology prediction",
    "numerology",
    "numerology calculator",
    "life path number",
    "destiny number",
    "soul urge number",
    "pythagorean numerology",
    "chaldean numerology",
    "AI numerology",
    "numerology reading"
  ],
  openGraph: {
    title: "Numerology Prediction | AI‑Based Number & Life Path Analysis",
    description: "Discover life path, destiny & numerology cycles using AI + classical numerology. Combine with kundli for better accuracy.",
    url: `${SITE_URL}/numerology`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Numerology Prediction | AI‑Based Number & Life Path Analysis",
    description: "Discover life path, destiny & numerology cycles using AI + classical numerology. Combine with kundli for better accuracy.",
  },
  alternates: {
    canonical: `${SITE_URL}/numerology`,
  },
};

export default function NumerologyLayout({ children }) {
  return <>{children}</>;
}

