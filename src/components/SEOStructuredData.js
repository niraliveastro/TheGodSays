/**
 * SEO Structured Data Component
 * Adds JSON-LD structured data for better search engine understanding
 * This is a server component for optimal SEO performance
 */
export default function SEOStructuredData({ type = "website", pageData = {} }) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rahunow.com";
  const SITE_NAME = "NiraLive Astro - Vedic Astrology & Panchang";

  // Base Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": `${SITE_URL}/icon-192x192.png`,
    "description": "Comprehensive Vedic astrology platform offering daily Panchang, Kundali generation, numerology, and live consultations with expert astrologers.",
    "sameAs": [
      // Add social media links when available
      // "https://www.facebook.com/rahunow",
      // "https://twitter.com/rahunow",
      // "https://www.instagram.com/rahunow",
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "availableLanguage": ["English", "Hindi"]
    }
  };

  // Website Schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": SITE_URL,
    "description": "Get your daily Panchang, personalized Kundali, numerology readings, and live consultations with expert astrologers.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  // Service Schema for Astrology Services
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Vedic Astrology Services",
    "provider": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL
    },
    "description": "Comprehensive Vedic astrology services including daily Panchang, Kundali generation, numerology, astrological predictions, and live consultations.",
    "areaServed": "Worldwide",
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": SITE_URL,
      "serviceType": "Online"
    }
  };

  // Breadcrumb Schema (if pageData includes breadcrumbs)
  const breadcrumbSchema = pageData.breadcrumbs ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": pageData.breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": `${SITE_URL}${crumb.url}`
    }))
  } : null;

  // Article Schema (for blog posts/articles if any)
  const articleSchema = pageData.article ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": pageData.article.title,
    "description": pageData.article.description,
    "author": {
      "@type": "Organization",
      "name": SITE_NAME
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/icon-192x192.png`
      }
    },
    "datePublished": pageData.article.publishedDate,
    "dateModified": pageData.article.modifiedDate || pageData.article.publishedDate,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_URL}${pageData.article.url}`
    }
  } : null;

  // FAQPage Schema (if pageData includes FAQs)
  const faqSchema = pageData.faqs && pageData.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": pageData.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  const schemas = [organizationSchema, websiteSchema, serviceSchema];
  
  if (breadcrumbSchema) schemas.push(breadcrumbSchema);
  if (articleSchema) schemas.push(articleSchema);
  if (faqSchema) schemas.push(faqSchema);

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

