const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Planetary Transit Tracker | Current & Upcoming Transits",
  description: "Track current planetary transits and upcoming sign changes. Understand how transits affect your kundli with AI-powered analysis.",
  keywords: [
    "planetary transits",
    "transit analysis",
    "planetary movements",
    "current transits",
    "upcoming transits",
    "astrology transits",
    "planetary positions",
    "transit tracker"
  ],
  openGraph: {
    title: "Planetary Transit Tracker | Current & Upcoming Transits",
    description: "Track current planetary transits and upcoming sign changes. Understand how transits affect your kundli with AI-powered analysis.",
    url: `${SITE_URL}/transit`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planetary Transit Tracker | Current & Upcoming Transits",
    description: "Track current planetary transits and upcoming sign changes. Understand how transits affect your kundli with AI-powered analysis.",
  },
  alternates: {
    canonical: `${SITE_URL}/transit`,
  },
};

export default function TransitLayout({ children }) {
  return <>{children}</>;
}
