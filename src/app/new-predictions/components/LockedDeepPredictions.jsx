"use client";

import { Lock } from "lucide-react";
import "../high-converting.css";

export default function LockedDeepPredictions({
  title = "Detailed Dasha & Event Timing",
  subtitle = "Antar-Dasha effects, exact event windows, remedies & outcomes",
  lockMessage = "Unlock to access detailed deep predictions",
  ctaText = "Unlock full predictions",
  onUnlock,
}) {
  return (
    <section className="mt-10 rounded-2xl bg-[#fffdf7] border border-[#f3e6c4] shadow-[0_12px_36px_rgba(212,175,55,0.12)]">
      <div className="locked-content">
        {/* Title */}
        <h2 className="section-title">
          {title}
        </h2>

        {/* Subtitle */}
        <p className="section-subtitle mb-4 text-center">
          {subtitle}
        </p>

        {/* Lock info */}
        <div className="locked-text text-center">
          <Lock size={24} className="text-[var(--color-gold)]" />
          {lockMessage}
        </div>

        {/* CTA */}
        <div>
          <button
            onClick={onUnlock}
            className="
            mx-auto mt-4
              btn btn-gold
            "
          >
            {ctaText}
          </button>
        </div>
      </div>
    </section>
  );
}
