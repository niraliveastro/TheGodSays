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


          /* ---------- ACCORDION SECTION ---------- */
      const Section = ({ title, content, children }) => {
        const [open, setOpen] = useState(false);
    
        return (
          <div
            style={{
              marginBottom: "1.25rem",
              border: "1px solid rgba(212, 175, 55, 0.25)",
              borderRadius: "1rem",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9))",
              overflow: "hidden",
              transition: "all 0.3s ease",
            }}
          >
            {/* HEADER */}
            <button
              onClick={() => setOpen(!open)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "1rem 1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <h2
  className="
    font-serif
    text-base sm:text-lg
    font-medium
    text-gray-800
    m-0
  "
  style={{
    fontFamily: "'Georgia','Times New Roman',serif",
  }}
>
  {title}
</h2>

    
              <span
                style={{
                  fontSize: "1.25rem",
                  color: "#b45309",
                  transform: open ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                }}
              >
                +
              </span>
            </button>
    
            {/* CONTENT */}
            {open && (
              <div
                style={{
                  padding: "0 1.25rem 1.25rem",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#374151",
                    lineHeight: 1.7,
                    marginBottom: "0.75rem",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {children}
                </p>
    
                <ul
                  style={{
                    paddingLeft: "1.25rem",
                    fontSize: "0.85rem",
                    color: "#374151",
                    lineHeight: 1.8,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {content.map((item, i) => (
                    <li key={i}>✔ {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      };  


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

    <Section
  title="What Are Planetary Transits"
  content={[
    "Movement of planets through zodiac signs",
    "Activation of different life themes",
    "Gradual shifts rather than sudden events",
    "Short-term and long-term planetary cycles",
  ]}
>
  Planetary transits occur as planets move continuously through the zodiac.
  Each planet represents a specific type of energy, such as action, discipline,
  communication, growth, or reflection, and its movement changes how that energy
  is expressed over time.

  Transits do not create events on their own. Instead, they describe changing
  conditions and phases, helping you understand when certain themes become more
  active or subdued.
</Section>
<Section
  title="How Transits Affect You Personally"
  content={[
    "Your birth chart (kundli) placements",
    "Running dasha and sub-dasha periods",
    "Strength and condition of the planet",
  ]}
>
  While planetary movements are the same for everyone, their impact differs
  from person to person. The actual effect of a transit depends on how the
  moving planet interacts with your individual birth chart.

  This is why a transit that feels challenging for one person may feel neutral
  or even supportive for another. Personal context matters more than the
  transit itself.
</Section>
<Section
  title="Understanding Current Planetary Transits"
  content={[
    "Where each planet is positioned now",
    "How long the planet stays in the sign",
    "Overall duration of the current phase",
  ]}
>
  The Current Planetary Transits section shows the present position of each
  planet and the time span for which it remains there. This helps you recognize
  the ongoing background influences shaping thoughts, emotions, and actions.

  Think of these as the dominant themes operating in the present moment rather
  than immediate triggers for change.
</Section>
<Section
  title="Next Immediate Transits & Countdown"
  content={[
    "Closest upcoming sign changes",
    "Live countdown until transition",
    "Awareness of approaching shifts",
  ]}
>
  Next Immediate Transits highlight the planetary sign changes that are about to
  occur soon. The live countdown shows exactly when a planet moves into a new
  sign, marking a subtle shift in tone.

  These transitions are useful for staying mentally prepared rather than
  reacting unexpectedly when energy patterns begin to change.
</Section>
<Section
  title="Exploring Upcoming Transits Over Time"
  content={[
    "Six-month and five-year views",
    "Long-term planetary cycles",
    "Pattern recognition over time",
  ]}
>
  The Upcoming Transits section allows you to explore planetary movements across
  different time ranges. Shorter views help with near-term awareness, while
  longer timelines reveal broader cycles influencing life direction.

  This is especially useful for understanding repetition, pacing, and periods
  of gradual buildup rather than focusing on isolated dates.
</Section>
<Section
  title="Using Transit Awareness Practically"
  content={[
    "Better timing for important decisions",
    "Reduced anxiety during intense phases",
    "Improved long-term planning",
  ]}
>
  Transit awareness is not about prediction but preparation. By understanding
  when energies shift, you can plan actions more consciously and avoid forcing
  outcomes during naturally resistant phases.

  Used correctly, transits act as a timing tool that supports clarity,
  patience, and better decision-making.
</Section>

  </div>
</div>
    </div>
  );
}
