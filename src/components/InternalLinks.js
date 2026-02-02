/**
 * Internal Linking Component for SEO
 * Provides contextual internal links to related services
 * Usage: <InternalLinks currentPage="matching" />
 */
import Link from "next/link";

export default function InternalLinks({ currentPage }) {
  const linkGroups = {
    "matching": [
      { href: "/talk-to-astrologer", text: "Talk to an Astrologer", description: "Get expert guidance on your compatibility" },
      { href: "/predictions", text: "Get AI Predictions", description: "Understand your future together" }
    ],
    "predictions": [
      { href: "/talk-to-astrologer", text: "Talk to an Astrologer", description: "Discuss your predictions with experts" },
      { href: "/matching", text: "Check Compatibility", description: "See if you're compatible with your partner" }
    ],
    "cosmic-event-tracker": [
      { href: "/predictions", text: "Get Personalized Predictions", description: "Understand how transits affect you" },
      { href: "/talk-to-astrologer", text: "Consult an Astrologer", description: "Get expert transit analysis" }
    ],
    "numerology": [
      { href: "/talk-to-astrologer", text: "Talk to an Astrologer", description: "Get numerology guidance" },
      { href: "/predictions", text: "Combine with Astrology", description: "See how numbers and planets align" }
    ],
    "transit": [
      { href: "/predictions", text: "Get Predictions", description: "Understand transit impact on your life" },
      { href: "/talk-to-astrologer", text: "Consult an Astrologer", description: "Expert transit guidance" }
    ],
    "panchang": [
      { href: "/talk-to-astrologer", text: "Talk to an Astrologer", description: "Get muhurat guidance" },
      { href: "/predictions", text: "Get Predictions", description: "Understand daily influences" }
    ],
    "talk-to-astrologer": [
      { href: "/matching", text: "Check Compatibility", description: "For marriage guidance" },
      { href: "/predictions", text: "Get AI Predictions", description: "Before your consultation" }
    ],
    "home": [
      { href: "/talk-to-astrologer", text: "Talk to Astrologer", description: "Live consultations" },
      { href: "/matching", text: "Kundli Matching", description: "Marriage compatibility" },
      { href: "/predictions", text: "AI Predictions", description: "Personalized forecasts" }
    ]
  };

  const links = linkGroups[currentPage] || linkGroups["home"];

  if (!links || links.length === 0) return null;

  return (
    <section className="internal-links-section" style={{
      marginTop: "2rem",
      padding: "1.5rem",
      background: "linear-gradient(135deg, rgba(239, 246, 255, 0.5), rgba(219, 234, 254, 0.5))",
      borderRadius: "1rem",
      border: "1px solid rgba(59, 130, 246, 0.2)"
    }}>
      <h3 style={{
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "#1f2937",
        marginBottom: "1rem",
        fontFamily: "'Georgia', 'Times New Roman', serif"
      }}>
        Related Services
      </h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "1rem"
      }}>
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            style={{
              display: "block",
              padding: "1rem",
              background: "white",
              borderRadius: "0.5rem",
              border: "1px solid rgba(212, 175, 55, 0.2)",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(212, 175, 55, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
            }}
          >
            <div style={{
              fontWeight: 600,
              color: "#1f2937",
              marginBottom: "0.5rem",
              fontSize: "1rem"
            }}>
              {link.text}
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280"
            }}>
              {link.description}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
