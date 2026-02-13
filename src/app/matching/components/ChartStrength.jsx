import { Sparkles } from "lucide-react";

const MAX_DISPLAY_STRENGTH = 150; 
// 150% Shadbala = full visual meter

const getAverageStrength = (rows = []) => {
  if (!rows.length) return 0;
  return (
    rows.reduce((sum, p) => sum + (Number(p.percent) || 0), 0) /
    rows.length
  );
};

const getStrengthLabel = (avg) => {
  if (avg >= 120) return "Strong";
  if (avg >= 105) return "Balanced";
  return "Needs Support";
};

const scaleToMeter = (value) => {
  return Math.min(100, (value / MAX_DISPLAY_STRENGTH) * 100);
};

export default function ChartStrengthComparison({
  femaleDetails,
  maleDetails,
  femaleName,
  maleName,
}) {
  if (!femaleDetails?.shadbalaRows && !maleDetails?.shadbalaRows)
    return null;

  const femaleAvg = getAverageStrength(
    femaleDetails?.shadbalaRows || []
  );
  const maleAvg = getAverageStrength(
    maleDetails?.shadbalaRows || []
  );

  const femaleScaled = scaleToMeter(femaleAvg);
  const maleScaled = scaleToMeter(maleAvg);

  const femaleTop = [...(femaleDetails?.shadbalaRows || [])]
    .sort((a, b) => (b.percent || 0) - (a.percent || 0))
    .slice(0, 2);

  const maleTop = [...(maleDetails?.shadbalaRows || [])]
    .sort((a, b) => (b.percent || 0) - (a.percent || 0))
    .slice(0, 2);

  /* ---------- Relative Power Difference ---------- */

  const diff = Math.abs(femaleAvg - maleAvg);
  const stronger =
    femaleAvg > maleAvg
      ? femaleName || "Female"
      : maleAvg > femaleAvg
      ? maleName || "Male"
      : "Both charts";

  const relativeInsight =
    diff < 3
      ? "Both charts show nearly equal structural strength. This indicates balanced planetary influence."
      : `${stronger} holds approximately ${diff.toFixed(
          1
        )}% stronger average planetary structure.`;

  return (

    <>
    {/* Header */}
      <div className="flex items-center gap-3 justify-center align-center">
        <h2 className="section-title m-6">
          Chart Strength Intelligence
        </h2>
      </div>
   
    <div className="rounded-3xl bg-white shadow-xl border border-gray-200 p-10 relative">


      

      <div className="grid md:grid-cols-2 gap-12">

        {/* FEMALE PANEL */}
        <div className="space-y-6">
          <div className="">
            <h3 className="text-2xl font-serif text-gray-800 font-medium">
              {femaleName || "Female"}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Planetary structural resilience
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-xl text-gray-800">
                {femaleAvg.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                Average Planetary Strength
              </div>
            </div>

            <div className="text-yellow-600 font-semibold text-sm">
              {getStrengthLabel(femaleAvg)}
            </div>
          </div>

          {/* Properly Scaled Meter */}
          <div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-700"
                style={{ width: `${femaleScaled}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Meter scaled to 150% maximum strength
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6">
            <h6 className="font-medium text-gray-700 mb-3">
              Strongest Influences
            </h6>
            <ul className="space-y-2 text-xs text-gray-600">
              {femaleTop.map((p, i) => (
                <li key={i}>
                  • {p.name} ({p.percent?.toFixed(1)}%)
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* MALE PANEL */}
        <div className="space-y-6">
          <div className="">
            <h3 className="text-2xl font-serif text-gray-800 font-medium">
              {maleName || "Male"}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Planetary structural resilience
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-xl text-gray-800">
                {maleAvg.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                Average Planetary Strength
              </div>
            </div>

            <div className="text-yellow-600 font-semibold text-sm">
              {getStrengthLabel(maleAvg)}
            </div>
          </div>

          <div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-700"
                style={{ width: `${maleScaled}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Meter scaled to 150% maximum strength
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6">
            <h6 className="font-medium text-gray-700 mb-3">
              Strongest Influences
            </h6>
            <ul className="space-y-2 text-xs text-gray-600">
              {maleTop.map((p, i) => (
                <li key={i}>
                  • {p.name} ({p.percent?.toFixed(1)}%)
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Relative Power Comparison */}
      <div className="">
      <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-2xl p-6 ">
        <h4 className="font-medium text-yellow-700 mb-2 text-lg">
          Relative Structural Balance
        </h4>
        <p className="text-sm text-yellow-800 leading-relaxed">
          {relativeInsight}
        </p>
      </div>
      </div>
    </div>
     </>
  );
}
