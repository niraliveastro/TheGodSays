const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Cosmic Event Tracker | Planetary Transits & Astrology Events",
  description: "Track upcoming planetary transits, eclipses & cosmic events. Understand personal impact using kundli & AI astrology.",
  keywords: [
    "planetary transits",
    "cosmic events astrology",
    "astrology events",
    "planetary movements",
    "transit analysis",
    "cosmic tracker",
    "astrology calendar",
    "planetary positions"
  ],
  openGraph: {
    title: "Cosmic Event Tracker | Planetary Transits & Astrology Events",
    description: "Track upcoming planetary transits, eclipses & cosmic events. Understand personal impact using kundli & AI astrology.",
    url: `${SITE_URL}/cosmic-event-tracker`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cosmic Event Tracker | Planetary Transits & Astrology Events",
    description: "Track upcoming planetary transits, eclipses & cosmic events. Understand personal impact using kundli & AI astrology.",
  },
  alternates: {
    canonical: `${SITE_URL}/cosmic-event-tracker`,
  },
};

export default function CosmicEventTrackerLayout({ children }) {
  return <>{children}</>;
}
