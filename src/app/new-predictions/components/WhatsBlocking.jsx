"use client";

import { AlertCircle } from "lucide-react";

export default function WhatsBlocking({
  blockers = [],
  onTalkToAstrologer,
  title = "What’s Blocking You",
}) {
  if (!blockers.length) return null;

  return (
    <>
      <h2 className="section-title">{title}</h2>

      <div className="problems-list">
        {blockers.map((b, i) => (
          <div key={i} className="problem-card">
            <AlertCircle className="problem-icon" />

            <div className="problem-content">
              <strong className="problem-title">{b.area}</strong>
              <p className="problem-reason">{b.reason}</p>
            </div>

            {b.fixable && (
              <button
                className="fix-btn"
                onClick={onTalkToAstrologer}
              >
                Fix faster →
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
