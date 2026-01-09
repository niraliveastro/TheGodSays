const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Daily Panchang - Today's Panchang with Tithi, Nakshatra, Yoga",
  description: "Get your daily Panchang with accurate Tithi, Nakshatra, Yoga, and Karana calculations. Check sunrise, sunset, moonrise, moonset timings, Rahukalam, Choghadiya, and auspicious timings for today.",
  keywords: [
    "panchang",
    "daily panchang",
    "today panchang",
    "hindu calendar",
    "tithi",
    "nakshatra",
    "yoga",
    "karana",
    "panchangam",
    "hindu panchang"
  ],
  openGraph: {
    title: "Daily Panchang - Today's Panchang | NiraLive Astro",
    description: "Get your daily Panchang with accurate Tithi, Nakshatra, Yoga, and Karana calculations. Check auspicious timings for today.",
    url: `${SITE_URL}/panchang`,
    type: "website",
  },
  twitter: {
    title: "Daily Panchang - Today's Panchang | NiraLive Astro",
    description: "Get your daily Panchang with accurate Tithi, Nakshatra, Yoga, and Karana calculations.",
  },
  alternates: {
    canonical: `${SITE_URL}/panchang`,
  },
};

export default function PanchangLayout({ children }) {
  return <>{children}</>;
}
