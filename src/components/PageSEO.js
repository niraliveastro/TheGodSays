/**
 * Page-Specific SEO Component
 * Adds FAQ and Service/Tool schema for individual pages
 * Usage: <PageSEO pageType="talk-to-astrologer" faqs={faqs} />
 */
export default function PageSEO({ pageType, faqs = [], serviceData = {} }) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";
  const SITE_NAME = "NiraLive Astro";

  // Page-specific service schemas
  const serviceSchemas = {
    "talk-to-astrologer": {
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Astrologer Consultation",
      "name": "Talk to Astrologer Online",
      "description": "Live online consultations with verified astrologers via video or voice call. Get personalized guidance for marriage, career, and life decisions.",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      },
      "areaServed": ["IN", "US", "UK", "CA", "AU", "Worldwide"],
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": `${SITE_URL}/talk-to-astrologer/`,
        "serviceType": "Online",
        "availableLanguage": ["English", "Hindi"]
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock"
      }
    },
    "matching": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Kundli Matching Tool",
      "applicationCategory": "AstrologyTool",
      "description": "Advanced AI-powered kundli matching for marriage compatibility. Analyzes dosha, dasha, and planetary aspects beyond traditional Guna Milan.",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      }
    },
    "predictions": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Kundli Prediction Tool",
      "applicationCategory": "AstrologyTool",
      "description": "AI-powered personalized astrological predictions for career, marriage, and future life phases based on your birth chart.",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      }
    },
    "cosmic-event-tracker": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Cosmic Event Tracker",
      "applicationCategory": "AstrologyTool",
      "description": "Track upcoming planetary transits, eclipses, and cosmic events. Understand personal impact using kundli and AI astrology.",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      }
    },
    "numerology": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Numerology Prediction Calculator",
      "applicationCategory": "AstrologyTool",
      "description": "AI-based numerology analysis combining classical numerology with AI insights. Calculate life path, destiny, and numerology cycles.",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      }
    },
    "transit": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Planetary Transit Tracker",
      "applicationCategory": "AstrologyTool",
      "description": "Track current and upcoming planetary transits. Understand how transits affect your kundli with AI-powered analysis.",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      }
    },
    "panchang": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Hindu Panchang Calendar",
      "applicationCategory": "AstrologyTool",
      "description": "Daily Panchang calendar with tithi, nakshatra, muhurat, and planetary positions. Accurate and easy to understand.",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      }
    },
    "blog": {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Astrology Blog | NiraLive Astro",
      "description": "Expert astrology articles on kundli matching, AI predictions, planetary transits, numerology & vastu. Learn Vedic astrology insights for marriage, career & life guidance.",
      "url": `${SITE_URL}/blog`,
      "publisher": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL,
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_URL}/icon-512x512.png`
        }
      },
      "inLanguage": "en-US"
    }
  };

  const schemas = [];

  // Add service/tool schema if pageType is provided
  if (pageType && serviceSchemas[pageType]) {
    schemas.push(serviceSchemas[pageType]);
  } else if (serviceData && Object.keys(serviceData).length > 0) {
    // Use custom serviceData if provided
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Service",
      ...serviceData
    });
  }

  // Add FAQ schema if FAQs are provided
  if (faqs && Array.isArray(faqs) && faqs.length > 0) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    schemas.push(faqSchema);
  }

  if (schemas.length === 0) return null;

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
