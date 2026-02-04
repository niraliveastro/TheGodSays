"use client";

import { Lock, Phone } from "lucide-react";
import "../high-converting.css";

export default function LockedDeepPredictions({
  title = "Detailed Dasha & Event Timing",
  subtitle = "Antar-Dasha effects, exact event windows, remedies & outcomes",
  lockMessage = "Unlock to access detailed deep predictions",
  ctaText = "Talk to an astrologer",
  onUnlock,
}) {
  return (
    <section className="astrologer-cta">
      {/* LEFT CONTENT */}
      <div className="astrologer-cta-content">
        <h3>{title}</h3>

        <p>{subtitle}</p>

        {/* Lock message */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.75rem",
            color: "#92400e",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          <Lock size={18} />
          <span>{lockMessage}</span>
        </div>

        {/* CTA */}
        <button
          className="cta-btn cta-primary mt-4"
          onClick={onUnlock}
        >
          <Phone size={18} />
          {ctaText}
        </button>
      </div>

      {/* RIGHT VISUAL */}
      <div className="astrologer-cta-visual">
        <img
          src="/images/astrologer2.png"
          alt="Astrologer guidance"
          width={400}
          height={500}
        />
      </div>
    </section>
  );
}
