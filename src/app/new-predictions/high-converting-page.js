"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  DollarSign,
  Heart,
  Lock,
  Phone,
  AlertCircle,
  CheckCircle2,
  Moon,
} from "lucide-react";

import LockedDeepPredictions from "./components/LockedDeepPredictions";
import "./high-converting.css";
import LifeAreaInsights from "@/components/LifeScore";

export default function HighConvertingInsights({
  insights,
  observations,
  dashaIQ,
  shadbalaRows,
  mahaRows,
  antarRows,
  openAntarFor,
  antarLoadingFor,
  openAntarInlineFor,
  activeMahaLord,
  onTalkToAstrologer,
  currentDashaChain
}) {
  const router = useRouter();

  const handleCTA = () => {
    router.push("/talk-to-astrologer");
  };

  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const handleUnlockClick = () => {
    setShowUnlockModal(true);
  };

  const handleGoToAstrologer = () => {
    setShowUnlockModal(false);
    router.push("/talk-to-astrologer");
  };

  const {
    next30Days = {},
    scores = {},
    strongHits = [],
    blockers = [],
    timeline = { future: [] },
  } = insights || {};


  // --- Planet classification ---
  const potentialPlanets = (shadbalaRows || [])
    .filter((p) => typeof p.percent === "number" && p.percent >= 65)
    .slice(0, 4);

  const problematicPlanets = (shadbalaRows || [])
    .filter((p) => typeof p.percent === "number" && p.percent < 50)
    .slice(0, 4);

  // helper → find Maha Dasha duration for planet
  const getMahaDuration = (planet) => {
    const row = mahaRows?.find(
      (m) => m.lord?.toLowerCase() === planet.toLowerCase(),
    );
    if (!row) return null;

    return {
      start: new Date(row.start).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      end: new Date(row.end).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  };

  // check if planet is current Maha Dasha
  const isActivePlanet = (planetName) =>
    activeMahaLord?.toLowerCase() === planetName.toLowerCase();

  // calculate remaining duration from Maha Dasha
  const getRemainingDuration = (planetName) => {
    const row = mahaRows?.find(
      (m) => m.lord?.toLowerCase() === planetName.toLowerCase(),
    );
    if (!row) return "—";

    const now = new Date();
    const end = new Date(row.end);

    if (now > end) return "Completed";

    const diffMs = end - now;
    const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    if (years > 0) return `${years}y ${remMonths}m`;
    return `${remMonths}m`;
  };

  // symbols & colors used across
  const PLANET_SYMBOLS = {
    Sun: "☉",
    Moon: "☽",
    Mercury: "☿",
    Venus: "♀",
    Mars: "♂",
    Jupiter: "♃",
    Saturn: "♄",
    Rahu: "☊",
  };
  const PLANET_COLORS = {
    Sun: "#fbbf24",
    Moon: "#a78bfa",
    Mercury: "#10b981",
    Venus: "#ec4899",
    Mars: "#ef4444",
    Jupiter: "#3b82f6",
    Saturn: "#6366f1",
    Rahu: "#8b5cf6",
  };



  function PlanetTile({ planet, type }) {
    const active = isActivePlanet(planet.name);
    const remaining = getRemainingDuration(planet.name);

    const symbol = PLANET_SYMBOLS[planet.name] || "◯";
    const color = PLANET_COLORS[planet.name] || "#22c55e";

    return (
      <div className={`planet-tile ${active ? "active" : ""}`}>
        <div className={`planet-accent ${type}`} />

        {/* ACTIVE BADGE */}
        {active && <span className="active-pill">Active</span>}

        <div className="planet-header">
          <div
            className={`planet-icon-tile ${type}`}
            style={{ background: color }}
          >
            <span className="planet-symbol">{symbol}</span>
          </div>

          <div>
            <h3 className="planet-name">{planet.name}</h3>
            <p className="planet-sub">
              {type === "positive" ? "Strong placement" : "Needs correction"}
            </p>
          </div>
        </div>

        <div className="planet-meta">
          <div>
            <span>Strength</span>
            <strong>{planet.percent.toFixed(1)}%</strong>
          </div>

          <div>
            <span>Remaining</span>
            <strong>{remaining}</strong>
          </div>
        </div>

        {type === "negative" && (
          <button className="planet-fix-btn" onClick={onTalkToAstrologer}>
            Fix this planet →
          </button>
        )}
      </div>
    );
  }
  function PlanetEmptyState({ type, onTalkToAstrologer }) {
    const isPositive = type === "positive";

return (
  <div className="planet-empty-tile flex flex-col items-center text-center gap-4">
    {/* ORBIT GRAPHIC */}
    <svg
      width="180"
      height="90"
      viewBox="0 0 180 90"
      className="opacity-80"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* dashed orbit */}
      <ellipse
        cx="90"
        cy="45"
        rx="78"
        ry="28"
        fill="none"
        stroke="#E6D4A8"
        strokeWidth="1.2"
        strokeDasharray="3 6"
      />

      {/* central planet */}
      <circle cx="90" cy="45" r="6" fill="#D6B46A" />

      {/* secondary planet */}
      <circle cx="120" cy="19" r="4" fill="#EAD7A3" />
    </svg>

    {/* ICON */}
    <div
      className={`planet-empty-icon ${type} text-lg tracking-wide`}
    >
      {isPositive ? "✦" : " "}
    </div>

    <h4 className="planet-empty-title text-lg font-medium">
      {isPositive
        ? "No Dominant Strengths Detected"
        : "No Major Weaknesses Detected"}
    </h4>

    <p className="planet-empty-text max-w-md text-sm opacity-80">
      {isPositive
        ? "Your chart shows balanced energies. The strongest planets emerge only during specific dashas and transits."
        : "Surface strengths look stable, but subtle planetary tensions may still affect decisions and timing."}
    </p>

    <button
      className=" mt-2 text-slate-700 hover:text-amber-500 transition"
      onClick={onTalkToAstrologer}
    >
      Ask an astrologer for deeper insights →
    </button>
  </div>
);

  }

  return (
    <div>

            {/* 🌟 High Potential Planets */}
      <h2 className="section-title ">High Potential Planets</h2>

      <div className="planet-card-grid-tiles">
        {potentialPlanets.length > 0 ? (
          potentialPlanets.map((p, i) => (
            <PlanetTile key={i} planet={p} type="positive" />
          ))
        ) : (
          <PlanetEmptyState
            type="positive"
            onTalkToAstrologer={onTalkToAstrologer}
          />
        )}
      </div>

      {/* ⚠️ Challenging Planets */}
      <h2 className="section-title mt-6">Challenging Planets</h2>

      <div className="planet-card-grid-tiles">
        {problematicPlanets.length > 0 ? (
          problematicPlanets.map((p, i) => (
            <PlanetTile key={i} planet={p} type="negative" />
          ))
        ) : (
          <PlanetEmptyState
            type="negative"
            onTalkToAstrologer={onTalkToAstrologer}
          />
        )}
      </div>

      {/* Next 30 Days */}
      {/* <h2 className="section-title">Your Next 30 Days</h2>
      <div className="snapshot-grid">
        <Snapshot label="Career" icon={Briefcase} data={next30Days.career} />
        <Snapshot label="Money" icon={DollarSign} data={next30Days.money} />
        <Snapshot
          label="Relationship"
          icon={Heart}
          data={next30Days.relationship}
        />
      </div> */}

      <LifeAreaInsights scores={scores} 
       currentDashaChain={currentDashaChain}
      handleUnlockClick={handleUnlockClick} />






      <LockedDeepPredictions
        title="Advanced Career & Marriage Timings"
        subtitle="Exact windows, delays, causes & corrective paths"
        ctaText="Talk to an astrologer"
        onUnlock={handleUnlockClick}
      />


      {showUnlockModal && (
        <div className="unlock-modal-overlay">
          <div className="unlock-modal">
            <h3>Your Future Is Ready to Be Revealed</h3>
            <p>
              This timeline contains **personal astrological insights** based on
              your planetary alignments. A certified astrologer can walk you
              through what’s coming and how to prepare for it.
            </p>

            <div className="unlock-benefits">
              <div>✔ Personalized guidance</div>
              <div>✔ Career, money & relationship clarity</div>
              <div>✔ Action steps you can use immediately</div>
            </div>

            <div className="unlock-actions">
              <button
                className="cta-btn cta-secondary"
                onClick={() => setShowUnlockModal(false)}
              >
                Maybe later
              </button>

              <button
                className="cta-btn cta-primary"
                onClick={handleGoToAstrologer}
              >
                <Phone size={18} /> Talk to Astrologer Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Snapshot({ label, icon: Icon, data }) {
  return (
    <div className="snapshot-tile">
      <div className="tile-header">
        <Icon className="tile-icon" />
        <span className="tile-label">{label}</span>
      </div>

      <div className="tile-content">
        <div className="tile-main">
          <div className="tile-level">{data.level}</div>
          <div className="tile-days">{data.probability}% probability</div>
        </div>
      </div>

      {data.locked && (
        <div className="tile-lock">
          <Lock size={14} /> Locked
        </div>
      )}
    </div>
  );
}
