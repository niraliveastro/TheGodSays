import { Star, AlertTriangle, Heart, TrendingUp } from "lucide-react";

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
    <div className="card mt-6">
      <div className="results-header">
        <Heart style={{ color: "#d4af37" }} />
        <h3 className="results-title">Match Insights & Potential</h3>
      </div>

      {/* Overall Potential */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={18} />
          <h4 className="font-semibold text-gray-800">
            Overall Relationship Potential
          </h4>
        </div>
        <p className="text-sm text-gray-600">{overallPotential}</p>
      </div>

      {/* Strong Areas */}
      {strongest.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star size={18} />
            <h4 className="font-semibold text-gray-800">
              Strong Alignment Areas
            </h4>
          </div>

          <ul className="space-y-2">
            {strongest.map((k) => (
              <li
                key={k.key}
                className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm"
              >
                <span className="font-medium text-emerald-700">
                  {k.label}
                </span>{" "}
                — {k.score}/{k.max} indicates natural harmony in this area.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas That Need Attention */}
      {weaker.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} />
            <h4 className="font-semibold text-gray-800">
              Areas That May Need Effort
            </h4>
          </div>

          <ul className="space-y-2">
            {weaker.map((k) => (
              <li
                key={k.key}
                className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"
              >
                <span className="font-medium text-amber-700">
                  {k.label}
                </span>{" "}
                — {k.score}/{k.max}. Conscious communication and patience can
                strengthen this area.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
