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

export default function LifeAreaInsights({ scores, handleUnlockClick }) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
      {/* Heading */}
      <h2 className="section-title mx-auto text-center">
        Life Area Insights
      </h2>

      <p className="subtitle mx-auto text-center max-w-2xl mt-4 text-gray-600">
        These scores reflect current planetary influences across key areas of your
        life, derived from your celestial alignment.
      </p>

      {/* Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
        {Object.entries(scores).map(([key, value]) => {
          const Icon = icons[key];

          return (
           <div
  key={key}
  className="
    group
    bg-white rounded-[22px] px-7 py-8
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
        className="
          transition-colors duration-300
          text-[var(--color-gold)]
        "
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

  {/* Gold divider */}
  <div
    className="h-px w-24 mb-4"
    style={{ background: "var(--color-gold)" }}
  />

  {/* Description */}
  <p className="text-sm text-gray-600 leading-relaxed">
    {key === "career" &&
      "This area is currently well-supported. Strategic moves are favored."}
    {key === "wealth" &&
      "Minor fluctuations present. Stability is key during this phase."}
    {key === "marriage" &&
      "Harmonious energy exists, though communication needs care."}
    {key === "health" &&
      "Vitality is high. A good time for rejuvenation."}
    {key === "property" &&
      "Wait for clearer signals before major decisions."}
    {key === "travel" &&
      "Careful planning advised. Short journeys favored."}
  </p>

  {/* CTA */}
  <button
    onClick={handleUnlockClick}
    className="
      mt-3 inline-flex items-center gap-2 text-sm font-medium
      transition-colors duration-300
      text-[var(--color-gold)]
    "
  >
    Get guidance
    <span className="text-base translate-y-[1px]">→</span>
  </button>
</div>


          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-24 text-center text-xs italic text-gray-400">
        * Insights are updated every 24 hours based on planetary movements.
      </p>
    </div>
  );
}
