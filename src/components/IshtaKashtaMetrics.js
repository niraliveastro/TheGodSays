"use client";
import { TrendingUp, TrendingDown, Target, Info } from "lucide-react";
import * as VedicAstrology from "@/lib/vedic-astrology";

export default function IshtaKashtaMetrics({ planetPositions, viewMode }) {
  // Calculate Ishta/Kashta for all planets
  const planetMetrics = Object.entries(planetPositions).map(([planet, data]) => {
    const ishtaKashta = VedicAstrology.calculateIshtaKashta(data);
    const shadbala = VedicAstrology.calculateShadbala(planet, data);
    return { planet, ...ishtaKashta, shadbala, data };
  });

  // Calculate house strengths
  const houseStrengths = [1, 7, 10, 4].map(house => ({
    house,
    strength: VedicAstrology.calculateBhavaStrength(house, planetPositions),
    name: getHouseName(house)
  }));

  return (
    <div className="ishta-kashta-metrics">
      <div className="metrics-header">
        <Target size={24} />
        <h3>Strength Metrics</h3>
        <Info 
          size={16} 
          className="info-icon" 
          title="Deep Vedic calculations - Ishta (benefic), Kashta (malefic), and Shadbala (six-fold strength)"
        />
      </div>

      <div className="metrics-intro">
        <p className="intro-text">
          This is advanced astrology, not generic AI. These calculations are based on classical Vedic texts.
        </p>
      </div>

      {/* Ishta & Kashta Phala */}
      <div className="ishta-kashta-section">
        <h4 className="subsection-title">Ishta & Kashta Phala (Benefic & Malefic Points)</h4>
        
        <div className="planet-metrics-grid">
          {planetMetrics.map(({ planet, ishta, kashta, interpretation }) => (
            <div key={planet} className="metric-card">
              <div className="metric-header">
                <span className="planet-name">{planet}</span>
                <span className={`interpretation-badge ${interpretation.toLowerCase()}`}>
                  {interpretation}
                </span>
              </div>

              <div className="phala-display">
                <div className="phala-item ishta">
                  <TrendingUp size={16} className="phala-icon" />
                  <div className="phala-details">
                    <span className="phala-label">Ishta</span>
                    <span className="phala-value">{ishta}/60</span>
                  </div>
                  <div className="phala-bar">
                    <div 
                      className="phala-fill ishta-fill"
                      style={{ width: `${(ishta / 60) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="phala-item kashta">
                  <TrendingDown size={16} className="phala-icon" />
                  <div className="phala-details">
                    <span className="phala-label">Kashta</span>
                    <span className="phala-value">{kashta}/60</span>
                  </div>
                  <div className="phala-bar">
                    <div 
                      className="phala-fill kashta-fill"
                      style={{ width: `${(kashta / 60) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {viewMode === 'expert' && (
                <div className="metric-meaning">
                  <p className="meaning-text">
                    {getIshtaKashtaMeaning(planet, ishta, kashta)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shadbala Summary */}
      {viewMode === 'expert' && (
        <div className="shadbala-section">
          <h4 className="subsection-title">Shadbala (Six-fold Strength) Summary</h4>
          
          <div className="shadbala-grid">
            {planetMetrics.slice(0, 7).map(({ planet, shadbala }) => (
              <div key={planet} className="shadbala-card">
                <h5 className="shadbala-planet">{planet}</h5>
                
                <div className="shadbala-bars">
                  <div className="shadbala-item">
                    <span className="shadbala-label">Sthana (Position)</span>
                    <div className="shadbala-bar">
                      <div 
                        className="shadbala-fill"
                        style={{ width: `${(shadbala.sthana / 150) * 100}%` }}
                      />
                    </div>
                    <span className="shadbala-value">{Math.round(shadbala.sthana)}</span>
                  </div>

                  <div className="shadbala-item">
                    <span className="shadbala-label">Dig (Directional)</span>
                    <div className="shadbala-bar">
                      <div 
                        className="shadbala-fill"
                        style={{ width: `${(shadbala.dig / 130) * 100}%` }}
                      />
                    </div>
                    <span className="shadbala-value">{Math.round(shadbala.dig)}</span>
                  </div>

                  <div className="shadbala-item">
                    <span className="shadbala-label">Kala (Temporal)</span>
                    <div className="shadbala-bar">
                      <div 
                        className="shadbala-fill"
                        style={{ width: `${(shadbala.kala / 140) * 100}%` }}
                      />
                    </div>
                    <span className="shadbala-value">{Math.round(shadbala.kala)}</span>
                  </div>

                  <div className="shadbala-total">
                    <span className="total-label">Total Shadbala:</span>
                    <span className="total-value">{Math.round(shadbala.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bhava (House) Strength */}
      <div className="bhava-strength-section">
        <h4 className="subsection-title">Bhava Bala (House Strength)</h4>
        <p className="subsection-note">Emphasized houses: 1st (Self), 7th (Partnership), 10th (Career), 4th (Home)</p>

        <div className="bhava-grid">
          {houseStrengths.map(({ house, strength, name }) => (
            <div key={house} className="bhava-card">
              <div className="bhava-header">
                <span className="bhava-number">{house}th House</span>
                <span className="bhava-name">{name}</span>
              </div>

              <div className="bhava-strength-display">
                <div className="strength-circle">
                  <svg viewBox="0 0 100 100" className="circle-svg">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="#e5e7eb" 
                      strokeWidth="10"
                    />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke={getStrengthColor(strength.strength)} 
                      strokeWidth="10"
                      strokeDasharray={`${(strength.strength / 100) * 283} 283`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="strength-value-overlay">
                    {Math.round(strength.strength)}
                  </div>
                </div>

                {viewMode === 'expert' && (
                  <div className="bhava-details">
                    <p className="bhava-lord">Lord: {strength.lord}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="metrics-footer">
        <div className="footer-note">
          <Info size={16} />
          <p>
            These metrics reflect the intrinsic strength of planets and houses in your birth chart.
            Higher Ishta and Shadbala indicate more benefic results in respective areas.
          </p>
        </div>
      </div>
    </div>
  );
}

function getHouseName(house) {
  const names = {
    1: 'Self & Personality',
    4: 'Home & Mother',
    7: 'Partnership & Marriage',
    10: 'Career & Status'
  };
  return names[house] || '';
}

function getStrengthColor(strength) {
  if (strength >= 70) return '#10b981';
  if (strength >= 50) return '#f59e0b';
  return '#ef4444';
}

function getIshtaKashtaMeaning(planet, ishta, kashta) {
  if (ishta > kashta) {
    return `${planet} is predominantly benefic in your chart. It will bring positive results in its significations and dasha periods.`;
  } else {
    return `${planet} has more malefic points. Extra care needed during ${planet} periods. Remedies can help balance this energy.`;
  }
}
