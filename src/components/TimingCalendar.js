"use client";
import { Calendar, Lock, Star, AlertTriangle } from "lucide-react";

export default function TimingCalendar({ onUnlock, isLocked = true }) {
  const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  
  // Mock favorable and caution days
  const favorableDays = [5, 12, 18, 24, 28];
  const cautionDays = [3, 10, 17, 23];

  return (
    <div className="timing-calendar">
      <div className="calendar-header">
        <Calendar size={24} />
        <h3>Timing Calendar - {currentMonth}</h3>
      </div>

      <div className={`calendar-content ${isLocked ? 'locked-content' : ''}`}>
        <div className="calendar-grid">
          <div className="calendar-section">
            <h4>
              <Star size={16} className="favorable-icon" />
              Top 5 Favorable Days
            </h4>
            <div className="days-list favorable-days">
              {favorableDays.map((day, index) => (
                <div key={index} className="day-item blurred">
                  <span className="day-number">{day}</span>
                  <span className="day-activity">Best for: Important decisions</span>
                </div>
              ))}
            </div>
          </div>

          <div className="calendar-section">
            <h4>
              <AlertTriangle size={16} className="caution-icon" />
              Caution Windows
            </h4>
            <div className="days-list caution-days">
              {cautionDays.map((day, index) => (
                <div key={index} className="day-item blurred">
                  <span className="day-number">{day}</span>
                  <span className="day-activity">Avoid: Major contracts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="lock-overlay">
            <div className="lock-content">
              <Lock size={40} className="lock-icon" />
              <h3>Exact Dates Locked</h3>
              <p>Unlock precise favorable and cautionary dates for this month</p>
              
              <div className="unlock-options">
                <div className="unlock-option">
                  <div className="option-icon">✓</div>
                  <div className="option-text">
                    <strong>Verify Birth Time</strong>
                    <span>Get 95% accuracy on timing</span>
                  </div>
                  <button className="unlock-btn" onClick={() => onUnlock('birthTime')}>
                    Verify Now
                  </button>
                </div>

                <div className="unlock-option">
                  <div className="option-icon">✓</div>
                  <div className="option-text">
                    <strong>Talk to Astrologer</strong>
                    <span>Expert timing consultation</span>
                  </div>
                  <button className="unlock-btn" onClick={() => onUnlock('astrologer')}>
                    Book Call
                  </button>
                </div>

                <div className="unlock-option">
                  <div className="option-icon">✓</div>
                  <div className="option-text">
                    <strong>Premium Plan</strong>
                    <span>Full year calendar access</span>
                  </div>
                  <button className="unlock-btn premium" onClick={() => onUnlock('premium')}>
                    View Plans
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="calendar-benefits">
        <h4>What You'll Get:</h4>
        <ul className="benefits-list">
          <li>✓ Daily favorable time windows</li>
          <li>✓ Best days for career moves</li>
          <li>✓ Relationship timing guidance</li>
          <li>✓ Financial transaction dates</li>
          <li>✓ Travel and event planning</li>
        </ul>
      </div>
    </div>
  );
}
