const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Panchang Calendar Today | Hindu Panchang with Astrology",
  description: "Daily Panchang calendar with tithi, nakshatra, muhurat & planetary positions. Accurate & easy to understand.",
  keywords: [
    "hindu panchang",
    "panchang calendar",
    "daily panchang",
    "tithi",
    "nakshatra",
    "muhurat",
    "hindu calendar",
    "panchang today",
    "astrology calendar"
  ],
  openGraph: {
    title: "Panchang Calendar Today | Hindu Panchang with Astrology",
    description: "Daily Panchang calendar with tithi, nakshatra, muhurat & planetary positions. Accurate & easy to understand.",
    url: `${SITE_URL}/panchang/calender`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Panchang Calendar Today | Hindu Panchang with Astrology",
    description: "Daily Panchang calendar with tithi, nakshatra, muhurat & planetary positions. Accurate & easy to understand.",
  },
  alternates: {
    canonical: `${SITE_URL}/panchang/calender`,
  },
};

export default function PanchangCalendarLayout({ children }) {
  return <>{children}</>;
}
