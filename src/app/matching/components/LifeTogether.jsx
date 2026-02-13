import React from "react";
import { PiBag } from "react-icons/pi";
import { FaRegMoneyBillAlt, FaPlaneDeparture } from "react-icons/fa";
import { TbHearts } from "react-icons/tb";
import { GiHealthNormal } from "react-icons/gi";
import { BsHouseDoor } from "react-icons/bs";

/* ICONS */
const icons = {
  career: PiBag,
  wealth: FaRegMoneyBillAlt,
  marriage: TbHearts,
  health: GiHealthNormal,
  property: BsHouseDoor,
  travel: FaPlaneDeparture,
};

/* ---------------- PLANET HELPERS ---------------- */

const getPlanet = (rows = [], name) =>
  rows.find((r) => r.name?.toLowerCase() === name.toLowerCase());

const getStrength = (rows = [], name) =>
  Number(getPlanet(rows, name)?.percent || 100);

const normalizeTo100 = (value) =>
  Math.min(100, Math.max(0, (value / 160) * 100));

/* ---------------- SYNERGY ENGINE ---------------- */

const synergyScore = (fVal, mVal) => {
  const avg = (fVal + mVal) / 2;
  const imbalancePenalty = Math.abs(fVal - mVal) * 0.25;

  let bonus = 0;

  if (fVal > 110 && mVal > 110) bonus += 10;
  if (fVal < 95 && mVal < 95) bonus -= 8;

  return normalizeTo100(avg - imbalancePenalty + bonus);
};

const calculateLifeScores = (female, male) => {
  const f = female?.shadbalaRows || [];
  const m = male?.shadbalaRows || [];

  return {
    career: synergyScore(
      (getStrength(f, "Sun") + getStrength(f, "Saturn")) / 2,
      (getStrength(m, "Sun") + getStrength(m, "Saturn")) / 2
    ),

    wealth: synergyScore(
      (getStrength(f, "Jupiter") + getStrength(f, "Venus")) / 2,
      (getStrength(m, "Jupiter") + getStrength(m, "Venus")) / 2
    ),

    marriage: synergyScore(
      (getStrength(f, "Venus") + getStrength(f, "Moon")) / 2,
      (getStrength(m, "Venus") + getStrength(m, "Moon")) / 2
    ),

    health: synergyScore(
      (getStrength(f, "Sun") + getStrength(f, "Mars")) / 2,
      (getStrength(m, "Sun") + getStrength(m, "Mars")) / 2
    ),

    property: synergyScore(
      getStrength(f, "Mars"),
      getStrength(m, "Mars")
    ),

    travel: synergyScore(
      getStrength(f, "Rahu"),
      getStrength(m, "Rahu")
    ),
  };
};

/* ---------------- AREA-SPECIFIC COPY ENGINE ---------------- */

const getInsightCopy = (area, score) => {
  const strong = {
    career:
      "Your combined Sun–Saturn alignment supports structured ambition. Together, you can build stable professional foundations and long-term leadership growth.",

    wealth:
      "Jupiter and Venus synergy favors disciplined wealth accumulation. Shared financial wisdom enhances long-term prosperity.",

    marriage:
      "Venus–Moon harmony strengthens emotional intimacy. Affection and mutual understanding deepen naturally over time.",

    health:
      "Vitality indicators are strong. You reinforce each other's resilience and support sustainable wellness routines.",

    property:
      "Mars alignment favors property-building and domestic stability. Long-term assets are well-supported.",

    travel:
      "Rahu alignment indicates transformative journeys. Travel together may open meaningful growth experiences.",
  };

  const stable = {
    career:
      "Professional growth remains steady. Alignment in goals and communication strengthens outcomes.",

    wealth:
      "Financial balance is manageable. Conservative planning ensures sustained stability.",

    marriage:
      "Emotional connection remains stable. Minor tensions resolve through open dialogue.",

    health:
      "Overall wellness is balanced. Supporting each other's routines enhances stability.",

    property:
      "Property matters require thoughtful planning. Patience yields better long-term results.",

    travel:
      "Travel experiences are manageable with preparation. Structured planning ensures smoother journeys.",
  };

  const mixed = {
    career:
      "Career direction may fluctuate. Aligning ambitions prevents competitive friction.",

    wealth:
      "Financial variability is possible. Avoid impulsive decisions as a couple.",

    marriage:
      "Emotional sensitivity is heightened. Patience and listening strengthen harmony.",

    health:
      "Energy patterns may differ between you. Balanced routines are essential.",

    property:
      "Domestic decisions may face delays. Avoid rushing long-term commitments.",

    travel:
      "Unexpected changes in plans may arise. Flexibility reduces tension.",
  };

  const challenging = {
    career:
      "Conflicting ambitions may surface. Strategic compromise ensures stability.",

    wealth:
      "Financial strain may test patience. Structured budgeting is recommended.",

    marriage:
      "Emotional friction may arise. Understanding core needs is critical.",

    health:
      "Stress patterns could impact vitality. Mutual discipline strengthens resilience.",

    property:
      "Property matters face resistance. Timing and expert evaluation are important.",

    travel:
      "Travel may bring more strain than ease. Careful consideration is advised.",
  };

  if (score >= 80) return { tone: "strong", text: strong[area] };
  if (score >= 60) return { tone: "stable", text: stable[area] };
  if (score >= 40) return { tone: "mixed", text: mixed[area] };
  return { tone: "challenging", text: challenging[area] };
};

/* ---------------- COMPONENT ---------------- */

export default function LifeTogetherInsights({
  femaleDetails,
  maleDetails,
}) {
  if (!femaleDetails || !maleDetails) return null;

  const scores = calculateLifeScores(
    femaleDetails,
    maleDetails
  );

  return (
    <div className="max-w-7xl mx-auto px-6 mt-16">
      {/* Heading */}
      <h2 className="section-title mx-auto text-center">
        Life Together Outlook
      </h2>

      <p className="subtitle mx-auto text-center max-w-2xl mt-4 text-gray-600">
        A combined projection of how your planetary strengths interact
        across major life dimensions when lived together.
      </p>

      {/* Cards */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
        {Object.entries(scores).map(([key, value]) => {
          const Icon = icons[key];
          const insight = getInsightCopy(key, value);

          return (
            <div
              key={key}
              className="
                group bg-white rounded-[22px] px-7 py-8
                shadow-[0_14px_45px_-32px_rgba(0,0,0,0.35)]
                transition-all duration-300 ease-out
                hover:-translate-y-[2px]
                hover:shadow-[0_18px_55px_-32px_rgba(0,0,0,0.45)]
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon
                    size={16}
                    className="text-[var(--color-gold)]"
                  />
                  <span className="subtitle capitalize text-gray-900">
                    {key}
                  </span>
                </div>

                <span className="text-xl font-serif text-gray-900">
                  {value.toFixed(0)}
                  <span className="text-xs text-gray-400">/100</span>
                </span>
              </div>

              {/* Divider */}
              <div
                className="h-px w-24 mb-4"
                style={{ background: "var(--color-gold)" }}
              />

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {insight.text}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-12 text-center text-xs italic text-gray-400">
        * Scores reflect planetary synergy, balance, and structural strength alignment.
      </p>
    </div>
  );
}
