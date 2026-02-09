import React from "react";
import "./styles/lifescore.css";

import { PiBag } from "react-icons/pi";
import { FaRegMoneyBillAlt, FaPlaneDeparture } from "react-icons/fa";
import { TbHearts } from "react-icons/tb";
import { GiHealthNormal } from "react-icons/gi";
import { BsHouseDoor } from "react-icons/bs";

/* ICONS PER CATEGORY */
const icons = {
  career: PiBag,
  wealth: FaRegMoneyBillAlt,
  marriage: TbHearts,
  health: GiHealthNormal,
  property: BsHouseDoor,
  travel: FaPlaneDeparture,
};

/* DYNAMIC COPY ENGINE */
function getInsightCopy(area, score, dasha) {

  if (score >= 80) {
    return {
      tone: "strong",
      text: {
        career:
          "Momentum is clearly on your side. This is a favorable phase for bold professional decisions and leadership moves.",
        wealth:
          "Financial energies are supportive. Smart investments and disciplined growth can yield long-term rewards.",
        marriage:
          "Emotional harmony is strong. Mutual understanding deepens and commitments feel naturally aligned.",
        health:
          "Vitality is high. This is an excellent phase for physical improvement and sustained wellness routines.",
        property:
          "Planetary support favors property-related matters. Long-term planning can now move into action.",
        travel:
          "Journeys bring positive outcomes. Travel undertaken now can open valuable opportunities.",
      }[area],
    };
  }

  if (score >= 60) {
    return {
      tone: "stable",
      text: {
        career:
          "Steady progress is indicated. Focus on consistency rather than rapid expansion at this stage.",
        wealth:
          "Finances remain balanced. Cautious planning helps maintain stability during this period.",
        marriage:
          "Relationships remain supportive, though small misunderstandings may need mindful communication.",
        health:
          "Overall balance is maintained. Listening to your body will prevent minor issues from escalating.",
        property:
          "A neutral phase. Observation and preparation are better than immediate commitments.",
        travel:
          "Travel is manageable with proper planning. Short, purposeful journeys are favored.",
      }[area],
    };
  }

  if (score >= 40) {
    return {
      tone: "mixed",
      text: {
        career:
          "Uncertainty may arise. Strategic patience and timing matter more than effort alone right now.",
        wealth:
          "Fluctuations are possible. Avoid impulsive financial decisions during this phase.",
        marriage:
          "Emotional sensitivity is heightened. Honest dialogue helps prevent distance.",
        health:
          "Energy levels may vary. Rest and routine adjustments are advisable.",
        property:
          "Delays or reassessments may occur. Wait for clearer planetary signals.",
        travel:
          "Travel plans may face changes. Flexibility is essential.",
      }[area],
    };
  }

  return {
    tone: "challenging",
    text: {
      career:
        "Professional obstacles may feel pronounced. Expert guidance can help realign your direction.",
      wealth:
        "Financial caution is essential. Avoid risks and seek structured advice.",
      marriage:
        "Relationship tensions may surface. Understanding root causes is key to resolution.",
      health:
        "Energy may feel depleted. Preventive care and professional insight are strongly advised.",
      property:
        "Property matters face resistance. Strategic timing is critical before acting.",
      travel:
        "Travel may bring stress rather than ease. Postponement or expert advice is recommended.",
    }[area],
  };
}

export default function LifeAreaInsights({
  scores = {},
  currentDashaChain,
  handleUnlockClick,
}) {

  return (
    <div className="max-w-7xl mx-auto px-6 mt-6">
      {/* Heading */}
      <h2 className="section-title mx-auto text-center">
        Life Area Insights
      </h2>

      <p className="subtitle mx-auto text-center max-w-2xl mt-4 text-gray-600">
        These scores reflect current planetary influences across key areas of your
        life, dynamically interpreted from your chart.
      </p>

      {/* Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
        {Object.entries(scores).map(([key, value]) => {
          const Icon = icons[key];
          const insight = getInsightCopy(key, value, currentDashaChain);


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
                  {value}
                  <span className="text-xs text-gray-400">/100</span>
                </span>
              </div>

              {/* Divider */}
              <div
                className="h-px w-24 mb-4"
                style={{ background: "var(--color-gold)" }}
              />

              {/* Dynamic Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {insight.text}
              </p>

              {/* CTA */}
              <button
                onClick={handleUnlockClick}
                className="
                  mt-3 inline-flex items-center gap-2 text-sm font-medium
                  text-[var(--color-gold)] transition-colors
                "
              >
                Get personalized guidance
                <span className="text-base translate-y-[1px]">→</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-12 text-center text-xs italic text-gray-400">
        * Interpretations update automatically as planetary influences change.
      </p>
    </div>
  );
}
