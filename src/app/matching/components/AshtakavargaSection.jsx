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

  const getStrengthClass = (value) => {
    if (value >= 35) return "strong";
    if (value >= 28) return "average";
    return "weak";
  };

  return (
    <div className={`analysis-card ${tone}`}>
      <h4 className="font-medium mb-6">
        {title} — Sarvashtakavarga
      </h4>

      <table className="sav-table">
        <tbody>
          {[1, 2, 3, 4, 5, 6].map((h) => (
            <tr key={h}>
              <td className="house-label">House {h}</td>
              <td>
                <span
                  className={`sav-pill ${getStrengthClass(
                    houses[h]
                  )}`}
                >
                  {houses[h]}
                </span>
              </td>

              <td className="house-label">House {h + 6}</td>
              <td>
                <span
                  className={`sav-pill ${getStrengthClass(
                    houses[h + 6]
                  )}`}
                >
                  {houses[h + 6]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
