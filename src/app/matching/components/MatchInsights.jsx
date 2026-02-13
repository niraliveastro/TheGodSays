import { Star, AlertTriangle, Heart, TrendingUp } from "lucide-react";
import "../matching_styles.css";

const KOOT_LABELS = {
  varna_kootam: "Spiritual Alignment",
  vasya_kootam: "Mutual Attraction",
  tara_kootam: "Health & Fortune",
  yoni_kootam: "Physical Compatibility",
  graha_maitri_kootam: "Mental Harmony",
  gana_kootam: "Temperament Match",
  rasi_kootam: "Emotional Bond",
  nadi_kootam: "Health & Genetics",
};

export default function MatchInsights({ result }) {
  if (!result) return null;

  const total = Number(result.total_score || 0);
  const outOf = Number(result.out_of || 36);
  const percent = (total / outOf) * 100;

  const kootEntries = Object.keys(KOOT_LABELS).map((key) => {
    const sec = result[key];
    const score = Number(sec?.score || 0);
    const max = Number(sec?.out_of || 0);
    const pct = max ? (score / max) * 100 : 0;

    return {
      key,
      label: KOOT_LABELS[key],
      score,
      max,
      pct,
    };
  });

  const strongest = kootEntries
    .filter((k) => k.pct >= 75)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2);

  const weaker = kootEntries
    .filter((k) => k.pct < 40)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 2);

  const overallPotential =
    percent >= 75
      ? "Strong long-term compatibility with natural emotional and mental alignment."
      : percent >= 55
        ? "Good foundation with some areas requiring awareness and communication."
        : "This match may need conscious effort, maturity, and guidance to thrive.";

  return (
    <>
      <h2 className="section-title mt-6">Match Insights</h2>

      <div className=" rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-6 shadow-lg">
        {/* Header */}
        {/* Overall Potential */}
        <div className="mb-8">
          <div className="flex justify-center items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-gray-600 mb-2" />
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex justify-center align-center">
              Overall Relationship Potential
            </h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed flex justify-center align-center">
            {overallPotential}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Strong Areas */}
          {strongest.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-emerald-600" />
                <h4 className="font-medium sub-title flex items-center gap-2">
                  <span className="observations-dot" />
                  Strong Observations
                </h4>
              </div>

              <div className="space-y-3">
                {strongest.map((k) => (
                  <div
                    key={k.key}
                    className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-emerald-700 text-sm">
                        {k.label}
                      </span>
                      <span className="text-xs font-semibold bg-emerald-200 text-emerald-800 px-2 py-1 rounded-full">
                        {k.score}/{k.max}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Indicates natural harmony and ease in this area of life.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaker Areas */}
          {weaker.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-medium sub-title flex items-center gap-2">
                  <span className="potential-dot" />
                  Areas That Need Awareness
                </h4>
              </div>

              <div className="space-y-3">
                {weaker.map((k) => (
                  <div
                    key={k.key}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-amber-700 text-sm">
                        {k.label}
                      </span>
                      <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                        {k.score}/{k.max}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Conscious communication and emotional maturity can
                      strengthen this area.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
