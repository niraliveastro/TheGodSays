"use client";
import { Shield, AlertCircle, Star, CheckCircle, XCircle, MinusCircle } from "lucide-react";

export default function DoshaYogaSummary({ manglik, kaalSarp, yogas, viewMode, onRemedyClick }) {
  return (
    <div className="dosha-yoga-summary">
      <div className="section-header">
        <Shield size={24} />
        <h3>Dosha & Yoga Analysis</h3>
      </div>

      {/* Doshas Section */}
      <div className="doshas-section">
        <h4 className="subsection-title">
          <AlertCircle size={18} />
          Doshas (Afflictions)
        </h4>

        <div className="dosha-grid">
          {/* Manglik Dosha */}
          <div className={`dosha-card ${manglik.present ? 'active' : 'inactive'}`}>
            <div className="dosha-header">
              <span className="dosha-name">Manglik Dosha</span>
              <span className={`dosha-badge badge-${manglik.present ? manglik.strength.toLowerCase() : 'none'}`}>
                {manglik.present ? manglik.strength : 'Not Present'}
              </span>
            </div>
            
            {manglik.present && (
              <>
                <div className="dosha-details">
                  <p className="dosha-effect">
                    Mars placement affects marriage timing and partner compatibility
                  </p>
                  {viewMode === 'expert' && (
                    <p className="dosha-technical">
                      Mars in house {manglik.affectedHouses.join(', ')}
                    </p>
                  )}
                </div>

                {manglik.cancellation.cancelled && (
                  <div className="cancellation-note">
                    <CheckCircle size={14} className="cancel-icon" />
                    <span>Partially Cancelled: {manglik.cancellation.reason}</span>
                  </div>
                )}

                <button className="remedy-btn" onClick={() => onRemedyClick('manglik')}>
                  View Remedies →
                </button>
              </>
            )}

            {!manglik.present && (
              <div className="dosha-absent">
                <CheckCircle size={20} className="absent-icon" />
                <span>No Manglik Dosha detected</span>
              </div>
            )}
          </div>

          {/* Kaal Sarp Dosha */}
          <div className={`dosha-card ${kaalSarp.present ? 'active' : 'inactive'}`}>
            <div className="dosha-header">
              <span className="dosha-name">Kaal Sarp Dosha</span>
              <span className={`dosha-badge badge-${kaalSarp.present ? kaalSarp.strength.toLowerCase() : 'none'}`}>
                {kaalSarp.present ? kaalSarp.strength : 'Not Present'}
              </span>
            </div>
            
            {kaalSarp.present && (
              <>
                <div className="dosha-details">
                  <p className="dosha-effect">
                    Type: {kaalSarp.type} - Affects life stability and progress
                  </p>
                  {viewMode === 'expert' && (
                    <p className="dosha-technical">
                      All planets hemmed between Rahu and Ketu axis
                    </p>
                  )}
                </div>

                {kaalSarp.cancellation?.cancelled && (
                  <div className="cancellation-note">
                    <CheckCircle size={14} className="cancel-icon" />
                    <span>Partially Cancelled: {kaalSarp.cancellation.reason}</span>
                  </div>
                )}

                <button className="remedy-btn" onClick={() => onRemedyClick('kaalsarp')}>
                  View Remedies →
                </button>
              </>
            )}

            {!kaalSarp.present && (
              <div className="dosha-absent">
                <CheckCircle size={20} className="absent-icon" />
                <span>No Kaal Sarp Dosha detected</span>
              </div>
            )}
          </div>

          {/* Pitra Dosha */}
          <div className="dosha-card inactive">
            <div className="dosha-header">
              <span className="dosha-name">Pitra Dosha</span>
              <span className="dosha-badge badge-none">Not Present</span>
            </div>
            <div className="dosha-absent">
              <CheckCircle size={20} className="absent-icon" />
              <span>No ancestral afflictions</span>
            </div>
          </div>

          {/* Kemadrum Dosha */}
          <div className="dosha-card inactive">
            <div className="dosha-header">
              <span className="dosha-name">Kemadrum Dosha</span>
              <span className="dosha-badge badge-none">Not Present</span>
            </div>
            <div className="dosha-absent">
              <CheckCircle size={20} className="absent-icon" />
              <span>Moon is well supported</span>
            </div>
          </div>
        </div>
      </div>

      {/* Yogas Section */}
      <div className="yogas-section">
        <h4 className="subsection-title">
          <Star size={18} />
          Beneficial Yogas
        </h4>

        <div className="yoga-grid">
          {yogas.map((yoga, index) => (
            <div key={index} className={`yoga-card yoga-${yoga.strength.toLowerCase()}`}>
              <div className="yoga-header">
                <Star size={20} className="yoga-star" />
                <span className="yoga-name">{yoga.name}</span>
              </div>

              <div className="yoga-strength-badge">
                {yoga.strength === 'Strong' && <CheckCircle size={14} />}
                {yoga.strength === 'Moderate' && <MinusCircle size={14} />}
                {yoga.strength === 'Partial' && <MinusCircle size={14} />}
                <span>{yoga.strength}</span>
              </div>

              <p className="yoga-effect">{yoga.effect}</p>

              <div className="yoga-status">
                {yoga.active ? (
                  <span className="status-active">
                    <CheckCircle size={14} />
                    Currently Active
                  </span>
                ) : (
                  <span className="status-inactive">
                    <XCircle size={14} />
                    Inactive
                  </span>
                )}
              </div>

              {viewMode === 'expert' && (
                <button className="yoga-details-btn" onClick={() => onRemedyClick(`yoga-${index}`)}>
                  Strengthen this yoga →
                </button>
              )}
            </div>
          ))}

          {yogas.length === 0 && (
            <div className="no-yogas">
              <MinusCircle size={24} />
              <p>No major Raj Yogas detected in current period</p>
              <p className="note">Minor yogas may still provide benefits</p>
            </div>
          )}
        </div>
      </div>

      <div className="summary-footer">
        <div className="summary-card">
          <h4>Overall Balance</h4>
          <p>
            Your chart shows {yogas.length} beneficial yoga(s) and {(manglik.present ? 1 : 0) + (kaalSarp.present ? 1 : 0)} active dosha(s).
            {yogas.length > 0 && ' Yogas provide positive energy that can overcome doshas with proper guidance.'}
          </p>
        </div>
      </div>
    </div>
  );
}
