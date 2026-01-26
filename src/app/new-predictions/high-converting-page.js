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
} from "lucide-react";
import LockedDeepPredictions from "./components/LockedDeepPredictions";
import "./high-converting.css";

export default function HighConvertingInsights({
  insights,
  onTalkToAstrologer,
  onAddFamily,
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

  return (
    <div>
      {/* Next 30 Days */}
      <h2 className="header title">Your Next 30 Days</h2>
      <div className="snapshot-grid">
        <Snapshot label="Career" icon={Briefcase} data={next30Days.career} />
        <Snapshot label="Money" icon={DollarSign} data={next30Days.money} />
        <Snapshot
          label="Relationship"
          icon={Heart}
          data={next30Days.relationship}
        />
      </div>

      {/* Life Scores */}
      <h2 className="section-title mt-8">Life Area Scores</h2>
      <div className="scores-grid">
        {Object.entries(scores).map(([k, v]) => (
          <div key={k} className="score-card">
            <div className="score-header">
              <span>{k}</span>
              <strong>{v}/100</strong>
            </div>
            <div className="score-progress">
              <div className="score-bar" style={{ width: `${v}%` }} />
            </div>
            <button className="boost-btn" onClick={handleUnlockClick}>
              Improve →
            </button>
          </div>
        ))}
      </div>

      {/* Strong Hits */}
      <h2 className="section-title mt-8">Strong Observations</h2>
      <div className="hits-grid">
        {strongHits.map((h, i) => (
          <div key={i} className="hit-card">
            <CheckCircle2 className="hit-icon" />
            <p className="hit-text">{h}</p>
          </div>
        ))}
      </div>

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


