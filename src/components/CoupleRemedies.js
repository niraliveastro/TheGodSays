"use client";
import { Heart, Lock, Sparkles, Calendar } from "lucide-react";

export default function CoupleRemedies({ onUnlock }) {
  const simpleRemedies = [
    {
      title: "Joint Mantra Practice",
      content: "Chant 'Om Shri Ganeshaya Namah' together every morning",
      timing: "Best time: Before breakfast",
      benefit: "Removes obstacles and strengthens bond",
      frequency: "Daily for 21 days minimum"
    },
    {
      title: "Relationship Protection",
      content: "Light a ghee lamp together on Fridays",
      timing: "Evening, before sunset",
      benefit: "Invokes Venus blessings for harmony",
      frequency: "Every Friday"
    },
    {
      title: "Communication Ritual",
      content: "Spend 15 minutes daily in honest conversation",
      timing: "Before bedtime",
      benefit: "Strengthens Mercury connection",
      frequency: "Daily"
    }
  ];

  return (
    <div className="couple-remedies">
      <div className="remedies-header">
        <Heart size={24} />
        <h3>Remedies for Strengthening This Match</h3>
      </div>

      {/* Simple Remedies (Free) */}
      <div className="simple-remedies-section">
        <h4 className="subsection-title">
          <Sparkles size={18} />
          Simple Remedies (Start Today)
        </h4>

        <div className="remedies-grid">
          {simpleRemedies.map((remedy, index) => (
            <div key={index} className="remedy-card simple">
              <div className="remedy-number">{index + 1}</div>
              <h5 className="remedy-title">{remedy.title}</h5>
              <div className="remedy-content">
                <p className="remedy-action">{remedy.content}</p>
                <div className="remedy-details">
                  <div className="detail-item">
                    <Calendar size={14} />
                    <span>{remedy.timing}</span>
                  </div>
                  <div className="detail-item">
                    <span className="frequency-badge">{remedy.frequency}</span>
                  </div>
                </div>
                <div className="remedy-benefit">
                  <span className="benefit-label">Benefit:</span>
                  <span className="benefit-text">{remedy.benefit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Couple Remedy Plan (Locked) */}
      <div className="custom-remedies-section">
        <h4 className="subsection-title">
          <Lock size={18} />
          Personalized Couple Remedy Plan (Locked)
        </h4>

        <div className="locked-remedy-preview">
          <div className="preview-content blurred">
            <div className="preview-item">
              <h5>Compatibility Boosting Rituals</h5>
              <p>Specific pujas and ceremonies based on your joint chart analysis...</p>
            </div>
            <div className="preview-item">
              <h5>Gemstone Recommendations</h5>
              <p>Complementary gemstones for both partners to enhance harmony...</p>
            </div>
            <div className="preview-item">
              <h5>Timing for Major Decisions</h5>
              <p>Auspicious periods for engagement, marriage, first home purchase...</p>
            </div>
            <div className="preview-item">
              <h5>Conflict Resolution Protocols</h5>
              <p>Astrologically-timed communication strategies for difficult topics...</p>
            </div>
            <div className="preview-item">
              <h5>Family Integration Remedies</h5>
              <p>Rituals to improve in-law relationships and family acceptance...</p>
            </div>
          </div>

          <div className="locked-overlay">
            <div className="unlock-content">
              <Lock size={40} className="lock-icon" />
              <h4>Custom Couple Remedy Protocol</h4>
              <p>Get a comprehensive 90-day remedy plan designed specifically for your relationship</p>
              
              <div className="plan-includes">
                <h5>Your Plan Includes:</h5>
                <ul className="includes-list">
                  <li>✓ Daily couple rituals</li>
                  <li>✓ Weekly puja schedule</li>
                  <li>✓ Gemstone activation process</li>
                  <li>✓ Muhurat dates for milestones</li>
                  <li>✓ Conflict resolution timing</li>
                  <li>✓ Family harmony protocols</li>
                  <li>✓ Monthly review & adjustments</li>
                </ul>
              </div>

              <div className="unlock-options">
                <button className="unlock-btn primary" onClick={() => onUnlock('astrologer')}>
                  <Heart size={16} />
                  Talk to Astrologer
                </button>
                <button className="unlock-btn secondary" onClick={() => onUnlock('premium')}>
                  <Sparkles size={16} />
                  Buy Premium Report
                </button>
              </div>

              <p className="unlock-note">
                💕 Investment: ₹2,499 | Lifetime access | Includes 1 follow-up consultation
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="remedies-footer">
        <div className="footer-card">
          <h4>Why Remedies Matter</h4>
          <p>
            Vedic remedies work on subtle energy levels to remove obstacles and enhance positive influences.
            Think of them as "relationship insurance" - small daily efforts that prevent major issues.
            Start with simple remedies now and upgrade to personalized plan as you progress.
          </p>
        </div>
      </div>
    </div>
  );
}
