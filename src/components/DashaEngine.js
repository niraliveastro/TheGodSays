"use client";
import { Clock, TrendingUp, AlertCircle } from "lucide-react";

export default function DashaEngine({ dasha, viewMode }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDashaImpact = (planet) => {
    const impacts = {
      Sun: { career: 'High', money: 'Medium', relationship: 'Medium' },
      Moon: { career: 'Medium', money: 'Medium', relationship: 'High' },
      Mars: { career: 'High', money: 'High', relationship: 'Challenging' },
      Mercury: { career: 'High', money: 'High', relationship: 'Good' },
      Jupiter: { career: 'Excellent', money: 'Excellent', relationship: 'Excellent' },
      Venus: { career: 'Good', money: 'Excellent', relationship: 'Excellent' },
      Saturn: { career: 'Challenging', money: 'Slow', relationship: 'Delayed' },
      Rahu: { career: 'Sudden', money: 'Unstable', relationship: 'Unconventional' },
      Ketu: { career: 'Spiritual', money: 'Detachment', relationship: 'Karmic' }
    };
    return impacts[planet] || { career: 'Neutral', money: 'Neutral', relationship: 'Neutral' };
  };

  const currentImpact = getDashaImpact(dasha.currentMahadasha);

  // Calculate next 2 dasha transitions
  const getNextDashas = () => {
    const order = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    const currentIndex = order.indexOf(dasha.currentMahadasha);
    const next1 = order[(currentIndex + 1) % order.length];
    const next2 = order[(currentIndex + 2) % order.length];
    
    const mahaEnd = new Date(dasha.mahadashaEnd);
    const next1Start = new Date(mahaEnd);
    const next1End = new Date(next1Start);
    next1End.setFullYear(next1End.getFullYear() + 10); // Simplified
    
    const next2Start = new Date(next1End);
    const next2End = new Date(next2Start);
    next2End.setFullYear(next2End.getFullYear() + 10);

    return [
      { planet: next1, start: next1Start, end: next1End },
      { planet: next2, start: next2Start, end: next2End }
    ];
  };

  const nextDashas = getNextDashas();

  return (
    <div className="dasha-engine">
      <div className="dasha-header">
        <Clock size={24} />
        <h3>Current Dasha Periods</h3>
        <span className="urgency-badge">
          <AlertCircle size={14} />
          Life timing engine
        </span>
      </div>

      <div className="current-dasha-card">
        <div className="dasha-main">
          <div className="dasha-planet">
            <span className="planet-label">Mahadasha</span>
            <span className="planet-name">{dasha.currentMahadasha}</span>
          </div>
          <div className="dasha-dates">
            <span className="date-range">
              {formatDate(dasha.mahadashaStart)} - {formatDate(dasha.mahadashaEnd)}
            </span>
          </div>
        </div>

        <div className="dasha-sub">
          <div className="dasha-planet">
            <span className="planet-label">Antardasha</span>
            <span className="planet-name">{dasha.currentAntardasha}</span>
          </div>
          <div className="dasha-dates">
            <span className="date-range">
              {formatDate(dasha.antardashaStart)} - {formatDate(dasha.antardashaEnd)}
            </span>
          </div>
        </div>

        <div className="dasha-impact">
          <h4>Current Period Impact</h4>
          <div className="impact-grid">
            <div className="impact-item">
              <span className="impact-label">Career</span>
              <span className={`impact-value impact-${currentImpact.career.toLowerCase()}`}>
                {currentImpact.career}
              </span>
            </div>
            <div className="impact-item">
              <span className="impact-label">Money</span>
              <span className={`impact-value impact-${currentImpact.money.toLowerCase()}`}>
                {currentImpact.money}
              </span>
            </div>
            <div className="impact-item">
              <span className="impact-label">Relationship</span>
              <span className={`impact-value impact-${currentImpact.relationship.toLowerCase()}`}>
                {currentImpact.relationship}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="upcoming-dashas">
        <h4>Upcoming Dasha Transitions</h4>
        <div className="transitions-list">
          {nextDashas.map((nextDasha, index) => (
            <div key={index} className="transition-card">
              <div className="transition-header">
                <TrendingUp size={16} className="transition-icon" />
                <span className="transition-planet">{nextDasha.planet} Mahadasha</span>
                <span className="life-shift-badge">Life Shift Expected</span>
              </div>
              <div className="transition-date">
                Starts: {formatDate(nextDasha.start)}
              </div>
              <p className="transition-preview">
                {getDashaPreview(nextDasha.planet)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {viewMode === 'expert' && (
        <div className="dasha-technical">
          <p className="technical-note">
            Balance at birth: {dasha.balanceAtBirth.toFixed(2)} years of {dasha.currentMahadasha} remaining
          </p>
        </div>
      )}
    </div>
  );
}

function getDashaPreview(planet) {
  const previews = {
    Sun: 'Period of authority, recognition, and career advancement. Focus on leadership.',
    Moon: 'Emotional growth, family matters, and public recognition. Nurturing phase.',
    Mars: 'Action-oriented period. Property, courage, and competitive success likely.',
    Mercury: 'Communication, business, and intellectual pursuits favored. Good for learning.',
    Jupiter: 'Wisdom, prosperity, and spiritual growth. Most auspicious period overall.',
    Venus: 'Love, luxury, arts, and material comforts. Relationship and wealth focus.',
    Saturn: 'Hard work, discipline, and karmic lessons. Patience brings rewards.',
    Rahu: 'Sudden changes, foreign connections, technology. Unconventional opportunities.',
    Ketu: 'Spiritual awakening, detachment, and past-life karma resolution.'
  };
  return previews[planet] || 'Significant life changes expected during this period.';
}
