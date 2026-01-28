"use client";

import { Calendar, Scale } from "lucide-react";
import "../privacy-policy/privacy.css";

export default function TermsAndConditions() {
  return (
    <div className="legal-page-container">
      <div className="legal-page-content">
        {/* Header */}
        <header className="legal-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <Scale style={{ width: "48px", height: "48px", color: "#d4af37" }} />
          </div>
          <h1>Terms & Conditions</h1>
          <div className="legal-meta">
            <Calendar className="icon" />
            <span>Last Updated: January 28, 2026</span>
          </div>
        </header>

        {/* Content */}
        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using NiraLive Astro ("Platform," "Service," "we," "us," or "our"), you ("User," "you,"
              or "your") accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms,
              you must not use our Platform.
            </p>
            <p>
              These terms constitute a legally binding agreement between you and NiraLive Astro. We reserve the right
              to modify these terms at any time without prior notice. Continued use of the Platform after changes
              constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Service Description</h2>
            <p>NiraLive Astro provides:</p>
            <ul>
              <li>Vedic astrology services including kundali generation, predictions, and analysis</li>
              <li>Live and scheduled consultations with registered astrologers</li>
              <li>Numerology readings and calculations</li>
              <li>Daily panchang, muhurat timings, and astrological calendars</li>
              <li>AI-powered astrological insights and predictions</li>
              <li>Kundali matching and compatibility analysis</li>
              <li>Educational content about astrology and related subjects</li>
            </ul>
            <p>
              <strong>We make no guarantees about the accuracy, completeness, or results of astrological services.</strong>
              Astrology is an interpretive art and should not be the sole basis for important life decisions.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. User Eligibility and Account</h2>
            
            <h3>3.1 Age Requirement</h3>
            <p>
              You must be at least 18 years old to use our services. By using the Platform, you represent and warrant
              that you meet this age requirement.
            </p>

            <h3>3.2 Account Registration</h3>
            <p>You agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Not share your account with others or create multiple accounts</li>
            </ul>

            <h3>3.3 Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account at any time, with or without notice, for
              violation of these terms or any reason we deem appropriate, without liability.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Astrologer Services</h2>
            
            <h3>4.1 Astrologer Verification</h3>
            <p>
              While we verify astrologer credentials and experience, we do not guarantee the quality, accuracy, or
              results of their services. Astrologers are independent service providers, not employees of NiraLive Astro.
            </p>

            <h3>4.2 Consultation Terms</h3>
            <ul>
              <li><strong>Availability:</strong> Consultations are subject to astrologer availability</li>
              <li><strong>Duration:</strong> Session lengths are estimates and may vary</li>
              <li><strong>Recording:</strong> Consultations may be recorded for quality assurance</li>
              <li><strong>Professional Conduct:</strong> Users must treat astrologers respectfully</li>
              <li><strong>Scope:</strong> Astrologers provide guidance, not medical, legal, or financial advice</li>
            </ul>

            <h3>4.3 Astrologer Obligations</h3>
            <p>Astrologers must:</p>
            <ul>
              <li>Maintain professional standards and ethical conduct</li>
              <li>Protect user confidentiality</li>
              <li>Not provide medical, legal, or financial advice</li>
              <li>Comply with platform policies and applicable laws</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Payments and Refunds</h2>
            
            <h3>5.1 Pricing</h3>
            <p>
              All prices are displayed in Indian Rupees (INR) unless otherwise stated. Prices are subject to change
              without notice. You agree to pay all charges incurred under your account.
            </p>

            <h3>5.2 Payment Processing</h3>
            <p>
              Payments are processed through Razorpay, a third-party payment gateway. By making a payment, you agree
              to Razorpay's terms and conditions. We do not store your complete payment card information.
            </p>

            <h3>5.3 Refund Policy</h3>
            <p><strong>REFUNDS ARE PROVIDED AT OUR SOLE DISCRETION AND ARE NOT GUARANTEED.</strong></p>
            <ul>
              <li><strong>Consultation Cancellations:</strong> Refunds may be provided if canceled 24+ hours in advance</li>
              <li><strong>Technical Issues:</strong> Refunds considered for platform technical failures only</li>
              <li><strong>No Refunds For:</strong> Change of mind, dissatisfaction with predictions, completed consultations</li>
              <li><strong>Partial Refunds:</strong> May be offered for incomplete consultations at our discretion</li>
              <li><strong>Processing Time:</strong> Approved refunds take 5-10 business days</li>
            </ul>
            <p>
              <strong>You acknowledge that astrological services are interpretive and subjective. Disagreement with
              predictions or advice does not constitute grounds for a refund.</strong>
            </p>

            <h3>5.4 Promotional Credits</h3>
            <p>
              Promotional credits, coupons, and offers are non-transferable, non-refundable, and subject to expiration.
              We reserve the right to modify or cancel promotions at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Disclaimer of Warranties</h2>
            <p><strong>THE PLATFORM AND SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong></p>
            <p>We expressly disclaim all warranties, including but not limited to:</p>
            <ul>
              <li>Implied warranties of merchantability and fitness for a particular purpose</li>
              <li>Accuracy, reliability, or completeness of astrological information</li>
              <li>Uninterrupted or error-free operation of the Platform</li>
              <li>Security of data transmission or storage</li>
              <li>Results, outcomes, or predictions from astrological services</li>
            </ul>
            <p>
              <strong>ASTROLOGY IS NOT A SCIENCE.</strong> Predictions and interpretations are subjective opinions
              and should not be relied upon as factual information or professional advice.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Limitation of Liability</h2>
            <p>
              <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, NIRAIVE ASTRO SHALL NOT BE LIABLE FOR ANY:</strong>
            </p>
            <ul>
              <li><strong>Indirect, incidental, special, consequential, or punitive damages</strong></li>
              <li><strong>Loss of profits, revenue, data, or business opportunities</strong></li>
              <li><strong>Decisions made based on astrological advice or predictions</strong></li>
              <li><strong>Harm resulting from user reliance on astrological information</strong></li>
              <li><strong>Issues arising from third-party services (astrologers, payment processors)</strong></li>
              <li><strong>Platform downtime, errors, or data loss</strong></li>
            </ul>
            <p>
              <strong>OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE 12 MONTHS
              PRECEDING THE CLAIM, OR ₹1,000, WHICHEVER IS LESS.</strong>
            </p>
            <p>
              You acknowledge that astrological services are for entertainment and guidance purposes only. You assume
              full responsibility for decisions made based on astrological advice.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless NiraLive Astro, its officers, directors, employees,
              agents, and affiliates from any claims, damages, losses, liabilities, costs, and expenses (including
              legal fees) arising from:
            </p>
            <ul>
              <li>Your use of the Platform or services</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Decisions made based on astrological services</li>
              <li>Content you submit or transmit through the Platform</li>
              <li>Your interaction with astrologers or other users</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>9. Intellectual Property</h2>
            
            <h3>9.1 Our Rights</h3>
            <p>
              All content, features, and functionality of the Platform, including but not limited to text, graphics,
              logos, software, algorithms, and calculations, are owned by NiraLive Astro and protected by intellectual
              property laws.
            </p>

            <h3>9.2 License</h3>
            <p>
              We grant you a limited, non-exclusive, non-transferable license to access and use the Platform for
              personal, non-commercial purposes. You may not:
            </p>
            <ul>
              <li>Copy, modify, or create derivative works</li>
              <li>Reverse engineer or decompile any part of the Platform</li>
              <li>Use automated tools to access or scrape the Platform</li>
              <li>Resell, redistribute, or commercialize our services</li>
              <li>Remove proprietary notices or labels</li>
            </ul>

            <h3>9.3 User Content</h3>
            <p>
              By submitting content (reviews, testimonials, questions), you grant us a worldwide, royalty-free,
              perpetual license to use, display, and distribute that content for platform operations and marketing.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform for illegal purposes or to violate any laws</li>
              <li>Harass, abuse, or harm others (including astrologers)</li>
              <li>Provide false information or impersonate others</li>
              <li>Attempt to gain unauthorized access to systems or data</li>
              <li>Interfere with Platform operations or security measures</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Engage in fraudulent activities or payment disputes</li>
              <li>Use the Platform to compete with our business</li>
              <li>Spam, solicit, or advertise without permission</li>
            </ul>
            <p>Violation may result in immediate account termination and legal action.</p>
          </section>

          <section className="legal-section">
            <h2>11. Medical and Professional Advice Disclaimer</h2>
            <p><strong>ASTROLOGICAL SERVICES ARE NOT A SUBSTITUTE FOR PROFESSIONAL ADVICE.</strong></p>
            <ul>
              <li><strong>Medical:</strong> Do not use astrological advice for medical diagnosis or treatment. Consult qualified healthcare professionals.</li>
              <li><strong>Legal:</strong> Astrological guidance is not legal advice. Consult licensed attorneys for legal matters.</li>
              <li><strong>Financial:</strong> Predictions are not financial advice. Consult certified financial advisors for investment decisions.</li>
              <li><strong>Mental Health:</strong> Astrology is not therapy. Seek professional help for mental health issues.</li>
            </ul>
            <p>
              <strong>WE STRONGLY DISCOURAGE MAKING CRITICAL LIFE DECISIONS BASED SOLELY ON ASTROLOGICAL PREDICTIONS.</strong>
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Privacy and Data</h2>
            <p>
              Your use of the Platform is subject to our Privacy Policy, which is incorporated into these Terms by
              reference. By using the Platform, you consent to our collection, use, and disclosure of your information
              as described in the Privacy Policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Third-Party Services</h2>
            <p>
              The Platform may integrate third-party services (payment processors, APIs, analytics). We are not
              responsible for third-party services, their availability, accuracy, or practices. Your use of third-party
              services is subject to their terms and policies.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Dispute Resolution</h2>
            
            <h3>14.1 Governing Law</h3>
            <p>
              These Terms are governed by the laws of India without regard to conflict of law principles.
            </p>

            <h3>14.2 Jurisdiction</h3>
            <p>
              Any disputes shall be subject to the exclusive jurisdiction of courts in [Your City/State], India.
              You consent to personal jurisdiction in these courts.
            </p>

            <h3>14.3 Arbitration</h3>
            <p>
              For disputes under ₹50,000, parties agree to binding arbitration under the Arbitration and Conciliation
              Act, 1996. The arbitration shall be conducted in English in [Your City], India.
            </p>

            <h3>14.4 Class Action Waiver</h3>
            <p>
              <strong>YOU WAIVE ANY RIGHT TO PARTICIPATE IN CLASS ACTIONS OR CLASS ARBITRATIONS AGAINST US.</strong>
              All disputes must be brought individually.
            </p>
          </section>

          <section className="legal-section">
            <h2>15. Force Majeure</h2>
            <p>
              We are not liable for failures or delays caused by circumstances beyond our reasonable control,
              including but not limited to natural disasters, pandemics, government actions, terrorism, strikes,
              technical failures, or internet disruptions.
            </p>
          </section>

          <section className="legal-section">
            <h2>16. Severability</h2>
            <p>
              If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall
              continue in full force and effect. Invalid provisions shall be modified to achieve their intended
              economic effect to the extent possible.
            </p>
          </section>

          <section className="legal-section">
            <h2>17. Entire Agreement</h2>
            <p>
              These Terms, together with the Privacy Policy, constitute the entire agreement between you and
              NiraLive Astro regarding the Platform and supersede all prior agreements and understandings.
            </p>
          </section>

          <section className="legal-section">
            <h2>18. Contact Information</h2>
            <p>For questions about these Terms, contact:</p>
            <div className="contact-info">
              <p><strong>Email:</strong> legal@niraliveastro.com</p>
              <p><strong>Support:</strong> support@niraliveastro.com</p>
              <p><strong>Address:</strong> [Your Business Address]</p>
              <p><strong>Phone:</strong> [Your Business Phone]</p>
            </div>
          </section>

          <section className="legal-section legal-disclaimer">
            <h2>Acknowledgment</h2>
            <p>
              <strong>BY USING NIRAIVE ASTRO, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND
              BY THESE TERMS AND CONDITIONS. IF YOU DO NOT AGREE, YOU MUST NOT USE THE PLATFORM.</strong>
            </p>
            <p style={{ marginTop: "1rem" }}>
              <strong>YOU SPECIFICALLY ACKNOWLEDGE AND AGREE THAT:</strong>
            </p>
            <ul>
              <li>Astrological services are for entertainment and guidance, not factual predictions</li>
              <li>We make no guarantees about accuracy or results</li>
              <li>You assume all risks for decisions based on astrological advice</li>
              <li>Refunds are discretionary and not guaranteed</li>
              <li>Our liability is limited as stated in these Terms</li>
              <li>You waive the right to class action claims</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
