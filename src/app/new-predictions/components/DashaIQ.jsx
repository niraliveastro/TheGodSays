"use client";

import { Moon } from "lucide-react";

export default function DashaIQ({ dashaIQ, onTalkToAstrologer }) {
  if (!dashaIQ) return null;

  const { mahaLord, iq, reasoning = [] } = dashaIQ;

  return (
    <>
      <h2 className="section-title mt-6">Dasha IQ</h2>

      <div className="dasha-iq-panel">
        <div className="dasha-iq-accent" />

        {/* HEADER */}
        <div className="dasha-iq-header">
          <div className="dasha-iq-planet">
            <Moon size={20} />
          </div>

          <div>
            <h3 className="dasha-iq-title">{mahaLord} Maha Dasha</h3>
            <p className="dasha-iq-subtitle">
              Decision intelligence for this period
            </p>
          </div>

          <div className="dasha-iq-score">
            <span className="iq-value">{iq}</span>
            <span className="iq-label">IQ</span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="dasha-iq-grid">
          {/* LEFT – Reasons */}
          <div className="dasha-iq-card">
            <h4>Why this score</h4>
            <ul className="dasha-iq-points">
              {reasoning.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>

          {/* RIGHT – Meter */}
          <div className="dasha-iq-card highlight">
            <h4>Decision Readiness</h4>

            <div className="dasha-iq-meter">
              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{ width: `${iq}%` }}
                />
              </div>
              <span className="meter-label">{iq}% Supportive</span>
            </div>

            <p className="dasha-iq-note">
              Best used for{" "}
              <strong>
                {iq >= 70
                  ? "career moves, commitments, investments"
                  : iq >= 55
                    ? "planning, preparation, cautious decisions"
                    : "reflection and correction"}
              </strong>
            </p>

            <button
              className="btn btn-gold"
              onClick={onTalkToAstrologer}
            >
              Decode my Dasha →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
