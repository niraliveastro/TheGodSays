const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

export const metadata = {
  title: "Talk to Astrologer Online | Chat, Call & WhatsApp Consultation",
  description: "Talk to verified astrologers online for marriage, career & life guidance. AI‑assisted kundli analysis. India & NRI consultations.",
  keywords: [
    "talk to astrologer",
    "online astrologer",
    "astrologer consultation",
    "chat with astrologer",
    "astrologer for marriage",
    "astrologer call",
    "video call astrologer",
    "phone astrology",
    "astrologer chat",
    "vedic astrologer"
  ],
  openGraph: {
    title: "Talk to Astrologer Online | Chat, Call & WhatsApp Consultation",
    description: "Talk to verified astrologers online for marriage, career & life guidance. AI‑assisted kundli analysis. India & NRI consultations.",
    url: `${SITE_URL}/talk-to-astrologer`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Talk to Astrologer Online | Chat, Call & WhatsApp Consultation",
    description: "Talk to verified astrologers online for marriage, career & life guidance. AI‑assisted kundli analysis.",
  },
  alternates: {
    canonical: `${SITE_URL}/talk-to-astrologer`,
  },
};

export default function TalkToAstrologerLayout({ children }) {
  return <>{children}</>;
}

