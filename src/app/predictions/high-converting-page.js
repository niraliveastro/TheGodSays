"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Sparkles,
  TrendingUp,
  Heart,
  DollarSign,
  Briefcase,
  Home,
  Plane,
  Activity,
  Lock,
  Unlock,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Star,
  AlertCircle,
  CheckCircle2,
  X,
  Phone,
  MessageCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Shield,
  TrendingDown
} from "lucide-react";
import "./high-converting.css";

export default function HighConvertingPredictionsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState("overview"); // overview, timeline, family
  const [expandedSections, setExpandedSections] = useState({});
  const [lockedContent, setLockedContent] = useState({
    exactDates: true,
    familyKarma: true,
    remedies: true,
    whoBlocking: true,
    marriageDates: true
  });
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [confidenceLevels, setConfidenceLevels] = useState({
    general: 92,
    exactDates: 55,
    marriage: 48
  });

  // Mock data - replace with actual API calls
  const [predictionData, setPredictionData] = useState({
    next30Days: {
      career: { level: "Medium-High", days: "7-12", locked: true },
      money: { level: "Unexpected expense", days: "7-12", locked: true },
      relationship: { level: "Miscommunication risk", days: "Medium", locked: true }
    },
    lifeScores: {
      wealth: 68,
      career: 72,
      marriage: 65,
      health: 80,
      property: 55,
      travel: 45
    },
    strongHits: [
      "You're entering a period of significant career growth in the next 3 months",
      "A major financial decision needs attention between days 15-20 of this month",
      "Relationship harmony will improve after resolving a communication pattern from your past"
    ],
    problems: [
      { area: "Career Growth", reason: "Saturn transit blocking promotion opportunities", fixable: true },
      { area: "Money Flow", reason: "Family karma affecting wealth accumulation", fixable: true },
      { area: "Health Energy", reason: "Mars position causing stress-related issues", fixable: true }
    ],
    timeline: {
      past: [
        { month: "12 months ago", event: "Career opportunity missed", confidence: 85 },
        { month: "8 months ago", event: "Financial gain period", confidence: 78 },
        { month: "4 months ago", event: "Relationship tension", confidence: 82 }
      ],
      future: [
        { month: "Next 2 months", event: "New responsibility chance", confidence: 72, locked: true },
        { month: "Next 6 months", event: "Career growth window", confidence: 68, locked: true },
        { month: "Next 12 months", event: "Major life change", confidence: 55, locked: true }
      ]
    },
    hiddenFactors: [
      {
        title: "Strong family karma affecting wealth flow",
        description: "A strong influence from family karma is affecting wealth flow.",
        requires: "parent/sibling birth details",
        cta: "Add family chart"
      },
      {
        title: "45-day relationship trigger coming",
        description: "A 45-day relationship trigger is coming.",
        requires: "birth time accuracy",
        cta: "Verify birth time / talk"
      },
      {
        title: "Career rise blocked by one mismatch",
        description: "Career rise is possible but blocked by one mismatch.",
        requires: "running periods analysis",
        cta: "Ask astrologer what to do"
      }
    ],
    twoPaths: {
      pathA: { title: "Job stability + slow growth", description: "Safe but limited advancement" },
      pathB: { title: "Risk + big jump", description: "Higher reward with calculated risk" }
    }
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUnlock = (contentType) => {
    if (contentType === "familyKarma" && familyMembers.length < 2) {
      setShowAddFamilyModal(true);
      return;
    }
    setShowConsultModal(true);
  };

  const handleAddFamily = () => {
    setShowAddFamilyModal(true);
  };

  const handleTalkToAstrologer = () => {
    router.push("/talk-to-astrologer");
  };

  const handleAskQuestion = () => {
    // Open chat or question modal
    setShowConsultModal(true);
  };

  return (
    <div className="high-converting-predictions">
      {/* Sticky Bottom CTA Bar */}
      <div className="sticky-cta-bar">
        <button 
          className="cta-btn cta-primary"
          onClick={handleTalkToAstrologer}
        >
          <Phone size={18} />
          <span>Talk to Astrologer</span>
        </button>
        <button 
          className="cta-btn cta-secondary"
          onClick={handleAskQuestion}
        >
          <MessageCircle size={18} />
          <span>Ask Question</span>
        </button>
        <button 
          className="cta-btn cta-tertiary"
          onClick={handleAddFamily}
        >
          <Plus size={18} />
          <span>Add Family</span>
        </button>
      </div>

      <div className="predictions-container">
        {/* Section 1: Next 30 Days Snapshot */}
        <section className="section-next30">
          <h2 className="section-title">Your Next 30 Days Snapshot</h2>
          <div className="snapshot-grid">
            <div className="snapshot-tile">
              <div className="tile-header">
                <Briefcase className="tile-icon" />
                <span className="tile-label">Career</span>
              </div>
              <div className="tile-content">
                <div className="tile-main">
                  <span className="tile-level">{predictionData.next30Days.career.level}</span>
                  <span className="tile-days">{predictionData.next30Days.career.days} days</span>
                </div>
                {predictionData.next30Days.career.locked && (
                  <div className="tile-lock">
                    <Lock size={14} />
                    <span>Most favorable days hidden</span>
                    <button 
                      className="unlock-btn-small"
                      onClick={() => handleUnlock("exactDates")}
                    >
                      Unlock exact dates
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="snapshot-tile">
              <div className="tile-header">
                <DollarSign className="tile-icon" />
                <span className="tile-label">Money</span>
              </div>
              <div className="tile-content">
                <div className="tile-main">
                  <span className="tile-level">{predictionData.next30Days.money.level}</span>
                  <span className="tile-days">{predictionData.next30Days.money.days} days</span>
                </div>
                {predictionData.next30Days.money.locked && (
                  <div className="tile-lock">
                    <Lock size={14} />
                    <span>What to avoid is locked</span>
                    <button 
                      className="unlock-btn-small"
                      onClick={() => handleUnlock("remedies")}
                    >
                      Unlock money protection
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="snapshot-tile">
              <div className="tile-header">
                <Heart className="tile-icon" />
                <span className="tile-label">Relationship</span>
              </div>
              <div className="tile-content">
                <div className="tile-main">
                  <span className="tile-level">{predictionData.next30Days.relationship.level}</span>
                  <span className="tile-days">{predictionData.next30Days.relationship.days}</span>
                </div>
                {predictionData.next30Days.relationship.locked && (
                  <div className="tile-lock">
                    <Lock size={14} />
                    <span>Who/when is locked</span>
                    <button 
                      className="unlock-btn-small"
                      onClick={() => handleUnlock("marriageDates")}
                    >
                      Get clarity reading
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Life Area Scoreboard */}
        <section className="section-scores">
          <div className="scores-header">
            <h2 className="section-title">Your Life Area Scores</h2>
            <p className="section-subtitle">Score can increase by +12 with right remedy</p>
          </div>
          <div className="scores-grid">
            {Object.entries(predictionData.lifeScores).map(([area, score]) => (
              <div key={area} className="score-card">
                <div className="score-header">
                  <span className="score-label">{area.charAt(0).toUpperCase() + area.slice(1)}</span>
                  <span className="score-value">{score}/100</span>
                </div>
                <div className="score-progress">
                  <div 
                    className="score-bar"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <button className="boost-btn">
                  Boost my score (2-min analysis)
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: 3 Strong Hits */}
        <section className="section-hits">
          <h2 className="section-title">3 Strong Hits for You</h2>
          <div className="hits-grid">
            {predictionData.strongHits.map((hit, index) => (
              <div key={index} className="hit-card">
                <CheckCircle2 className="hit-icon" />
                <p className="hit-text">{hit}</p>
                <div className="confidence-badge">
                  <span>92% confidence</span>
                </div>
              </div>
            ))}
          </div>
          <button className="cta-secondary-btn">
            Confirm with deeper reading →
          </button>
        </section>

        {/* Section 4: Tabs Navigation */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            Timeline
          </button>
          <button 
            className={`tab-btn ${activeTab === "family" ? "active" : ""}`}
            onClick={() => setActiveTab("family")}
          >
            Family
          </button>
        </div>

        {/* Tab Content: Overview */}
        {activeTab === "overview" && (
          <>
            {/* Problem Detector */}
            <section className="section-problems">
              <h2 className="section-title">Top 3 Blocks + Why</h2>
              <div className="problems-list">
                {predictionData.problems.map((problem, index) => (
                  <div key={index} className="problem-card">
                    <AlertCircle className="problem-icon" />
                    <div className="problem-content">
                      <h3 className="problem-title">{problem.area}</h3>
                      <p className="problem-reason">{problem.reason}</p>
                      {problem.fixable && (
                        <button 
                          className="fix-btn"
                          onClick={handleTalkToAstrologer}
                        >
                          Talk to astrologer to fix faster →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Hidden Factors */}
            <section className="section-hidden">
              <h2 className="section-title">Hidden Factors Detected</h2>
              <div className="hidden-factors-list">
                {predictionData.hiddenFactors.map((factor, index) => (
                  <div key={index} className="hidden-factor-card">
                    <div className="factor-header">
                      <Lock className="factor-icon" />
                      <h3 className="factor-title">{factor.title}</h3>
                    </div>
                    <p className="factor-description">{factor.description}</p>
                    <div className="factor-lock-info">
                      <span className="lock-reason">Requires: {factor.requires}</span>
                      <button 
                        className="unlock-btn"
                        onClick={() => handleUnlock(factor.requires.includes("family") ? "familyKarma" : "exactDates")}
                      >
                        {factor.cta} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Two Paths Choice */}
            <section className="section-paths">
              <h2 className="section-title">Your Chart Shows Two Likely Paths (Next 6 Months)</h2>
              <div className="paths-container">
                <div className="path-card path-a">
                  <h3 className="path-title">Path A</h3>
                  <p className="path-description">{predictionData.twoPaths.pathA.title}</p>
                  <p className="path-subtitle">{predictionData.twoPaths.pathA.description}</p>
                </div>
                <div className="path-card path-b">
                  <h3 className="path-title">Path B</h3>
                  <p className="path-description">{predictionData.twoPaths.pathB.title}</p>
                  <p className="path-subtitle">{predictionData.twoPaths.pathB.description}</p>
                </div>
              </div>
              <button 
                className="cta-primary-btn"
                onClick={handleTalkToAstrologer}
              >
                Which path is better for YOU? Ask astrologer →
              </button>
            </section>
          </>
        )}

        {/* Tab Content: Timeline */}
        {activeTab === "timeline" && (
          <section className="section-timeline">
            <div className="timeline-tabs">
              <button className="timeline-tab active">Past 12 Months</button>
              <button className="timeline-tab">Next 12 Months</button>
            </div>
            
            <div className="timeline-content">
              <div className="timeline-past">
                <h3 className="timeline-section-title">Past Events</h3>
                {predictionData.timeline.past.map((event, index) => (
                  <div key={index} className="timeline-card">
                    <div className="timeline-date">{event.month}</div>
                    <div className="timeline-event">{event.event}</div>
                    <div className="timeline-confidence">
                      <span>{event.confidence}% confidence</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="timeline-future">
                <h3 className="timeline-section-title">Future Events</h3>
                {predictionData.timeline.future.map((event, index) => (
                  <div key={index} className={`timeline-card ${event.locked ? "locked" : ""}`}>
                    {event.locked && (
                      <div className="timeline-lock-overlay">
                        <Lock size={20} />
                        <span>Exact dates need birth time verification</span>
                        <button 
                          className="unlock-btn"
                          onClick={() => handleUnlock("exactDates")}
                        >
                          Verify birth time →
                        </button>
                      </div>
                    )}
                    <div className="timeline-date">{event.month}</div>
                    <div className="timeline-event">{event.event}</div>
                    <div className="timeline-confidence">
                      <span>{event.confidence}% confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tab Content: Family */}
        {activeTab === "family" && (
          <section className="section-family">
            <h2 className="section-title">Family Compatibility Dashboard</h2>
            
            {familyMembers.length === 0 ? (
              <div className="family-empty-state">
                <Users className="empty-icon" />
                <h3>Add Family Members to Unlock</h3>
                <p>Get insights on compatibility, harmony, and family karma</p>
                <button 
                  className="cta-primary-btn"
                  onClick={handleAddFamily}
                >
                  Add Family Member (30 sec)
                </button>
              </div>
            ) : (
              <>
                <div className="family-compatibility-grid">
                  <div className="compatibility-card">
                    <h3>You + Spouse</h3>
                    {familyMembers.find(m => m.type === "spouse") ? (
                      <div className="compatibility-score">85% Match</div>
                    ) : (
                      <button className="add-member-btn" onClick={handleAddFamily}>
                        Add spouse details (30 sec)
                      </button>
                    )}
                  </div>
                  <div className="compatibility-card">
                    <h3>Parent-Child Harmony</h3>
                    {familyMembers.find(m => m.type === "child") ? (
                      <div className="compatibility-score">78% Harmony</div>
                    ) : (
                      <button className="add-member-btn" onClick={handleAddFamily}>
                        Add child details (for education & health)
                      </button>
                    )}
                  </div>
                  <div className="compatibility-card">
                    <h3>Business Partner Match</h3>
                    {familyMembers.find(m => m.type === "partner") ? (
                      <div className="compatibility-score">72% Match</div>
                    ) : (
                      <button className="add-member-btn" onClick={handleAddFamily}>
                        Add partner details
                      </button>
                    )}
                  </div>
                </div>

                {/* Family Karma Map */}
                <div className="family-karma-map">
                  <h3 className="karma-title">Family Karma Map</h3>
                  {familyMembers.length >= 2 ? (
                    <div className="karma-content">
                      <div className="karma-item">
                        <span className="karma-label">Maternal line influence:</span>
                        <span className="karma-value">Medium</span>
                      </div>
                      <div className="karma-item">
                        <span className="karma-label">Paternal line influence:</span>
                        <span className="karma-value">High</span>
                      </div>
                      <div className="karma-item">
                        <span className="karma-label">Most affected area:</span>
                        <span className="karma-value">Money + health routines</span>
                      </div>
                    </div>
                  ) : (
                    <div className="karma-locked">
                      <Lock size={24} />
                      <p>Needs at least 2 family members data to compute</p>
                      <button className="unlock-btn" onClick={handleAddFamily}>
                        Add family members →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* Confidence Meter */}
        <section className="section-confidence">
          <h2 className="section-title">Prediction Confidence</h2>
          <div className="confidence-meters">
            <div className="confidence-item">
              <span className="confidence-label">General nature</span>
              <div className="confidence-bar-container">
                <div 
                  className="confidence-bar"
                  style={{ width: `${confidenceLevels.general}%` }}
                />
              </div>
              <span className="confidence-value">{confidenceLevels.general}%</span>
              <span className="confidence-message">Clear patterns detected</span>
            </div>
            <div className="confidence-item">
              <span className="confidence-label">Exact event dates</span>
              <div className="confidence-bar-container">
                <div 
                  className="confidence-bar low"
                  style={{ width: `${confidenceLevels.exactDates}%` }}
                />
              </div>
              <span className="confidence-value">{confidenceLevels.exactDates}%</span>
              <span className="confidence-message">Needs expert rectification</span>
              <button 
                className="confidence-cta"
                onClick={handleTalkToAstrologer}
              >
                Talk to astrologer →
              </button>
            </div>
            <div className="confidence-item">
              <span className="confidence-label">Marriage timing</span>
              <div className="confidence-bar-container">
                <div 
                  className="confidence-bar low"
                  style={{ width: `${confidenceLevels.marriage}%` }}
                />
              </div>
              <span className="confidence-value">{confidenceLevels.marriage}%</span>
              <span className="confidence-message">Needs spouse/family inputs</span>
              <button 
                className="confidence-cta"
                onClick={handleAddFamily}
              >
                Add family + consult →
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modals */}
      {showAddFamilyModal && (
        <div className="modal-overlay" onClick={() => setShowAddFamilyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddFamilyModal(false)}>
              <X size={20} />
            </button>
            <h2>Add Family Member</h2>
            <p>Add family member details to unlock family compatibility and karma insights</p>
            {/* Add form here */}
            <button className="cta-primary-btn">Add Member</button>
          </div>
        </div>
      )}

      {showConsultModal && (
        <div className="modal-overlay" onClick={() => setShowConsultModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowConsultModal(false)}>
              <X size={20} />
            </button>
            <h2>Unlock Premium Insights</h2>
            <p>Talk to our expert astrologer to get exact dates, remedies, and personalized guidance</p>
            <button 
              className="cta-primary-btn"
              onClick={handleTalkToAstrologer}
            >
              Talk to Astrologer →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
