"use client";
import { Calendar, Lock, Star, TrendingUp } from "lucide-react";

export default function MarriageTimingSnapshot({ onUnlock, isLocked = true }) {
  const nextWindow = {
    startMonth: "April 2026",
    endMonth: "June 2026",
    favorableDates: [12, 18, 24, 28],
    reasoning: "Jupiter transit favorable + benefic dasha period"
  };

  return (
    <div className="marriage-timing-snapshot">
      <div className="timing-header">
        <Calendar size={24} />
        <h3>Marriage Timing Forecast</h3>
      </div>

      <div className={`timing-content ${isLocked ? 'locked-view' : ''}`}>
        <div className="next-window-card">
          <div className="window-header">
            <Star size={20} className="star-icon" />
            <span>Next Favorable Window</span>
          </div>

          <div className="window-period">
            <TrendingUp size={18} className="period-icon" />
            <span className="period-text">{nextWindow.startMonth} - {nextWindow.endMonth}</span>
          </div>

          <p className="window-reasoning">
            {nextWindow.reasoning}
          </p>

          {isLocked ? (
            <div className="dates-locked-section">
              <div className="blurred-dates">
                <div className="date-item">12</div>
                <div className="date-item">18</div>
                <div className="date-item">24</div>
                <div className="date-item">28</div>
              </div>

              <div className="lock-overlay">
                <Lock size={32} />
                <h4>Exact Dates Locked</h4>
                <p>Get precise muhurat dates for your marriage ceremony</p>
                
                <div className="unlock-options">
                  <button className="unlock-btn primary" onClick={() => onUnlock('astrologer')}>
                    <Calendar size={16} />
                    Talk to Astrologer
                  </button>
                  <button className="unlock-btn secondary" onClick={() => onUnlock('premium')}>
                    <Star size={16} />
                    Premium Report
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="dates-unlocked-section">
              <h4>Auspicious Dates:</h4>
              <div className="favorable-dates-grid">
                {nextWindow.favorableDates.map((date, index) => (
                  <div key={index} className="date-card">
                    <span className="date-number">{date}</span>
                    <span className="date-month">{nextWindow.startMonth.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="timing-factors">
          <h4>Considered Factors:</h4>
          <ul className="factors-list">
            <li>✓ Jupiter & Venus transits</li>
            <li>✓ Both partners' dasha periods</li>
            <li>✓ 7th house activation</li>
            <li>✓ Rahu-Ketu axis position</li>
            <li>✓ Auspicious nakshatras</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
