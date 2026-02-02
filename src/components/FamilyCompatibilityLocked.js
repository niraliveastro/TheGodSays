"use client";
import { Users, Lock, TrendingUp, Home, Heart } from "lucide-react";

export default function FamilyCompatibilityLocked({ onUnlock, isLocked = true }) {
  const teaserInsights = [
    {
      title: "In-Law Harmony",
      icon: <Home size={24} />,
      preview: "Compatibility with extended family members",
      detail: "Analysis of how each partner will bond with in-laws based on 4th house and Moon"
    },
    {
      title: "Family Karma Influence",
      icon: <Users size={24} />,
      preview: "Ancestral patterns affecting marriage",
      detail: "Multi-generational chart analysis to identify inherited relationship patterns"
    },
    {
      title: "Parent-Couple Dynamics",
      icon: <Heart size={24} />,
      preview: "How parents' charts influence this union",
      detail: "Synastry between couple's chart and both sets of parents"
    }
  ];

  return (
    <div className="family-compatibility-locked">
      <div className="section-header">
        <Users size={24} />
        <h3>Family Compatibility Analysis</h3>
        <Lock size={18} className="lock-badge" />
      </div>

      <div className="teaser-intro">
        <p className="intro-text">
          Marriage isn't just between two people - families play a crucial role. 
          Unlock deep family compatibility insights by adding parent and sibling charts.
        </p>
      </div>

      <div className={`teaser-grid ${isLocked ? 'locked-view' : ''}`}>
        {teaserInsights.map((insight, index) => (
          <div key={index} className="teaser-card">
            <div className="teaser-icon">{insight.icon}</div>
            <h4 className="teaser-title">{insight.title}</h4>
            <p className="teaser-preview">{insight.preview}</p>
            
            {isLocked ? (
              <div className="teaser-blur">
                <p className="blurred-text">{insight.detail}</p>
                <div className="unlock-overlay">
                  <Lock size={20} />
                </div>
              </div>
            ) : (
              <p className="teaser-detail">{insight.detail}</p>
            )}
          </div>
        ))}
      </div>

      {isLocked && (
        <div className="unlock-section">
          <div className="unlock-card">
            <div className="unlock-header">
              <Lock size={32} className="unlock-icon" />
              <h4>Unlock Family Compatibility</h4>
            </div>

            <div className="unlock-benefits">
              <h5>What You'll Get:</h5>
              <ul className="benefits-list">
                <li>✓ In-law harmony prediction (both sides)</li>
                <li>✓ Family karma patterns affecting marriage</li>
                <li>✓ Parent-couple compatibility scores</li>
                <li>✓ Sibling dynamics in married life</li>
                <li>✓ Multi-generational remedies</li>
                <li>✓ Family timing for announcements</li>
              </ul>
            </div>

            <div className="unlock-requirements">
              <h5>Required Data:</h5>
              <div className="requirements-grid">
                <div className="requirement-item">
                  <span className="req-label">Parents (Both sides)</span>
                  <span className="req-detail">DOB, TOB, Place</span>
                </div>
                <div className="requirement-item">
                  <span className="req-label">Siblings (Optional)</span>
                  <span className="req-detail">Birth details for deeper insights</span>
                </div>
              </div>
            </div>

            <div className="unlock-actions">
              <button className="unlock-btn primary" onClick={() => onUnlock('family')}>
                <Users size={16} />
                Add Family Charts (5 min)
              </button>
              <button className="unlock-btn secondary" onClick={() => onUnlock('astrologer')}>
                <TrendingUp size={16} />
                Talk to Astrologer
              </button>
            </div>

            <div className="unlock-note">
              <p className="note-text">
                💡 <strong>Why this matters:</strong> 70% of marriage conflicts involve family dynamics. 
                Understanding these patterns beforehand helps create harmony from day one.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
