"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export default function PlanetPlacementTable({ planetPositions, viewMode }) {
  const [expanded, setExpanded] = useState(false);

  const planets = Object.entries(planetPositions);

  return (
    <div className="planet-placement-table">
      <div className="table-header">
        <h3>Planet Placement</h3>
        <button 
          className="expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="table-container">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Sign</th>
              <th>House</th>
              <th>
                Strength
                <Info size={12} className="info-icon" title="Overall planetary strength" />
              </th>
              {expanded && (
                <>
                  <th>Degree</th>
                  <th>Nakshatra</th>
                  <th>Pada</th>
                  <th>Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {planets.map(([planet, data]) => (
              <tr key={planet} className="planet-row">
                <td className="planet-name">
                  <span className={`planet-icon planet-${planet.toLowerCase()}`}>
                    {getPlanetSymbol(planet)}
                  </span>
                  {planet}
                </td>
                <td className="planet-sign">{data.sign}</td>
                <td className="planet-house">{data.house}</td>
                <td className="planet-strength">
                  <div className="strength-bar-mini">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${data.strength}%`,
                        backgroundColor: getStrengthColor(data.strength)
                      }}
                    />
                  </div>
                  <span className="strength-value">{Math.round(data.strength)}</span>
                </td>
                {expanded && (
                  <>
                    <td className="planet-degree">{data.degree.toFixed(2)}°</td>
                    <td className="planet-nakshatra">{data.nakshatra}</td>
                    <td className="planet-pada">{data.pada}</td>
                    <td className="planet-status">
                      <div className="status-badges">
                        {data.retrograde && <span className="badge badge-retro">R</span>}
                        {data.combust && <span className="badge badge-combust">C</span>}
                        {!data.retrograde && !data.combust && <span className="badge badge-normal">D</span>}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewMode === 'expert' && expanded && (
        <div className="table-legend">
          <div className="legend-item">
            <span className="badge badge-retro">R</span>
            <span>Retrograde</span>
          </div>
          <div className="legend-item">
            <span className="badge badge-combust">C</span>
            <span>Combust</span>
          </div>
          <div className="legend-item">
            <span className="badge badge-normal">D</span>
            <span>Direct</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getPlanetSymbol(planet) {
  const symbols = {
    Sun: '☉',
    Moon: '☽',
    Mars: '♂',
    Mercury: '☿',
    Jupiter: '♃',
    Venus: '♀',
    Saturn: '♄',
    Rahu: '☊',
    Ketu: '☋'
  };
  return symbols[planet] || '●';
}

function getStrengthColor(strength) {
  if (strength >= 70) return '#10b981';
  if (strength >= 50) return '#f59e0b';
  return '#ef4444';
}
