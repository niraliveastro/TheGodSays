import { Sparkles, Moon, Sun } from "lucide-react";

const REMEDY_MAP = {
  nadi_kootam: {
    title: "Health & Genetic Harmony",
    remedies: [
      "Chant Maha Mrityunjaya Mantra together on Mondays",
      "Donate white food items on Mondays",
      "Consult astrologer for Nadi Dosha cancellation check",
    ],
  },
  gana_kootam: {
    title: "Temperament & Emotional Balance",
    remedies: [
      "Practice weekly open communication ritual",
      "Meditate together during full moon days",
      "Avoid impulsive decisions during heated moments",
    ],
  },
  graha_maitri_kootam: {
    title: "Mental Harmony",
    remedies: [
      "Strengthen Jupiter through yellow donations on Thursdays",
      "Read spiritual texts together weekly",
      "Avoid ego-driven arguments",
    ],
  },
  rasi_kootam: {
    title: "Emotional Bonding",
    remedies: [
      "Offer water to Sun daily",
      "Wear soothing pastel shades",
      "Spend dedicated quality time weekly",
    ],
  },
};

export default function MatchRemedies({ result, femaleName, maleName }) {
  if (!result) return null;

  const weakAreas = Object.keys(REMEDY_MAP).filter((key) => {
    const sec = result[key];
    const score = Number(sec?.score || 0);
    const max = Number(sec?.out_of || 0);
    if (!max) return false;
    return (score / max) * 100 < 50;
  });

  if (weakAreas.length === 0) return null;

  return (
    <div className="mt-10 rounded-2xl border border-purple-200 bg-gradient-to-br from-white to-purple-50 p-6 shadow-lg">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-purple-100">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">
          Suggested Remedies & Balance Guidance
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-8 max-w-2xl">
        Remedies are meant to strengthen planetary harmony and encourage conscious effort. 
        These are supportive measures — not destiny overrides.
      </p>

      <div className="space-y-8">

        {weakAreas.map((key) => {
          const data = REMEDY_MAP[key];

          return (
            <div
              key={key}
              className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm"
            >
              <h4 className="text-sm font-semibold text-purple-700 mb-4 uppercase tracking-wide">
                {data.title}
              </h4>

              <div className="grid md:grid-cols-2 gap-6">

                {/* Female */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Moon className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {femaleName || "Female"}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {data.remedies.map((r, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-100"
                      >
                        ✔ {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Male */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {maleName || "Male"}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {data.remedies.map((r, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-100"
                      >
                        ✔ {r}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
