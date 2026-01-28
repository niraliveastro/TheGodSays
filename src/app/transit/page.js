"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import "./transit.css";
import { upcomingTransits as FIVE_YEARS } from "./transitData";
import {
  TbZodiacAquarius,
  TbZodiacAries,
  TbZodiacCancer,
  TbZodiacCapricorn,
  TbZodiacGemini,
  TbZodiacLeo,
  TbZodiacLibra,
  TbZodiacPisces,
  TbZodiacSagittarius,
  TbZodiacScorpio,
  TbZodiacTaurus,
  TbZodiacVirgo,
} from "react-icons/tb";

// ----------------- helpers -----------------
const parseLooseDate = (s) =>
  new Date(String(s).replace(/(\d):(\d)(?!\d)/g, "$1:$2")); // tolerates 20:6:52
const fmtDate = (s) =>
  parseLooseDate(s).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
const fmtTime = (s) =>
  parseLooseDate(s).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDuration = (startMs, endMs) => {
  const diff = Math.max(0, endMs - startMs);
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  // keep it compact
  if (d > 0) return `${d} day${d === 1 ? "" : "s"} ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// Small component with its own ticking countdown
const CountdownValue = ({ targetDateStr }) => {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!targetDateStr) {
      setText("");
      return;
    }
    const tick = () => {
      const target = parseLooseDate(targetDateStr).getTime();
      const diff = target - Date.now();
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setText(`${d} day(s) ${h}h ${m}m ${s}s`);
      } else {
        setText("IN-EFFECT");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);
  return <span className="infoValue countdown-value">{text}</span>;
};

// symbols & colors used across
const PLANET_SYMBOLS = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Rahu: "☊",
};
const PLANET_COLORS = {
  Sun: "#fbbf24",
  Moon: "#a78bfa",
  Mercury: "#10b981",
  Venus: "#ec4899",
  Mars: "#ef4444",
  Jupiter: "#3b82f6",
  Saturn: "#6366f1",
  Rahu: "#8b5cf6",
};
const ZODIAC_SYMBOLS = {
  Aries: TbZodiacAries,
  Taurus: TbZodiacTaurus,
  Gemini: TbZodiacGemini,
  Cancer: TbZodiacCancer,
  Leo: TbZodiacLeo,
  Virgo: TbZodiacVirgo,
  Libra: TbZodiacLibra,
  Scorpio: TbZodiacScorpio,
  Sagittarius: TbZodiacSagittarius,
  Capricorn: TbZodiacCapricorn,
  Aquarius: TbZodiacAquarius,
  Pisces: TbZodiacPisces,
};

// get next future item in a list
const getNextFutureTransit = (list) => {
  const items = (list || []).map((t) => ({
    ...t,
    _time: parseLooseDate(t.date).getTime(),
  }));
  const now = Date.now();
  const next = items.find((t) => t._time >= now);
  if (next) return next;
  return items.length ? items[items.length - 1] : null;
};

const buildCurrentTransitsFromFiveYears = (upcomingByPlanet) => {
  const now = Date.now();
  const cards = [];

  Object.entries(upcomingByPlanet).forEach(([planet, list]) => {
    if (!Array.isArray(list) || list.length < 2) return;

    // Parse & sort
    const items = list
      .map((t) => ({ ...t, _time: parseLooseDate(t.date).getTime() }))
      .sort((a, b) => a._time - b._time);

    // Find the correct pair (startItem, endItem)
    let startItem = null;
    let endItem = null;

    // ✅ Case 1: we are before the very first entry
    if (now < items[0]._time) {
      startItem = items[0];
      endItem = items[1];
    } else {
      // ✅ Case 2: find the nearest interval that spans 'now'
      for (let i = 0; i < items.length - 1; i++) {
        const a = items[i],
          b = items[i + 1];
        if (a._time <= now && now < b._time) {
          startItem = a;
          endItem = b;
          break;
        }
      }

      // ✅ Case 3: if still none found (we are beyond last entry)
      if (!startItem) {
        // choose the *last consecutive pair*, not far apart
        startItem = items[items.length - 2];
        endItem = items[items.length - 1];
      }
    }

    // Compute human-readable duration
    const duration = fmtDuration(startItem._time, endItem._time);

    cards.push({
      planet,
      symbol: PLANET_SYMBOLS[planet] || "✦",
      currentSign: startItem.sign,
      startDate: new Date(startItem._time).toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      endDate: new Date(endItem._time).toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      duration,
      nextTransit: { sign: endItem.sign, date: endItem.date },
    });
  });

  // keep order consistent
  const ORDER = [
    "Moon",
    "Mercury",
    "Venus",
    "Sun",
    "Mars",
    "Jupiter",
    "Saturn",
    "Rahu",
  ];
  cards.sort((a, b) => ORDER.indexOf(a.planet) - ORDER.indexOf(b.planet));
  return cards;
};

// random “flavor” generators, left as-is
const generateOverallEnergy = () => {
  const energies = [
    {
      type: "Transformative",
      description: "Major life changes and deep personal growth",
      color: "purple",
    },
    {
      type: "Expansive",
      description: "Growth, opportunities, and new horizons opening",
      color: "green",
    },
    {
      type: "Challenging",
      description: "Tests, obstacles requiring strength and patience",
      color: "red",
    },
    {
      type: "Harmonious",
      description: "Flow, ease, and natural progression",
      color: "blue",
    },
    {
      type: "Dynamic",
      description: "High energy, action, and rapid developments",
      color: "orange",
    },
    {
      type: "Reflective",
      description: "Introspection, review, and inner work",
      color: "indigo",
    },
  ];
  return energies[Math.floor(Math.random() * energies.length)];
};
const getTimeframe = () => {
  const frames = [
    "Next 30 days",
    "Next 3 months",
    "Next 6 months",
    "Current phase (2-3 weeks)",
  ];
  return frames[Math.floor(Math.random() * frames.length)];
};

export default function TransitPage() {
  const [result, setResult] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState("Mercury");
  const [selectedRange, setSelectedRange] = useState("6m"); // default filter: next 6 months

  // Filter transits for selected planet & timeframe
  const filteredTransits = useMemo(() => {
    if (!result) return [];
    const all = result.upcomingTransits[selectedPlanet] || [];
    if (all.length <= 1) return [];

    const now = Date.now();
    let limit;
    if (selectedRange === "6m") {
      limit = now + 1000 * 60 * 60 * 24 * 30 * 6; // 6 months
    } else {
      limit = now + 1000 * 60 * 60 * 24 * 365 * 5; // 5 years
    }

    // skip current transit (index 0) and filter by time range
    return all
      .slice(1)
      .filter((t) => parseLooseDate(t.date).getTime() <= limit);
  }, [selectedRange, selectedPlanet, result]);

  // ---------- data assembly (from your 5-year file) ----------
  useEffect(() => {
    const currentTransits = buildCurrentTransitsFromFiveYears(FIVE_YEARS);
    const analysisResult = {
      currentTransits,
      upcomingTransits: FIVE_YEARS,
      overallEnergy: generateOverallEnergy(),
      timeframe: getTimeframe(),
      calculatedAt: new Date().toISOString(),
    };
    setResult(analysisResult);
  }, []);

  // “Next Immediate” top two cards across all planets
  const nextTwo = useMemo(() => {
    if (!result) return [];
    const now = Date.now();
    const picks = [];
    Object.entries(result.upcomingTransits).forEach(([planet, list]) => {
      if (!Array.isArray(list)) return;
      const next = list
        .map((t) => ({ ...t, _time: parseLooseDate(t.date).getTime() }))
        .find((t) => t._time >= now);
      if (next)
        picks.push({
          planet,
          sign: next.sign,
          date: next.date,
          _time: next._time,
        });
    });
    picks.sort((a, b) => a._time - b._time);
    return picks.slice(0, 2);
  }, [result]);

  return (
    <div className="transit-container" style={{ paddingTop: '0.01rem', marginTop: '0.9rem' }}>
      {/* Orbs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      <div className="transit-content">
        <header className="header">
          <h1 className="title mx-auto">Planetary Transit</h1>
          <p className="subtitle">
            Current planetary movements and their cosmic influences
          </p>
        </header>

        {result && (
          <main>
            {/* Next Immediate Transits */}
            <section className="transit-section">
              <h2 className="section-title">Next Immediate Transits</h2>
              <div className="countdown-grid-cards">
                {nextTwo.map((item, idx) => {
                  const color = PLANET_COLORS[item.planet] || "#d4af37";
                  const current = result.currentTransits.find(
                    (t) => t.planet === item.planet
                  );
                  return (
                    <div
                      key={`${item.planet}-${idx}`}
                      className="transit-card countdown-card-new current"
                    >
                      <div
                        className="accent"
                        style={{
                          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                        }}
                      ></div>

                      <div className="cardBody">
                        <div
                          className="iconBox"
                          style={{
                            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                          }}
                        >
                          <span style={{ fontSize: "2rem" }}>
                            {(() => {
                              const Icon = ZODIAC_SYMBOLS[item.sign];
                              return Icon ? <Icon /> : "✦";
                            })()}
                          </span>
                        </div>
                        <div className="titleGroup" style={{ flex: 1 }}>
                          <h3>
                            {item.planet} enters {item.sign}
                          </h3>
                          <p className="desc">Upcoming transition</p>
                          <div className="liveBadge">
                            <div className="pulseDot"></div>
                            UPCOMING
                          </div>
                        </div>
                      </div>

                      <div className="cardBody info-section">
                        <div className="infoRow">
                          <span className="infoLabel">Current Sign</span>
                          <span className="infoValue">
                            {current?.currentSign || "—"}
                          </span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Next Transit</span>
                          <span className="infoValue">
                            {fmtDate(item.date)} • {fmtTime(item.date)}
                          </span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Countdown</span>
                          <CountdownValue targetDateStr={item.date} />
                        </div>
                      </div>

                      <div className="footer">Entering {item.sign}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Current Planetary Transits (dynamic from 5-year file) */}
            <section className="transit-section">
              <h2 className="section-title">Curent Planetary Transits</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                {result.currentTransits.map((transit, index) => {
                  const planetColor =
                    PLANET_COLORS[transit.planet] || "#d4af37";
                  return (
                    <div
                      key={index}
                      className="transit-card current-transit-card"
                    >
                      <div
                        className="accent"
                        style={{
                          background: `linear-gradient(90deg, ${planetColor}, ${planetColor}dd)`,
                        }}
                      ></div>
                      <div className="cardBody">
                        <div
                          className="iconBox"
                          style={{
                            background: `linear-gradient(135deg, ${planetColor}, ${planetColor}cc)`,
                          }}
                        >
                          <span style={{ fontSize: "2rem" }}>
                            {transit.symbol}
                          </span>
                        </div>
                        <div className="titleGroup" style={{ flex: 1 }}>
                          <h3>
                            {transit.planet} in {transit.currentSign}
                          </h3>
                        </div>
                      </div>
                      <div className="cardBody info-section">
                        <div className="infoRow">
                          <span className="infoLabel">Duration</span>
                          <span className="infoValue">{transit.duration}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Started</span>
                          <span className="infoValue">{transit.startDate}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Ends</span>
                          <span className="infoValue">{transit.endDate}</span>
                        </div>
                      </div>
                      <div className="footer">
                        Next: {transit.nextTransit?.sign || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Upcoming Transits */}
            <section className="transit-section">
              <h2 className="section-title">Upcoming Planetary Transits</h2>

              <div className="transit-table-card">
                <div className="planet-tabs-container">
                  <div className="planet-tabs">
                    {Object.keys(result.upcomingTransits).map((planet) => (
                      <button
                        key={planet}
                        onClick={() => setSelectedPlanet(planet)}
                        className={`planet-tab ${
                          selectedPlanet === planet ? "active" : ""
                        }`}
                      >
                        {planet}
                      </button>
                    ))}
                  </div>

                  {/* 🔹 Time Filter Buttons (side-by-side) */}
                  <div
                    className="timeframe-filters"
                    style={{
                      marginTop: "1rem",
                      display: "flex",
                      gap: "1rem",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      className={`filter-btn ${
                        selectedRange === "6m" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRange("6m")}
                    >
                      Next 6 Months
                    </button>
                    <button
                      className={`filter-btn ${
                        selectedRange === "5y" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRange("5y")}
                    >
                      Next 5 Years
                    </button>
                  </div>
                </div>

                <div className="upcoming-transits-section">
                  <h3 className="upcoming-section-title">
                    {selectedPlanet} Transits Schedule (
                    {selectedRange === "6m" ? "Next 6 Months" : "Next 5 Years"})
                  </h3>

                  {filteredTransits.length > 0 ? (
                    <div className="upcoming-transit-grid">
                      {filteredTransits.map((transit, index) => {
                        const planetColor =
                          PLANET_COLORS[selectedPlanet] || "#d4af37";
                        return (
                          <div
                            key={index}
                            className="transit-card upcoming-card"
                          >
                            <div
                              className="accent"
                              style={{
                                background: `linear-gradient(90deg, ${planetColor}, ${planetColor}dd)`,
                              }}
                            ></div>
                            <div className="cardBody">
                              <div
                                className="iconBox"
                                style={{
                                  background: `linear-gradient(135deg, ${planetColor}, ${planetColor}cc)`,
                                }}
                              >
                                <span style={{ fontSize: "1.5rem" }}>
                                  {(() => {
                                    const Icon = ZODIAC_SYMBOLS[transit.sign];
                                    return Icon ? <Icon /> : "✦";
                                  })()}
                                </span>
                              </div>
                              <div className="titleGroup" style={{ flex: 1 }}>
                                <h3>{transit.sign}</h3>
                                <p className="desc">
                                  {selectedPlanet} enters {transit.sign}
                                </p>
                              </div>
                            </div>
                            <div className="cardBody info-section">
                              <div className="infoRow">
                                <span className="infoLabel">Date</span>
                                <span className="infoValue">
                                  {fmtDate(transit.date)}
                                </span>
                              </div>
                              <div className="infoRow">
                                <span className="infoLabel">Time</span>
                                <span className="infoValue">
                                  {fmtTime(transit.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-card">
                        <span className="empty-state-text">
                          No upcoming transits within this timeframe.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        )}
      </div>

{/* Explanation Card */}
<div
  style={{
    marginTop: "2rem",
    width: "100%",
    maxWidth: "90rem",
    marginLeft: "auto",
    marginRight: "auto",
  }}
>
  <div
    className="card backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-xl border"
    style={{
      background: "#ffffff",
      borderColor: "#eaeaea",
      maxWidth: "100%",
      boxShadow:
        "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "1.5rem",
        borderBottom: "2px solid rgba(212, 175, 55, 0.2)",
        marginBottom: "1.5rem",
      }}
    >
      <h2
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#1f2937",
          margin: 0,
        }}
      >
        Understanding Planetary Transits
      </h2>
    </div>

    <div style={{ padding: 0 }}>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#374151",
          fontStyle: "normal",
          marginBottom: 0,
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.6,
        }}
      >
        This page tracks <strong>real-time planetary movements</strong> and
        upcoming transitions as planets shift from one zodiac sign to another.
        Each transit reflects a change in cosmic tone, influencing collective
        themes such as mindset, action, growth, discipline, and emotional flow.
        <br />
        <br />
        <strong>Current Transits</strong> show where each planet is positioned
        right now and how long it will remain there.
        <strong> Next Immediate Transits</strong> highlight the closest upcoming
        sign changes with live countdowns.
        <strong> Upcoming Transits</strong> allow you to explore future planetary
        movements over the next six months or five years.
        <br />
        <br />
        These insights are calculated using precise astronomical timing and
        traditional astrological frameworks, helping you understand
        <strong> when energies shift</strong> rather than predicting fixed
        outcomes. Think of this as a cosmic weather report, revealing cycles,
        momentum, and transitions unfolding in the sky.
      </p>
    </div>
  </div>
</div>
    </div>
  );
}
