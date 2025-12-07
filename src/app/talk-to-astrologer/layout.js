const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rahunow.com";

export const metadata = {
  title: "Talk to Astrologer - Live Online Astrology Consultation",
  description: "Connect with expert astrologers for live online consultations. Get personalized astrology advice, answer your questions, and receive guidance through video or voice calls. Book your session with verified astrologers now.",
  keywords: [
    "online astrologer",
    "astrologer consultation",
    "live astrology",
    "talk to astrologer",
    "astrology consultation",
    "online astrology reading",
    "video call astrologer",
    "phone astrology",
    "astrologer chat",
    "vedic astrologer"
  ],
  openGraph: {
    title: "Talk to Astrologer - Live Online Consultation | RahuNow",
    description: "Connect with expert astrologers for live online consultations. Get personalized astrology advice through video or voice calls.",
    url: `${SITE_URL}/talk-to-astrologer`,
    type: "website",
  },
  twitter: {
    title: "Talk to Astrologer - Live Online Consultation | RahuNow",
    description: "Connect with expert astrologers for live online consultations. Get personalized astrology advice.",
  },
  alternates: {
    canonical: `${SITE_URL}/talk-to-astrologer`,
  },
};

export default function TalkToAstrologerLayout({ children }) {
  return <>{children}</>;
}

