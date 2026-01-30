"use client";

import { Moon } from "lucide-react";
import { useEffect } from "react";
import "./styles/VimshottriMahadasha.css";

export default function VimshottariMahaDasha({
  mahaRows,
  antarRows,
  openAntarFor,
  antarLoadingFor,
  openAntarInlineFor,
  activeMahaLord,
  dashaIQ,
}) {
  if (!mahaRows || mahaRows.length === 0) {
    return <div className="empty-state">No Maha Dasha data.</div>;
  }

  useEffect(() => {
    if (activeMahaLord && !openAntarFor) {
      openAntarInlineFor(activeMahaLord);
    }
  }, [activeMahaLord, openAntarFor, openAntarInlineFor]);

function computeAntarEvents({ antar, today = new Date() }) {
  const start = new Date(antar.start);
  const end = new Date(antar.end);
  const events = [];

  // Ongoing period
  if (today >= start && today <= end) {
    return ["Currently active"];
  }

  const sixMonthsAhead = new Date();
  sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

  const durationMonths =
    (end - start) / (1000 * 60 * 60 * 24 * 30);

  if (durationMonths <= 6) {
    events.push("High intensity");
  }

  if (start > today && start <= sixMonthsAhead) {
    events.push("Upcoming shift");
  } else if (durationMonths >= 24) {
    events.push("Stability window");
  }

  if (events.length === 0) {
    events.push("Neutral period");
  }

  return events;
}



  return (
    <div className="card my-6">
      <div className="results-header">
        <Moon style={{ color: "#ca8a04" }} />
        <h3 className="results-title">Vimshottari Maha Dasha</h3>
      </div>

      {/* ===== Horizontal Maha Dasha Rail ===== */}
      <div className="maha-rail">
        {mahaRows.map((row, idx) => {
          const startDate = new Date(row.start);
          const endDate = new Date(row.end);

          const isActive = row.lord === activeMahaLord;

          const start = startDate.toLocaleDateString("en-GB");
          const end = endDate.toLocaleDateString("en-GB");

          return (
            <div key={row.key} className="maha-card-wrapper">
              {idx !== 0 && <div className="maha-connector" />}

              <div
                className={`maha-card ${
                  isActive ? "active-maha" : "inactive-maha"
                }`}
              >
                {isActive && <span className="active-badge">Current</span>}

                {isActive && dashaIQ && (
                  <span className="maha-iq-badge">IQ {dashaIQ.iq}</span>
                )}

                <span className="maha-lord">{row.lord}</span>

                <div className="maha-dates">
                  <span>Start: {start}</span>
                  <span>End: {end}</span>
                </div>

                <button
                  className="analysis-btn"
                  onClick={() => openAntarInlineFor(row.lord)}
                >
                  Analysis
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Antar Dasha Panel (GLOBAL) ===== */}
      {openAntarFor && (
        <div className="antar-panel">
          <h4 className="antar-title">
            Antar Dasha for <strong>{openAntarFor}</strong> Maha Dasha
          </h4>

          {antarLoadingFor === openAntarFor ? (
            <div className="antar-loading">Loading…</div>
          ) : antarRows[0]?.error ? (
            <div className="antar-error">{antarRows[0].error}</div>
          ) : (
            <table className="antar-table">
              <thead>
                <tr>
                  <th>Antar Lord</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Events</th>
                </tr>
              </thead>
              <tbody>
                {antarRows.map((ad, i) => {
                  const events = computeAntarEvents({ antar: ad });

                  return (
                    <tr key={i}>
                      <td>{ad.lord}</td>
                      <td>{new Date(ad.start).toLocaleDateString("en-GB")}</td>
                      <td>{new Date(ad.end).toLocaleDateString("en-GB")}</td>

                      <td>
                        <div className="event-tags">
                          {events.map((e, idx) => (
                            <span key={idx} className="event-pill">
                              {e}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
