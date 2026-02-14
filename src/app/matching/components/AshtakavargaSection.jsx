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

  const renderTable = (data, title, tone = "female") => (
    <div className={`analysis-card ${tone}`}>
      <h4 className="font-medium mb-4">
        {title} — Sarvashtakavarga
      </h4>

      <table className="planet-table">
        <thead>
          <tr>
            <th>House</th>
            <th>Points</th>
          </tr>
        </thead>

        <tbody>
          {Object.entries(data.SAV_house).map(
            ([house, value]) => (
              <tr key={house}>
                <td>House {house}</td>
                <td>
                  <span
                    className={`sav-pill ${
                      value >= 35
                        ? "strong"
                        : value >= 28
                        ? "average"
                        : "weak"
                    }`}
                  >
                    {value}
                  </span>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>

      {/* <div className="mt-3 text-sm text-gray-600">
        Total SAV:{" "}
        <strong>{data.totals.SAV_total}</strong>
      </div> */}
    </div>
  );

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
