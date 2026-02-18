"use client";

import React, { useMemo } from "react";
import { Orbit } from "lucide-react";
import { computeAshtakavarga } from "@/lib/ashtakavarga";

/**
 * AshtakavargaSection
 *
 * Reusable UI component that computes + displays
 * Sarvashtakavarga (SAV) house scores for two charts.
 *
 * Props:
 * - femaleDetails (object)
 * - maleDetails (object)
 * - femaleName (string)
 * - maleName (string)
 */

export default function AshtakavargaSection({
  femaleDetails,
  maleDetails,
  femaleName = "Female",
  maleName = "Male",
}) {
  /* ---------------------------------------------------------- */
  /* Compute Ashtakavarga */
  /* ---------------------------------------------------------- */

  const femaleAshtakavarga = useMemo(() => {
    try {
      if (!femaleDetails?.rawPlanetsExtended) return null;
      return computeAshtakavarga(
        femaleDetails.rawPlanetsExtended
      );
    } catch (err) {
      console.warn("Female Ashtakavarga error:", err);
      return null;
    }
  }, [femaleDetails]);

  const maleAshtakavarga = useMemo(() => {
    try {
      if (!maleDetails?.rawPlanetsExtended) return null;
      return computeAshtakavarga(
        maleDetails.rawPlanetsExtended
      );
    } catch (err) {
      console.warn("Male Ashtakavarga error:", err);
      return null;
    }
  }, [maleDetails]);

  if (!femaleAshtakavarga && !maleAshtakavarga) return null;

  /* ---------------------------------------------------------- */
  /* Helper Renderer */
  /* ---------------------------------------------------------- */

const renderTable = (data, title, tone = "female") => {
  const houses = data.SAV_house;

  const HOUSE_MEANINGS = {
    1: "Self, Health, Personality",
    2: "Wealth, Family, Speech",
    3: "Courage, Effort, Siblings",
    4: "Home, Comfort, Mother",
    5: "Creativity, Romance, Children",
    6: "Health, Enemies, Service",
    7: "Marriage, Partnerships",
    8: "Transformation, Longevity",
    9: "Luck, Dharma, Higher Learning",
    10: "Career, Status, Authority",
    11: "Gains, Friends, Aspirations",
    12: "Losses, Spirituality, Foreign",
  };

  const getStrengthMeta = (value) => {
    if (value >= 35)
      return { label: "Strong", color: "#16a34a" };
    if (value >= 28)
      return { label: "Moderate", color: "#d97706" };
    return { label: "Weak", color: "#dc2626" };
  };

  return (
    <div className={`analysis-card ${tone}`}>
      <h4 className="font-medium mb-6">
        {title} — Sarvashtakavarga
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(houses).map(([house, value]) => {
          const v = Number(value);
          const meta = getStrengthMeta(v);

          const percentage = Math.min((v / 40) * 100, 100);

          return (
            <div
              key={house}
              className="rounded-xl border p-4 transition-all duration-300"
              style={{
                borderColor: `${meta.color}33`,
                background: `${meta.color}10`,
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  House {house}
                </div>

                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: meta.color,
                  }}
                >
                  {v}
                </div>
              </div>

              {/* Meaning */}
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginBottom: "0.75rem",
                }}
              >
                {HOUSE_MEANINGS[house]}
              </div>

              {/* Animated Strength Bar */}
              <div
                style={{
                  height: "6px",
                  background: "#e5e7eb",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percentage}%`,
                    background: meta.color,
                    borderRadius: "999px",
                    transition: "width 0.9s ease-in-out",
                  }}
                />
              </div>

              {/* Strength Label */}
              <div
                style={{
                  fontSize: "0.7rem",
                  marginTop: "0.4rem",
                  color: meta.color,
                  fontWeight: 500,
                }}
              >
                {meta.label} Support
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



  /* ---------------------------------------------------------- */
  /* Render */
  /* ---------------------------------------------------------- */

  return (
    <div className="card mt-8">
      <div className="results-header">
        <Orbit style={{ color: "#6366f1" }} />
        <h3 className="results-title">
          Ashtakavarga Strength Analysis
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {femaleAshtakavarga &&
          renderTable(
            femaleAshtakavarga,
            femaleName,
            "female"
          )}

        {maleAshtakavarga &&
          renderTable(
            maleAshtakavarga,
            maleName,
            "male"
          )}
      </div>
    </div>
  );
}
