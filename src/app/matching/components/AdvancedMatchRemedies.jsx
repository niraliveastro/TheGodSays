import { Sparkles, Calendar, ShieldAlert } from "lucide-react";

const PLANET_REMEDIES = {
  Sun: {
    gemstone: "Ruby",
    remedies: [
      "Offer water to Sun every morning",
      "Chant Aditya Hridayam",
      "Donate wheat or copper on Sundays",
    ],
  },
  Moon: {
    gemstone: "Pearl",
    remedies: [
      "Chant 'Om Som Somaya Namah'",
      "Donate white rice on Mondays",
      "Practice emotional journaling weekly",
    ],
  },
  Mars: {
    gemstone: "Red Coral",
    remedies: [
      "Chant Hanuman Chalisa",
      "Donate red lentils on Tuesdays",
      "Avoid impulsive reactions",
    ],
  },
  Mercury: {
    gemstone: "Emerald",
    remedies: [
      "Donate green vegetables on Wednesdays",
      "Practice conscious communication",
    ],
  },
  Jupiter: {
    gemstone: "Yellow Sapphire",
    remedies: [
      "Donate yellow sweets on Thursdays",
      "Seek mentorship and spiritual guidance",
    ],
  },
  Venus: {
    gemstone: "Diamond / Opal",
    remedies: [
      "Maintain relationship rituals",
      "Donate white sweets on Fridays",
    ],
  },
  Saturn: {
    gemstone: "Blue Sapphire (consult before wearing)",
    remedies: [
      "Donate black sesame on Saturdays",
      "Practice patience in long-term decisions",
    ],
  },
};

export default function AdvancedMatchGuidance({
  femaleDetails,
  maleDetails,
  result,
  femaleName,
  maleName,
}) {
  if (!femaleDetails || !maleDetails) return null;

  /* ---------------- PLANET WEAKNESS ---------------- */

  const getWeakPlanets = (rows = []) =>
    rows
      .filter((p) => Number(p.percent) < 100)
      .sort((a, b) => Number(a.percent) - Number(b.percent))
      .slice(0, 2);

  const femaleWeak = getWeakPlanets(femaleDetails?.shadbalaRows);
  const maleWeak = getWeakPlanets(maleDetails?.shadbalaRows);

  /* ---------------- MANGAL DOSHA ---------------- */

  const isManglik = (placements = []) => {
    const mars = placements.find(
      (p) => p.name?.toLowerCase() === "mars"
    );

    if (!mars?.house) return false;

    const manglikHouses = [1, 4, 7, 8, 12];
    return manglikHouses.includes(Number(mars.house));
  };

  const femaleManglik = isManglik(femaleDetails?.placements);
  const maleManglik = isManglik(maleDetails?.placements);

  /* ---------------- NADI DOSHA ---------------- */

  const hasNadiDosha = () => {
    const nadi = result?.nadi_kootam;
    if (!nadi) return false;
    return Number(nadi.score) === 0;
  };

  const nadiDosha = hasNadiDosha();

  /* ---------------- MARRIAGE TIMING ---------------- */

  const getMarriageTiming = (details) => {
    if (!details?.mahaDasas)
      return "Marriage timing requires deeper dasha review.";

    const current = details.currentDasha || "";
    const maha = details.mahaDasas?.mahadasha_list || [];

    const favorablePlanets = ["Venus", "Jupiter"];

    if (favorablePlanets.some((p) => current.includes(p))) {
      return "Current dasha period is supportive for marriage.";
    }

    const nextFavorable = maha.find((m) =>
      favorablePlanets.includes(m.name || m.planet)
    );

    if (nextFavorable) {
      return `Favorable marriage phase during ${
        nextFavorable.name || nextFavorable.planet
      } Maha Dasha.`;
    }

    return "Marriage requires careful muhurta selection.";
  };

  /* ---------------- PERSONALIZED MESSAGE ---------------- */

  const score = Number(result?.total_score || 0);

  const personalizedMessage =
    score >= 28
      ? "This match shows strong structural compatibility. Focus on timing and mutual evolution."
      : score >= 20
      ? "This relationship can succeed with conscious effort and emotional maturity."
      : "This match requires guidance, patience, and spiritual grounding to sustain harmony.";

  /* ====================================================== */

  return (
    <div className="mt-12 rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-amber-50 p-8 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-indigo-100">
          <Sparkles className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="results-title">
          Advanced Compatibility Guidance
        </h3>
      </div>

      {/* Personalized Insight */}
      <div className="mb-10">
        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
          {personalizedMessage}
        </p>
      </div>

      {/* Weak Planets Section */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {[{ name: femaleName, planets: femaleWeak },
          { name: maleName, planets: maleWeak }].map((person, i) => (
          <div key={i}>
            <h4 className="font-medium text-gray-700 mb-4">
              Strengthen Planets for {person.name || "Partner"}
            </h4>

            <div className="space-y-4">
              {person.planets.length === 0 && (
                <div className="text-xs text-gray-500">
                  No significantly weak planets detected.
                </div>
              )}

              {person.planets.map((p) => {
                const data = PLANET_REMEDIES[p.name];
                if (!data) return null;

                return (
                  <div
                    key={p.name}
                    className="p-4 rounded-xl border border-indigo-200 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-indigo-700 text-sm">
                        {p.name}
                      </span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                        {data.gemstone}
                      </span>
                    </div>

                    <ul className="text-xs text-gray-600 space-y-1">
                      {data.remedies.map((r, idx) => (
                        <li key={idx}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dosha Section */}
      {(femaleManglik || maleManglik || nadiDosha) && (
        <div className="mb-12 space-y-6">

          {(femaleManglik || maleManglik) && (
            <div className="p-6 rounded-xl border border-rose-200 bg-rose-50">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h4 className="font-medium text-rose-700">
                  Manglik Influence Detected
                </h4>
              </div>
              <p className="text-xs text-rose-700">
                Mars is placed in a sensitive house in{" "}
                {femaleManglik && maleManglik
                  ? "both charts"
                  : femaleManglik
                  ? `${femaleName}'s chart`
                  : `${maleName}'s chart`}
                . Detailed cancellation analysis is recommended.
              </p>
            </div>
          )}

          {nadiDosha && (
            <div className="p-6 rounded-xl border border-amber-200 bg-amber-50">
              <h4 className="font-medium text-amber-700 mb-2">
                Nadi Dosha Observed
              </h4>
              <p className="text-xs text-amber-700">
                Nadi compatibility scored zero. Traditional health and genetic
                considerations apply. Full chart cancellation rules must be checked.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Marriage Timing */}
      <div className="p-6 rounded-xl border border-indigo-200 bg-indigo-100">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-indigo-700 mb-2" />
          <h4 className="font-medium text-indigo-800">
            Marriage Timing Outlook
          </h4>
        </div>

        <div className="space-y-2 text-xs text-indigo-800">
          <div>
            <strong>{femaleName}:</strong>{" "}
            {getMarriageTiming(femaleDetails)}
          </div>
          <div>
            <strong>{maleName}:</strong>{" "}
            {getMarriageTiming(maleDetails)}
          </div>
        </div>
      </div>
    </div>
  );
}
