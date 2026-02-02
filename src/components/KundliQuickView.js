"use client";
import { useState } from "react";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";

export default function KundliQuickView({ lagna, rashi, nakshatra, chartType, planetPositions, viewMode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="kundli-quick-view">
      <div className="kundli-header">
        <Eye size={20} />
        <h3>Kundli Quick View</h3>
        <span className="legitimacy-badge">Vedic Certified</span>
      </div>

      <div className="kundli-basics">
        <div className="basic-item">
          <span className="basic-label">Lagna (Ascendant)</span>
          <span className="basic-value">{lagna}</span>
        </div>
        <div className="basic-item">
          <span className="basic-label">Rashi (Moon Sign)</span>
          <span className="basic-value">{rashi}</span>
        </div>
        <div className="basic-item">
          <span className="basic-label">Nakshatra</span>
          <span className="basic-value">{nakshatra.nakshatra} - Pada {nakshatra.pada}</span>
        </div>
        {viewMode === 'expert' && (
          <div className="basic-item">
            <span className="basic-label">Nakshatra Lord</span>
            <span className="basic-value">{nakshatra.lord}</span>
          </div>
        )}
      </div>

      <div className="kundli-charts">
        <div className="chart-container">
          <h4>Rashi Chart ({chartType === 'north' ? 'North Indian' : 'South Indian'})</h4>
          <div className={`chart chart-${chartType}`}>
            {chartType === 'north' ? <NorthIndianChart /> : <SouthIndianChart />}
          </div>
        </div>

        {expanded && (
          <div className="chart-container">
            <h4>Navamsa Chart (D-9)</h4>
            <div className={`chart chart-${chartType}`}>
              {chartType === 'north' ? <NorthIndianChart /> : <SouthIndianChart />}
            </div>
          </div>
        )}
      </div>

      <button 
        className="expand-chart-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <ChevronUp size={16} />
            Show less
          </>
        ) : (
          <>
            <ChevronDown size={16} />
            View full kundli
          </>
        )}
      </button>
    </div>
  );
}

// North Indian Chart Style
function NorthIndianChart() {
  return (
    <div className="north-chart">
      <div className="chart-diamond">
        <div className="house house-1">1<br/>Asc</div>
        <div className="house house-2">2</div>
        <div className="house house-3">3</div>
        <div className="house house-4">4</div>
        <div className="house house-5">5</div>
        <div className="house house-6">6</div>
        <div className="house house-7">7</div>
        <div className="house house-8">8</div>
        <div className="house house-9">9</div>
        <div className="house house-10">10</div>
        <div className="house house-11">11</div>
        <div className="house house-12">12</div>
      </div>
    </div>
  );
}

// South Indian Chart Style
function SouthIndianChart() {
  return (
    <div className="south-chart">
      <div className="chart-grid">
        <div className="house">12</div>
        <div className="house">1<br/>Asc</div>
        <div className="house">2</div>
        <div className="house">3</div>
        <div className="house">11</div>
        <div className="house center"></div>
        <div className="house center"></div>
        <div className="house">4</div>
        <div className="house">10</div>
        <div className="house center"></div>
        <div className="house center"></div>
        <div className="house">5</div>
        <div className="house">9</div>
        <div className="house">8</div>
        <div className="house">7</div>
        <div className="house">6</div>
      </div>
    </div>
  );
}
