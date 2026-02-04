"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";

export default function ChartHighlights({
  strongObservations = [],
  potential = [],
}) {
  if (!strongObservations.length && !potential.length) return null;
  

  return (
    <>
      <h2 className="section-title mt-6">Chart Highlights</h2>

      <div
        className="
          grid
          grid-cols-1
          gap-6
          md:grid-cols-1
          lg:grid-cols-[3fr_2fr]
        "
      >
        {/* LEFT – Strong Observations (60%) */}
        <div className="observations-panel">
          <h4 className="font-medium sub-title flex items-center gap-2">
            <span className="observations-dot" />
            Strong Observations
          </h4>

          <div className="observations-stack">
            {strongObservations.map((text, i) => (
              <div key={i} className="observation-card">
                <div className="observation-left">
                  <span className="observation-index">{i + 1}</span>
                </div>

                <div className="observation-content">
                  <p className="observation-text">{text}</p>
                  <span className="observation-badge">
                    Verified planetary pattern
                  </span>
                </div>

                <div className="observation-icon-wrap">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – Potential in Chart (40%) */}
        <div className="potential-panel">
          <h4 className="font-medium sub-title flex items-center gap-2">
            <span className="potential-dot" />
            Potential in Your Chart
          </h4>

          <div className="potential-stack">
            {potential.map((text, i) => (
              <div key={i} className="potential-card-advanced">
                <div className="potential-left">
                  <span className="potential-index">{i + 1}</span>
                </div>

                <div className="potential-content">
                  <p className="potential-text">{text}</p>
                  <span className="potential-hint">
                    Can activate with correct timing & guidance
                  </span>
                </div>

                <div className="potential-icon-wrap">
                  <AlertCircle size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
