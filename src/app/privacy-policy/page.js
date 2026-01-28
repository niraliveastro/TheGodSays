"use client";

import { Calendar } from "lucide-react";
import "./privacy.css";

export default function PrivacyPolicy() {
  return (
    <div className="legal-page-container">
      <div className="legal-page-content">
        {/* Header */}
        <header className="legal-header">
          <h1>Privacy Policy</h1>
          <div className="legal-meta">
            <Calendar className="icon" />
            <span>Last Updated: January 28, 2026</span>
          </div>
        </header>

        {/* Content */}
        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              Welcome to NiraLive Astro ("we," "our," or "us"). We are committed to protecting your privacy and
              ensuring the security of your personal information. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our astrology platform and services.
            </p>
            <p>
              By accessing or using NiraLive Astro, you agree to this Privacy Policy. If you do not agree with
              the terms of this Privacy Policy, please do not access the platform.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>
            
            <h3>2.1 Personal Information</h3>
            <p>We collect the following personal information when you use our services:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, date of birth, time of birth, place of birth</li>
              <li><strong>Profile Data:</strong> Profile pictures, biographical information, preferences</li>
              <li><strong>Astrological Data:</strong> Birth charts, kundali details, planetary positions, dasha periods</li>
              <li><strong>Payment Information:</strong> Billing address, payment method details (processed securely through Razorpay)</li>
              <li><strong>Communication Data:</strong> Messages, call recordings, consultation notes</li>
              <li><strong>Identity Verification:</strong> Government-issued ID for astrologer verification</li>
            </ul>

            <h3>2.2 Usage Information</h3>
            <ul>
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage patterns, pages visited, features used</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Location data (with your permission)</li>
              <li>Analytics data (via Google Analytics, Microsoft Clarity)</li>
            </ul>

            <h3>2.3 Sensitive Information</h3>
            <p>
              We may collect sensitive personal information including birth details, financial information for
              astrological calculations, and consultation recordings. We handle this data with the highest level of security.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul>
              <li><strong>Service Delivery:</strong> To generate kundalis, provide predictions, facilitate consultations</li>
              <li><strong>Account Management:</strong> To create and manage your account, authenticate users</li>
              <li><strong>Payment Processing:</strong> To process transactions and maintain billing records</li>
              <li><strong>Communication:</strong> To send service updates, notifications, promotional offers</li>
              <li><strong>Personalization:</strong> To customize your experience and recommendations</li>
              <li><strong>Quality Assurance:</strong> To monitor and improve service quality</li>
              <li><strong>Legal Compliance:</strong> To comply with legal obligations and resolve disputes</li>
              <li><strong>Security:</strong> To prevent fraud, maintain platform security</li>
              <li><strong>Analytics:</strong> To understand user behavior and improve our services</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Information Sharing and Disclosure</h2>
            
            <h3>4.1 With Astrologers</h3>
            <p>
              When you book a consultation, we share necessary information (name, birth details, questions) with
              the assigned astrologer to provide services. Astrologers are bound by confidentiality agreements.
            </p>

            <h3>4.2 Service Providers</h3>
            <p>We share information with third-party service providers:</p>
            <ul>
              <li><strong>Payment Processors:</strong> Razorpay for payment processing</li>
              <li><strong>Cloud Services:</strong> Firebase, Google Cloud for data storage and hosting</li>
              <li><strong>Analytics:</strong> Google Analytics, Microsoft Clarity for usage analysis</li>
              <li><strong>Communication:</strong> Email and SMS service providers</li>
              <li><strong>APIs:</strong> Third-party astrology calculation APIs</li>
            </ul>

            <h3>4.3 Legal Requirements</h3>
            <p>We may disclose information when required by law, court order, or government request, or to protect our rights and safety.</p>

            <h3>4.4 Business Transfers</h3>
            <p>In case of merger, acquisition, or sale of assets, your information may be transferred to the new entity.</p>

            <h3>4.5 With Your Consent</h3>
            <p>We may share information with third parties when you provide explicit consent.</p>
          </section>

          <section className="legal-section">
            <h2>5. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information:</p>
            <ul>
              <li>SSL/TLS encryption for data transmission</li>
              <li>Encrypted storage for sensitive data</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure payment processing through PCI-compliant providers</li>
              <li>Regular backups and disaster recovery procedures</li>
            </ul>
            <p>
              However, no method of transmission over the Internet is 100% secure. While we strive to protect
              your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Your Rights and Choices</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Cookies:</strong> Manage cookie preferences through browser settings</li>
              <li><strong>Object:</strong> Object to processing for certain purposes</li>
            </ul>
            <p>To exercise these rights, contact us at support@niraliveastro.com</p>
          </section>

          <section className="legal-section">
            <h2>7. Cookies and Tracking Technologies</h2>
            <p>We use cookies and similar technologies for:</p>
            <ul>
              <li>Essential functionality (authentication, preferences)</li>
              <li>Performance monitoring and analytics</li>
              <li>Personalization and recommendations</li>
              <li>Marketing and advertising</li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling cookies may affect platform functionality.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Data Retention</h2>
            <p>We retain your information for:</p>
            <ul>
              <li><strong>Active Accounts:</strong> Duration of account activity plus legal retention periods</li>
              <li><strong>Transaction Records:</strong> As required by tax and accounting laws (typically 7 years)</li>
              <li><strong>Consultation Records:</strong> As required for quality assurance and dispute resolution</li>
              <li><strong>Marketing Data:</strong> Until you opt-out or request deletion</li>
            </ul>
            <p>After retention periods, we securely delete or anonymize your information.</p>
          </section>

          <section className="legal-section">
            <h2>9. Children's Privacy</h2>
            <p>
              Our services are not intended for users under 18 years of age. We do not knowingly collect
              personal information from children. If you believe we have collected information from a child,
              please contact us immediately.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence.
              We ensure appropriate safeguards are in place for international transfers, including:
            </p>
            <ul>
              <li>Standard contractual clauses approved by regulatory authorities</li>
              <li>Data processing agreements with service providers</li>
              <li>Compliance with applicable data protection laws</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>11. Third-Party Links</h2>
            <p>
              Our platform may contain links to third-party websites. We are not responsible for the privacy
              practices of these websites. Please review their privacy policies before providing any information.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Changes to Privacy Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant changes via
              email or platform notification. Continued use of our services after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Contact Information</h2>
            <p>For privacy-related questions, concerns, or requests, contact us:</p>
            <div className="contact-info">
              <p><strong>Email:</strong> privacy@niraliveastro.com</p>
              <p><strong>Support:</strong> support@niraliveastro.com</p>
              <p><strong>Address:</strong> [Your Business Address]</p>
              <p><strong>Phone:</strong> [Your Business Phone]</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>14. Compliance</h2>
            <p>We comply with applicable data protection laws including:</p>
            <ul>
              <li>General Data Protection Regulation (GDPR) for EU users</li>
              <li>California Consumer Privacy Act (CCPA) for California residents</li>
              <li>Information Technology Act, 2000 (India)</li>
              <li>Personal Data Protection Act and other applicable regulations</li>
            </ul>
          </section>

          <section className="legal-section legal-disclaimer">
            <h2>Consent</h2>
            <p>
              By using NiraLive Astro, you consent to the collection, use, and sharing of your information as
              described in this Privacy Policy. If you do not consent, please discontinue use of our services.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
