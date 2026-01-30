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
import VimshottariMahaDasha from "../../components/VismottriMahadasha";
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

  const { strongObservations = [], potential = [] } = observations || {};

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
      <div className="planet-empty-tile">
        <div className={`planet-empty-icon ${type}`}>
          {isPositive ? "✦" : "⚠︎"}
        </div>

        <h4 className="planet-empty-title">
          {isPositive
            ? "No Dominant Strengths Detected"
            : "No Major Weaknesses Detected"}
        </h4>

        <p className="planet-empty-text">
          {isPositive
            ? "Your chart shows balanced energies. The strongest planets emerge only during specific dashas and transits."
            : "Surface strengths look stable, but subtle planetary tensions may still affect decisions and timing."}
        </p>

        <button className="planet-empty-cta" onClick={handleCTA}>
          Ask an astrologer →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Next 30 Days */}
      <h2 className="section-title">Your Next 30 Days</h2>
      <div className="snapshot-grid">
        <Snapshot label="Career" icon={Briefcase} data={next30Days.career} />
        <Snapshot label="Money" icon={DollarSign} data={next30Days.money} />
        <Snapshot
          label="Relationship"
          icon={Heart}
          data={next30Days.relationship}
        />
      </div>

      <LifeAreaInsights scores={scores} handleUnlockClick={handleUnlockClick} />

      <h2 className="section-title mt-8">Chart Highlights</h2>

      <div
        className="
    grid
    grid-cols-1
    gap-6
    md:grid-cols-1
    lg:grid-cols-[3fr_2fr]
  "
      >
        {/* LEFT – Strong Observations (60%) */}
        <div className="observations-panel">
          <h4 className="font-medium sub-title flex items-center gap-2">
            <span className="observations-dot" />
            Strong Observations
          </h4>

          <div className="observations-stack">
            {strongObservations.map((h, i) => (
              <div key={i} className="observation-card">
                <div className="observation-left">
                  <span className="observation-index">{i + 1}</span>
                </div>

                <div className="observation-content">
                  <p className="observation-text">{h}</p>
                  <span className="observation-badge">
                    Verified planetary pattern
                  </span>
                </div>

                <div className="observation-icon-wrap">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – Potential in Chart (40%) */}
        <div className="potential-panel">
          <h4 className="font-medium sub-title flex items-center gap-2">
            <span className="potential-dot" />
            Potential in Your Chart
          </h4>

          <div className="potential-stack">
            {potential.map((p, i) => (
              <div key={i} className="potential-card-advanced">
                <div className="potential-left">
                  <span className="potential-index">{i + 1}</span>
                </div>

                <div className="potential-content">
                  <p className="potential-text">{p}</p>
                  <span className="potential-hint">
                    Can activate with correct timing & guidance
                  </span>
                </div>

                <div className="potential-icon-wrap">
                  <AlertCircle size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dashaIQ && (
        <>
          <h2 className="section-title mt-10">Dasha IQ</h2>

          <div className="dasha-iq-panel">
            <div className="dasha-iq-accent" />

            <div className="dasha-iq-header">
              <div className="dasha-iq-planet">
                <Moon size={20} />
              </div>

              <div>
                <h3 className="dasha-iq-title">
                  {dashaIQ.mahaLord} Maha Dasha
                </h3>
                <p className="dasha-iq-subtitle">
                  Decision intelligence for this period
                </p>
              </div>

              <div className="dasha-iq-score">
                <span className="iq-value">{dashaIQ.iq}</span>
                <span className="iq-label">IQ</span>
              </div>
            </div>

            <div className="dasha-iq-grid">
              {/* LEFT */}
              <div className="dasha-iq-card">
                <h4>Why this score</h4>
                <ul className="dasha-iq-points">
                  {dashaIQ.reasoning.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>

              {/* RIGHT */}
              <div className="dasha-iq-card highlight">
                <h4>Decision Readiness</h4>

                <div className="dasha-iq-meter">
                  <div className="meter-track">
                    <div
                      className="meter-fill"
                      style={{ width: `${dashaIQ.iq}%` }}
                    />
                  </div>
                  <span className="meter-label">{dashaIQ.iq}% Supportive</span>
                </div>

                <p className="dasha-iq-note">
                  Best used for{" "}
                  <strong>
                    {dashaIQ.iq >= 70
                      ? "career moves, commitments, investments"
                      : dashaIQ.iq >= 55
                        ? "planning, preparation, cautious decisions"
                        : "reflection and correction"}
                  </strong>
                </p>

                <button className="btn btn-gold" onClick={onTalkToAstrologer}>
                  Decode my Dasha →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 🔥 ADD THIS RIGHT AFTER */}
      <VimshottariMahaDasha
        mahaRows={mahaRows}
        antarRows={antarRows}
        openAntarFor={openAntarFor}
        antarLoadingFor={antarLoadingFor}
        openAntarInlineFor={openAntarInlineFor}
        activeMahaLord={activeMahaLord}
      />

      {/* Blocks */}
      <h2 className="section-title mt-8">What’s Blocking You</h2>
      <div className="problems-list">
        {blockers.map((b, i) => (
          <div className="problem-card">
            <AlertCircle className="problem-icon" />

            <div className="problem-content">
              <strong className="problem-title">{b.area}</strong>
              <p className="problem-reason">{b.reason}</p>
            </div>

            {b.fixable && (
              <button className="fix-btn" onClick={onTalkToAstrologer}>
                Fix faster →
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 🌟 High Potential Planets */}
      <h2 className="section-title mt-10">High Potential Planets</h2>

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
      <h2 className="section-title mt-12">Challenging Planets</h2>

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

      <LockedDeepPredictions
        title="Advanced Career & Marriage Timings"
        subtitle="Exact windows, delays, causes & corrective paths"
        ctaText="Talk to an astrologer"
        onUnlock={handleUnlockClick}
      />

      {/* Astrologer CTA */}
      <div className="astrologer-cta">
        <div className="astrologer-cta-content">
          <h3>Confused about what’s coming next?</h3>
          <p>
            Get personal guidance from an experienced astrologer and turn these
            insights into clear actions.
          </p>

          {/* ✅ USE handleCTA HERE */}
          <button className="cta-btn cta-primary" onClick={handleCTA}>
            <Phone size={18} /> Get your guidance today
          </button>
        </div>

        <div className="astrologer-cta-visual">
          <img
            src="/images/astrologer2.png"
            alt="Astrologer guidance"
            width={400}
            height={500}
          />
        </div>
      </div>

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
