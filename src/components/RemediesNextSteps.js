"use client";
import { Heart, Lock, Sparkles, Calendar, Gem, Clock } from "lucide-react";

export default function RemediesNextSteps({ onUnlock, isLocked = true }) {
  const freeRemedies = {
    mantra: {
      title: "Daily Mantra",
      content: "Om Namo Bhagavate Vasudevaya",
      instructions: "Chant 108 times every morning",
      benefit: "Strengthens Jupiter for wisdom and prosperity"
    },
    behavior: {
      title: "Behavior Change",
      content: "Practice patience in communication",
      instructions: "Pause 3 seconds before responding in conflicts",
      benefit: "Reduces Mercury-Mars conflicts in your chart"
    },
    timing: {
      title: "Timing Advice",
      content: "Avoid major decisions on Tuesdays",
      instructions: "Schedule important meetings on Thursdays instead",
      benefit: "Aligns with your favorable planetary hours"
    }
  };

  const lockedRemedies = [
    {
      title: "Personalized Remedy Plan",
      description: "Custom 90-day remedy protocol based on your dasha and transits",
      includes: ["Daily rituals", "Specific mantras", "Donation schedule", "Color therapy"]
    },
    {
      title: "Gemstone Confirmation",
      description: "Expert verification of suitable gemstones with wearing method",
      includes: ["Primary gemstone", "Weight & metal", "Muhurat for wearing", "Mantra activation"]
    },
    {
      title: "Ritual Timing & Process",
      description: "Exact dates and procedures for remedial rituals",
      includes: ["Puja dates", "Temple visits", "Charity timing", "Fasting days"]
    }
  ];

  return (
    <div className="remedies-next-steps">
      <div className="remedies-header">
        <Heart size={24} />
        <h3>Remedies & Next Steps</h3>
      </div>

      {/* Free Remedies */}
      <div className="free-remedies-section">
        <h4 className="subsection-title">
          <Sparkles size={18} />
          Free Remedies (Start Today)
        </h4>

        <div className="free-remedies-grid">
          <div className="remedy-card free">
            <div className="remedy-icon">
              <Sparkles size={24} />
            </div>
            <h5 className="remedy-title">{freeRemedies.mantra.title}</h5>
            <div className="remedy-content">
              <p className="remedy-main">{freeRemedies.mantra.content}</p>
              <p className="remedy-instructions">{freeRemedies.mantra.instructions}</p>
            </div>
            <div className="remedy-benefit">
              <span className="benefit-label">Benefit:</span>
              <span className="benefit-text">{freeRemedies.mantra.benefit}</span>
            </div>
          </div>

          <div className="remedy-card free">
            <div className="remedy-icon">
              <Heart size={24} />
            </div>
            <h5 className="remedy-title">{freeRemedies.behavior.title}</h5>
            <div className="remedy-content">
              <p className="remedy-main">{freeRemedies.behavior.content}</p>
              <p className="remedy-instructions">{freeRemedies.behavior.instructions}</p>
            </div>
            <div className="remedy-benefit">
              <span className="benefit-label">Benefit:</span>
              <span className="benefit-text">{freeRemedies.behavior.benefit}</span>
            </div>
          </div>

          <div className="remedy-card free">
            <div className="remedy-icon">
              <Calendar size={24} />
            </div>
            <h5 className="remedy-title">{freeRemedies.timing.title}</h5>
            <div className="remedy-content">
              <p className="remedy-main">{freeRemedies.timing.content}</p>
              <p className="remedy-instructions">{freeRemedies.timing.instructions}</p>
            </div>
            <div className="remedy-benefit">
              <span className="benefit-label">Benefit:</span>
              <span className="benefit-text">{freeRemedies.timing.benefit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Locked Premium Remedies */}
      <div className="locked-remedies-section">
        <h4 className="subsection-title">
          <Lock size={18} />
          Personalized Remedy Plan (Locked)
        </h4>

        <div className="locked-remedies-grid">
          {lockedRemedies.map((remedy, index) => (
            <div key={index} className={`remedy-card locked ${!isLocked ? 'unlocked' : ''}`}>
              <div className="remedy-header">
                <div className="remedy-icon locked-icon">
                  {index === 0 && <Calendar size={24} />}
                  {index === 1 && <Gem size={24} />}
                  {index === 2 && <Clock size={24} />}
                </div>
                <Lock size={16} className="lock-badge" />
              </div>

              <h5 className="remedy-title">{remedy.title}</h5>
              <p className="remedy-description">{remedy.description}</p>

              <div className="remedy-includes">
                <span className="includes-label">Includes:</span>
                <ul className="includes-list">
                  {remedy.includes.map((item, idx) => (
                    <li key={idx} className="blurred-text">{item}</li>
                  ))}
                </ul>
              </div>

              {isLocked && (
                <div className="unlock-remedy-overlay">
                  <Lock size={20} />
                </div>
              )}
            </div>
          ))}
        </div>

        {isLocked && (
          <div className="unlock-remedies-cta">
            <div className="cta-content">
              <h4>Unlock Your Complete Remedy Protocol</h4>
              <p>Get personalized remedies designed specifically for your chart, current dasha, and life goals</p>
              
              <div className="unlock-options-grid">
                <button className="unlock-option-btn" onClick={() => onUnlock('astrologer')}>
                  <div className="option-content">
                    <span className="option-title">Talk to Astrologer</span>
                    <span className="option-subtitle">Get remedies + consultation</span>
                  </div>
                  <span className="option-arrow">→</span>
                </button>

                <button className="unlock-option-btn" onClick={() => onUnlock('premium')}>
                  <div className="option-content">
                    <span className="option-title">Premium Report</span>
                    <span className="option-subtitle">Detailed remedy PDF</span>
                  </div>
                  <span className="option-arrow">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="remedies-footer">
        <div className="footer-note">
          <p className="note-text">
            <strong>Important:</strong> Remedies work best when done with faith and consistency. 
            Start with free remedies today while considering personalized solutions for deeper issues.
          </p>
        </div>
      </div>
    </div>
  );
}
