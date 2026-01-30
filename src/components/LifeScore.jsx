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
      <h2 className="title mx-auto text-center">
        Life Area Insights
      </h2>

      <p className="mt-6 max-w-3xl mx-auto text-center text-gray-500 text-base leading-relaxed">
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
                bg-white rounded-[28px] px-10 py-12
                shadow-[0_18px_55px_-35px_rgba(0,0,0,0.35)]
                transition-all duration-300 ease-out
                hover:-translate-y-[2px]
                hover:shadow-[0_22px_65px_-35px_rgba(0,0,0,0.45)]
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-3">
                  {/* ICON */}
                  <Icon
                    size={18}
                    className="
                      transition-colors duration-300
                      text-[var(--color-gold)]
                      group-hover:text-[var(--color-gold)]
                    "
                  />

                  <span className="subtitle capitalize text-gray-900 mb-2">
                    {key}
                  </span>
                </div>

                <span className="text-2xl font-serif text-gray-900">
                  {value}
                  <span className="text-sm text-gray-400">/100</span>
                </span>
              </div>

              {/* Gold divider */}
              <div
                className="h-px w-36 mb-7 transition-colors duration-300"
                style={{ background: "var(--color-gold)" }}
              />

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {key === "career" &&
                  "This area is currently well-supported. Strategic moves are favored by current alignments."}
                {key === "wealth" &&
                  "Some fluctuations are influencing this area. Stability is key during this transit phase."}
                {key === "marriage" &&
                  "Harmonious vibrations are present, though communication needs a gentle touch today."}
                {key === "health" &&
                  "Vitality is high. Excellent time for physical activities and holistic rejuvenation."}
                {key === "property" &&
                  "Wait for clearer cosmic signals before major real estate or home decisions."}
                {key === "travel" &&
                  "Mercury movements suggest careful planning. Short journeys are better than long treks."}
              </p>

              {/* CTA */}
              <button
                onClick={handleUnlockClick}
                className="
                  mt-10 inline-flex items-center gap-2 text-sm font-medium
                  transition-colors duration-300
                  text-[var(--color-gold)]
                  hover:text-[var(--color-gold)]
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
