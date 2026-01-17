"use client";
import { Heart, MessageCircle, Users, TrendingUp } from "lucide-react";

export default function EmotionalCommunicationMatch({ person1, person2, viewMode }) {
  // Mock analysis based on Moon, Mercury, Venus, 7th house
  const analysis = {
    conflictStyle: {
      person1: "Direct communicator - says what they think immediately",
      person2: "Reflective - thinks before responding, may need space",
      compatibility: 72,
      advice: "Person 1 should give Person 2 time to process. Person 2 should communicate needs clearly."
    },
    emotionalNeeds: {
      person1: "Needs independence and occasional alone time",
      person2: "Needs consistent emotional reassurance and quality time",
      compatibility: 68,
      advice: "Balance is key. Schedule regular quality time while respecting personal space."
    },
    affectionExpression: {
      person1: "Shows love through actions and practical help",
      person2: "Shows love through words of affirmation and physical touch",
      compatibility: 78,
      advice: "Learn each other's love language. Both are valid ways of expressing care."
    }
  };

  return (
    <div className="emotional-communication-match">
      <div className="section-header">
        <Heart size={24} />
        <h3>Emotional & Communication Match</h3>
      </div>

      {viewMode === 'expert' && (
        <div className="analysis-basis">
          <p className="basis-text">
            Derived from: Moon sign (emotions), Mercury (communication), Venus (affection), 7th house (partnership style)
          </p>
        </div>
      )}

      <div className="match-areas-grid">
        {/* Conflict Style */}
        <div className="match-area-card">
          <div className="area-header">
            <MessageCircle size={20} className="area-icon" />
            <h4>Conflict & Communication Style</h4>
          </div>

          <div className="compatibility-meter">
            <div className="meter-bar">
              <div 
                className="meter-fill"
                style={{ 
                  width: `${analysis.conflictStyle.compatibility}%`,
                  backgroundColor: getCompatibilityColor(analysis.conflictStyle.compatibility)
                }}
              />
            </div>
            <span className="meter-value">{analysis.conflictStyle.compatibility}% Compatible</span>
          </div>

          <div className="person-styles">
            <div className="style-item person1">
              <span className="person-label">{person1.name}:</span>
              <p className="style-description">{analysis.conflictStyle.person1}</p>
            </div>
            <div className="style-item person2">
              <span className="person-label">{person2.name}:</span>
              <p className="style-description">{analysis.conflictStyle.person2}</p>
            </div>
          </div>

          <div className="advice-box">
            <span className="advice-label">💡 Advice:</span>
            <p className="advice-text">{analysis.conflictStyle.advice}</p>
          </div>
        </div>

        {/* Emotional Needs */}
        <div className="match-area-card">
          <div className="area-header">
            <Heart size={20} className="area-icon" />
            <h4>Emotional Needs</h4>
          </div>

          <div className="compatibility-meter">
            <div className="meter-bar">
              <div 
                className="meter-fill"
                style={{ 
                  width: `${analysis.emotionalNeeds.compatibility}%`,
                  backgroundColor: getCompatibilityColor(analysis.emotionalNeeds.compatibility)
                }}
              />
            </div>
            <span className="meter-value">{analysis.emotionalNeeds.compatibility}% Compatible</span>
          </div>

          <div className="person-styles">
            <div className="style-item person1">
              <span className="person-label">{person1.name}:</span>
              <p className="style-description">{analysis.emotionalNeeds.person1}</p>
            </div>
            <div className="style-item person2">
              <span className="person-label">{person2.name}:</span>
              <p className="style-description">{analysis.emotionalNeeds.person2}</p>
            </div>
          </div>

          <div className="advice-box">
            <span className="advice-label">💡 Advice:</span>
            <p className="advice-text">{analysis.emotionalNeeds.advice}</p>
          </div>
        </div>

        {/* Affection Expression */}
        <div className="match-area-card">
          <div className="area-header">
            <Users size={20} className="area-icon" />
            <h4>Affection Expression</h4>
          </div>

          <div className="compatibility-meter">
            <div className="meter-bar">
              <div 
                className="meter-fill"
                style={{ 
                  width: `${analysis.affectionExpression.compatibility}%`,
                  backgroundColor: getCompatibilityColor(analysis.affectionExpression.compatibility)
                }}
              />
            </div>
            <span className="meter-value">{analysis.affectionExpression.compatibility}% Compatible</span>
          </div>

          <div className="person-styles">
            <div className="style-item person1">
              <span className="person-label">{person1.name}:</span>
              <p className="style-description">{analysis.affectionExpression.person1}</p>
            </div>
            <div className="style-item person2">
              <span className="person-label">{person2.name}:</span>
              <p className="style-description">{analysis.affectionExpression.person2}</p>
            </div>
          </div>

          <div className="advice-box">
            <span className="advice-label">💡 Advice:</span>
            <p className="advice-text">{analysis.affectionExpression.advice}</p>
          </div>
        </div>
      </div>

      <div className="overall-summary">
        <div className="summary-card">
          <TrendingUp size={20} />
          <div className="summary-content">
            <h4>Communication Compatibility Summary</h4>
            <p>
              Overall emotional and communication compatibility is <strong>
                {Math.round((analysis.conflictStyle.compatibility + 
                  analysis.emotionalNeeds.compatibility + 
                  analysis.affectionExpression.compatibility) / 3)}%
              </strong>. 
              You have different but complementary styles. Understanding and respecting these differences
              will create a stronger, more empathetic relationship.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCompatibilityColor(percentage) {
  if (percentage >= 75) return '#10b981';
  if (percentage >= 60) return '#3b82f6';
  if (percentage >= 45) return '#f59e0b';
  return '#ef4444';
}
