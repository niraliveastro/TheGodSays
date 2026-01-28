"use client";

import { Calendar, RefreshCcw } from "lucide-react";
import "../privacy-policy/privacy.css";

export default function RefundPolicy() {
  return (
    <div className="legal-page-container">
      <div className="legal-page-content">
        {/* Header */}
        <header className="legal-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <RefreshCcw style={{ width: "48px", height: "48px", color: "#d4af37" }} />
          </div>
          <h1>Refund & Cancellation Policy</h1>
          <div className="legal-meta">
            <Calendar className="icon" />
            <span>Last Updated: January 28, 2026</span>
          </div>
        </header>

        {/* Content */}
        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Overview</h2>
            <p>
              At NiraLive Astro, we strive to provide high-quality astrological services. This Refund & Cancellation
              Policy outlines the terms under which refunds may be requested and processed for our services.
            </p>
            <p>
              <strong>Please read this policy carefully before making any payments. All sales are generally final unless
              otherwise stated below.</strong>
            </p>
          </section>

          <section className="legal-section legal-disclaimer">
            <h2>Important Notice</h2>
            <p>
              <strong>REFUNDS ARE PROVIDED AT OUR SOLE DISCRETION AND ARE NOT GUARANTEED.</strong> Astrological services
              are interpretive and subjective. Disagreement with predictions, advice, or interpretations does not
              constitute grounds for a refund.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Consultation Services</h2>
            
            <h3>2.1 Cancellation Before Consultation</h3>
            <ul>
              <li><strong>24+ Hours Before:</strong> Full refund minus payment processing fees (typically 2-3%)</li>
              <li><strong>12-24 Hours Before:</strong> 50% refund at our discretion</li>
              <li><strong>Less than 12 Hours:</strong> No refund</li>
              <li><strong>No Show:</strong> No refund</li>
            </ul>

            <h3>2.2 Technical Issues During Consultation</h3>
            <p>Refunds or rescheduling may be provided if:</p>
            <ul>
              <li>Platform technical failure prevents consultation</li>
              <li>Astrologer fails to join the consultation</li>
              <li>Severe connectivity issues (documented and verified)</li>
            </ul>
            <p>
              <strong>Note:</strong> Minor technical glitches, poor user internet connection, or device issues do not
              qualify for refunds.
            </p>

            <h3>2.3 Completed Consultations</h3>
            <p><strong>NO REFUNDS</strong> are provided for completed consultations, regardless of:</p>
            <ul>
              <li>User dissatisfaction with predictions or advice</li>
              <li>Disagreement with astrological interpretations</li>
              <li>Change of mind after consultation</li>
              <li>Perceived accuracy or usefulness of information</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Digital Products & Reports</h2>
            
            <h3>3.1 Kundali & Reports</h3>
            <p>
              Digital products (kundali, birth charts, reports) are <strong>NON-REFUNDABLE</strong> once generated and
              delivered, as they are instantly accessible and cannot be returned.
            </p>

            <h3>3.2 Technical Delivery Issues</h3>
            <p>Refunds or re-delivery may be provided if:</p>
            <ul>
              <li>Report fails to generate due to system error</li>
              <li>Incorrect calculations due to platform bug (verified by our team)</li>
              <li>Failed payment but amount debited (with proof)</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Subscription Services</h2>
            
            <h3>4.1 Cancellation</h3>
            <ul>
              <li>You may cancel your subscription at any time from your account settings</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds for partial months or unused time</li>
              <li>Access continues until the end of paid period</li>
            </ul>

            <h3>4.2 Refunds</h3>
            <p>Subscription refunds are <strong>NOT PROVIDED</strong> except:</p>
            <ul>
              <li>Duplicate charges due to payment processing error (verified)</li>
              <li>Within 7 days of first subscription and no services used</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Wallet & Credits</h2>
            <ul>
              <li><strong>Wallet Balance:</strong> Non-refundable once added</li>
              <li><strong>Promotional Credits:</strong> Non-refundable and non-transferable</li>
              <li><strong>Unused Credits:</strong> Do not expire but cannot be withdrawn</li>
              <li><strong>Bonus Credits:</strong> Subject to specific terms and conditions</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Refund Process</h2>
            
            <h3>6.1 How to Request</h3>
            <p>To request a refund:</p>
            <ol>
              <li>Contact us at <strong>support@niraliveastro.com</strong></li>
              <li>Provide order details (transaction ID, date, amount)</li>
              <li>State reason for refund request</li>
              <li>Include supporting documentation if applicable</li>
            </ol>

            <h3>6.2 Review Timeline</h3>
            <ul>
              <li>We review refund requests within 3-5 business days</li>
              <li>Additional information may be requested</li>
              <li>Decision is final and at our sole discretion</li>
            </ul>

            <h3>6.3 Processing Time</h3>
            <p>Approved refunds are processed as follows:</p>
            <ul>
              <li><strong>Credit/Debit Card:</strong> 5-10 business days</li>
              <li><strong>UPI/Wallet:</strong> 3-7 business days</li>
              <li><strong>Net Banking:</strong> 5-10 business days</li>
            </ul>
            <p>Processing time depends on your bank/payment provider.</p>
          </section>

          <section className="legal-section">
            <h2>7. Payment Disputes</h2>
            
            <h3>7.1 Chargebacks</h3>
            <p>
              If you initiate a chargeback or payment dispute with your bank/card issuer:
            </p>
            <ul>
              <li>Your account will be immediately suspended</li>
              <li>Access to all services will be revoked</li>
              <li>Legal action may be pursued for fraudulent disputes</li>
              <li>You must contact us directly before initiating disputes</li>
            </ul>

            <h3>7.2 Failed Payments</h3>
            <ul>
              <li>If payment fails but amount is debited, contact us with proof</li>
              <li>We will investigate and process refund if verified</li>
              <li>Allow 7-10 business days for resolution</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>8. Non-Refundable Situations</h2>
            <p>Refunds will <strong>NOT</strong> be provided for:</p>
            <ul>
              <li>Change of mind after purchase</li>
              <li>Dissatisfaction with astrological predictions</li>
              <li>Disagreement with interpretations or advice</li>
              <li>User's failure to attend scheduled consultation</li>
              <li>Poor user internet connection or device issues</li>
              <li>Violations of Terms & Conditions</li>
              <li>Account suspension or termination for policy violations</li>
              <li>Expired promotional offers or credits</li>
              <li>Services already consumed or accessed</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>9. Service Quality Guarantee</h2>
            <p>
              While we cannot guarantee specific outcomes or predictions, we ensure:
            </p>
            <ul>
              <li>Verified and experienced astrologers</li>
              <li>Professional conduct and ethics</li>
              <li>Quality customer support</li>
              <li>Secure and reliable platform</li>
            </ul>
            <p>
              If you experience issues with service quality, contact us immediately. We will investigate and take
              appropriate action, which may include replacement services (not refunds).
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Exceptions & Special Cases</h2>
            <p>
              We reserve the right to make exceptions to this policy in extraordinary circumstances at our sole
              discretion, including but not limited to:
            </p>
            <ul>
              <li>Verified platform errors or system failures</li>
              <li>Astrologer misconduct (after investigation)</li>
              <li>Repeated technical issues preventing service</li>
              <li>Compassionate grounds (case-by-case basis)</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>11. Contact Information</h2>
            <p>For refund inquiries or disputes:</p>
            <div className="contact-info">
              <p><strong>Email:</strong> support@niraliveastro.com</p>
              <p><strong>Refund Queries:</strong> refunds@niraliveastro.com</p>
              <p><strong>Phone:</strong> [Your Business Phone]</p>
              <p><strong>Response Time:</strong> Within 24-48 hours</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>12. Policy Changes</h2>
            <p>
              We reserve the right to modify this Refund & Cancellation Policy at any time. Changes will be effective
              immediately upon posting. Continued use of services after changes constitutes acceptance of the updated
              policy.
            </p>
          </section>

          <section className="legal-section legal-disclaimer">
            <h2>Acknowledgment</h2>
            <p>
              <strong>BY MAKING A PURCHASE ON NIRAIVE ASTRO, YOU ACKNOWLEDGE AND AGREE TO THIS REFUND & CANCELLATION
              POLICY. IF YOU DO NOT AGREE, PLEASE DO NOT PROCEED WITH THE PURCHASE.</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
