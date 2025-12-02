"use client";

import { useState, useEffect, useMemo } from "react";
import Chat from "@/components/Chat";
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api";
import {
  parseDateString,
  parseTimeString,
  formatDate,
  formatTime,
  formatDateForDisplay,
  buildAstrologyPayload,
} from "@/lib/dateUtils";
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Loader2,
  Sun,
  Orbit,
  Moon,
  Cpu,
} from "lucide-react";
import "../app/predictions/predictions.css";
import "./FamilyMemberPredictions.css";

export default function FamilyMemberPredictions({ member, onClose }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(0);
  const [openAntarFor, setOpenAntarFor] = useState(null);
  const [antarLoadingFor, setAntarLoadingFor] = useState(null);
  const [antarRows, setAntarRows] = useState([]);

  const safeParse = (v) => {
    try {
      return typeof v === "string" ? JSON.parse(v) : v;
    } catch {
      return v;
    }
  };

  // Shadbala rows computation - EXACT same as predictions page
  const shadbalaRows = useMemo(() => {
    if (!result?.shadbala) return [];
    let sb = result.shadbala;
    if (Array.isArray(sb)) {
      const merged = sb.reduce(
        (acc, it) => (typeof it === "object" ? { ...acc, ...it } : acc),
        {}
      );
      sb = merged;
    }
    const maybePlanets = sb.planets || sb || {};
    const keys = Object.keys(maybePlanets);
    return keys
      .filter((k) => typeof maybePlanets[k] === "object")
      .map((k) => {
        const p = maybePlanets[k];
        const pct =
          p.percentage_strength ??
          p.percentage ??
          p.percent ??
          p.shadbala_percent ??
          p.strength_percent;
        const ishta =
          p.ishta_phala ?? p.ishta ?? p.ishta_bala ?? p.ishta_percent;
        const kashta =
          p.kashta_phala ?? p.kashta ?? p.kashta_bala ?? p.kashta_percent;
        const retro = p.retrograde || p.is_retro;
        return { name: p.name || k, percent: pct, ishta, kashta, retro };
      })
      .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
  }, [result]);

  // Placements computation - EXACT same as predictions page
  const placements = useMemo(() => {
    const pl = result?.planets;
    if (!pl) return [];
    const SIGN_NAMES = [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ];
    if (typeof pl === "object" && !Array.isArray(pl)) {
      return Object.entries(pl).map(([name, v]) => {
        const signNum =
          v.current_sign != null ? Number(v.current_sign) : undefined;
        const currentSign = signNum
          ? `${SIGN_NAMES[signNum - 1]} (${signNum})`
          : v.zodiac_sign_name || v.sign_name || v.sign;
        return {
          name,
          currentSign,
          house: v.house_number,
          nakshatra: v.nakshatra_name,
          pada: v.nakshatra_pada,
          retro:
            v.isRetro === "true" ||
            v.retrograde === true ||
            v.is_retro === true,
          fullDegree: v.fullDegree ?? v.longitude,
          normDegree: v.normDegree,
        };
      });
    }
    const arr = Array.isArray(pl)
      ? pl
      : pl.planets || pl.planet_positions || Object.values(pl || {});
    return arr
      .filter((p) => (p.name || p.planet)?.toLowerCase() !== "ascendant")
      .map((p) => {
        const signNum =
          p.current_sign != null ? Number(p.current_sign) : undefined;
        const currentSign = signNum
          ? `${SIGN_NAMES[signNum - 1]} (${signNum})`
          : p.sign || p.rashi || p.sign_name;
        return {
          name: p.name || p.planet,
          currentSign,
          house: p.house || p.house_number,
          nakshatra: p.nakshatra_name,
          pada: p.nakshatra_pada,
          retro: p.retrograde || p.is_retro || p.isRetro === "true",
          fullDegree: p.fullDegree ?? p.longitude,
          normDegree: p.normDegree,
        };
      });
  }, [result]);

  // Maha rows computation - EXACT same as predictions page
  const mahaRows = useMemo(() => {
    if (!result?.maha) return [];
    let m = result.maha;
    if (Array.isArray(m)) {
      return m.map((it, i) => ({
        key: it.key || i,
        lord: it.Lord || it.lord || it.planet || it.name,
        start: it.start_time || it.start,
        end: it.end_time || it.end,
      }));
    }
    return Object.entries(m).map(([k, v]) => ({
      key: k,
      lord: v.Lord || v.lord || k,
      start: v.start_time || v.start,
      end: v.end_time || v.end,
    }));
  }, [result]);

  // Current Dasha chain - EXACT same as predictions page
  const currentDashaChain = useMemo(() => {
    if (!result?.vimsottari) return "";
    const c = result.vimsottari.current || result.vimsottari;
    const md = c.md || c.mahadasha || c.mahadasha_name || c.maha_dasha;
    const ad = c.ad || c.antardasha || c.antardasha_name || c.antar_dasha;
    const pr =
      c.pr || c.pratyantardasha || c.pratyantardasha_name || c.pratyantar_dasha;
    return [md, ad, pr].filter(Boolean).join(" > ");
  }, [result]);

  useEffect(() => {
    if (member) {
      fetchPredictions();
    }
  }, [member]);

  const fetchPredictions = async () => {
    setLoading(true);
    setError("");

    try {
      // Parse date and time using utility functions
      const { year: Y, month: M, date: D } = parseDateString(member.dob);
      const { hours: H, minutes: Min, seconds: S } = parseTimeString(member.time);

      // Geocode the place - EXACT same as predictions page
      const geo = await geocodePlace(member.place);
      if (!geo) {
        throw new Error(
          "Unable to find location. Try a more specific place name."
        );
      }
      if (!Number.isFinite(geo.latitude) || !Number.isFinite(geo.longitude)) {
        throw new Error("Location data is incomplete.");
      }

      // Get timezone - EXACT same as predictions page
      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude);
      if (!Number.isFinite(tz)) {
        throw new Error("Could not determine timezone for the selected place.");
      }

      // Build payload using utility function (ensures correct format)
      const payload = buildAstrologyPayload(
        member.dob,
        member.time,
        geo,
        tz
      );

      // Log payload for debugging
      console.log("[FamilyPredictions] Payload:", JSON.stringify(payload, null, 2));
      console.log("[FamilyPredictions] Member data:", {
        name: member.name,
        dob: member.dob,
        time: member.time,
        place: member.place,
        parsed: { Y, M, D, H, Min, S },
        geo: { lat: geo.latitude, lon: geo.longitude, label: geo.label },
        tz: tz,
      });

      // Fetch data - EXACT same as predictions page
      const { results, errors } = await astrologyAPI.getMultipleCalculations(
        [
          "shadbala/summary",
          "vimsottari/dasa-information",
          "vimsottari/maha-dasas",
          "planets",
          "western/natal-wheel-chart",
          "planets/extended",
        ],
        payload
      );

      const vimsRaw = results?.["vimsottari/dasa-information"];
      const shadbalaRaw = results?.["shadbala/summary"];
      const mahaRaw = results?.["vimsottari/maha-dasas"];
      const planetsRaw = results?.["planets/extended"];
      const westernChartSvgRaw = results?.["western/natal-wheel-chart"];

      const westernChartSvg = westernChartSvgRaw
        ? typeof westernChartSvgRaw.output === "string"
          ? westernChartSvgRaw.output
          : typeof westernChartSvgRaw === "string"
          ? westernChartSvgRaw
          : null
        : null;

      const vimsParsed = vimsRaw
        ? safeParse(safeParse(vimsRaw.output ?? vimsRaw))
        : null;

      let mahaParsed = mahaRaw
        ? safeParse(safeParse(mahaRaw.output ?? mahaRaw))
        : null;
      if (mahaParsed && typeof mahaParsed === "object" && mahaParsed.output) {
        mahaParsed = safeParse(mahaParsed.output);
      }

      let shadbalaParsed = shadbalaRaw
        ? safeParse(safeParse(shadbalaRaw.output ?? shadbalaRaw))
        : null;
      if (
        shadbalaParsed &&
        typeof shadbalaParsed === "object" &&
        shadbalaParsed.output
      ) {
        shadbalaParsed = safeParse(shadbalaParsed.output);
      }

      let planetsParsed = planetsRaw
        ? safeParse(safeParse(planetsRaw.output ?? planetsRaw))
        : null;

      // Build result object - same structure as predictions page
      setResult({
        planets: planetsParsed,
        shadbala: shadbalaParsed,
        maha: mahaParsed,
        vimsottari: vimsParsed,
        westernChartSvg: westernChartSvg,
        input: {
          dob: formatDate(Y, M, D),
          tob: formatTime(H, Min, S),
          place: geo.label || member.place,
          tz: tz,
        },
        coords: { latitude: geo.latitude, longitude: geo.longitude },
      });
    } catch (err) {
      console.error("Error fetching predictions:", err);
      setError(
        err.message ||
          "Failed to load predictions. Please check the birth details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const openAntarInlineFor = async (lord) => {
    if (openAntarFor === lord) {
      setOpenAntarFor(null);
      setAntarRows([]);
      return;
    }
    setOpenAntarFor(lord);
    setAntarLoadingFor(lord);
    setAntarRows([]);

    try {
      // Parse date and time using utility functions
      const { year: Y, month: M, date: D } = parseDateString(member.dob);
      const { hours: H, minutes: Min, seconds: S } = parseTimeString(member.time);
      
      const geo = await geocodePlace(member.place);
      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude);

      const payload = {
        year: Y,
        month: M,
        date: D,
        hours: H,
        minutes: Min,
        seconds: S,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: tz,
        maha_dasa_lord: lord,
        config: { observation_point: "topocentric", ayanamsha: "lahiri" },
      };

      const { results } = await astrologyAPI.getMultipleCalculations(
        ["vimsottari/antar-dasas"],
        payload
      );

      const raw = results?.["vimsottari/antar-dasas"];
      let parsed = raw ? safeParse(safeParse(raw.output ?? raw)) : null;
      if (parsed && typeof parsed === "object" && parsed.output) {
        parsed = safeParse(parsed.output);
      }

      let rows = [];
      if (Array.isArray(parsed)) {
        rows = parsed;
      } else if (typeof parsed === "object") {
        rows = Object.keys(parsed).map((k) => {
          const v = parsed[k];
          return {
            lord: v?.Lord || v?.lord || k,
            start: v?.start_time || v?.start || "",
            end: v?.end_time || v?.end || "",
          };
        });
      }

      setAntarRows(rows.length > 0 ? rows : [{ error: "No Antar Dasha found" }]);
    } catch (err) {
      setAntarRows([{ error: err.message || "Failed to load Antar Dasha" }]);
    } finally {
      setAntarLoadingFor(null);
    }
  };

  // Chat data - same format as predictions page
  const chatData = result
    ? {
        birth: {
          ...result.input,
          fullName: member.name,
          name: member.name,
        },
        coords: result.coords,
        gender: "",
        raw: {
          planets: result.planets,
          vimsottari: result.vimsottari,
          maha: result.maha,
          shadbala: result.shadbala,
        },
        placements,
        shadbalaRows,
        mahaRows,
        currentDashaChain,
      }
    : null;

  if (!member) return null;

  return (
    <div className="family-predictions-overlay" onClick={onClose}>
      <div
        className="family-predictions-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="predictions-header">
          <div className="header-content">
            <div className="avatar-section">
              <div className="member-avatar">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="member-info">
                <h2>{member.name}'s Predictions</h2>
                <p className="relation-badge">{member.relation}</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Birth Details Bar */}
          <div className="birth-details-bar">
            <div className="detail-item">
              <Calendar className="w-4 h-4" />
              <span>{formatDateForDisplay(member.dob)}</span>
            </div>
            <div className="detail-item">
              <Clock className="w-4 h-4" />
              <span>{member.time}</span>
            </div>
            <div className="detail-item">
              <MapPin className="w-4 h-4" />
              <span>{member.place}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="predictions-content">
          {loading ? (
            <div className="loading-state">
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#d4af37" }} />
              <p>Calculating {member.name}'s birth chart...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button className="retry-btn" onClick={fetchPredictions}>
                Try Again
              </button>
            </div>
          ) : result ? (
            <div className="predictions-results">
              {/* Birth Info Cards */}
              <div className="card">
                <div className="results-header">
                  <Sun style={{ color: "#ca8a04" }} />
                  <h3 className="results-title">Birth Information</h3>
                </div>
                <div className="birth-info-grid">
                  <div className="info-card">
                    <div className="info-label">
                      <Calendar />
                      Birth Details
                    </div>
                    <div
                      className="info-value"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <div>Date: {result.input.dob}</div>
                      <div>Time: {result.input.tob}</div>
                      <div>
                        Timezone: UTC
                        {(() => {
                          const v = Number(result.input.tz);
                          const sign = v >= 0 ? "+" : "";
                          const ah = Math.trunc(Math.abs(v));
                          const mins = Math.round((Math.abs(v) - ah) * 60);
                          return `${sign}${String(ah).padStart(2, "0")}:${String(
                            mins
                          ).padStart(2, "0")}`;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">
                      <MapPin />
                      Place
                    </div>
                    <div className="info-value">{result.input.place}</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">
                      <Orbit />
                      Running Dasa
                    </div>
                    <div className="info-value">{currentDashaChain || "-"}</div>
                  </div>
                </div>
              </div>

              {/* Western Chart */}
              {result?.westernChartSvg &&
              result.westernChartSvg.trim().startsWith("<svg") ? (
                <div
                  className="chart-container bg-gray-900 rounded-xl overflow-hidden shadow-lg"
                  style={{ maxWidth: "640px", margin: "0 auto" }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: result.westernChartSvg }}
                    className="w-full"
                    style={{ aspectRatio: "1 / 1" }}
                  />
                </div>
              ) : result && !result.westernChartSvg ? (
                <div className="card mt-8 p-6 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    Western chart not available.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Check: API key, internet, or try different birth details.
                  </p>
                </div>
              ) : null}

              {/* AI Astrologer Section */}
              <div className="card mt-8 bg-gradient-to-r from-indigo-900 via-purple-800 to-rose-700 border border-white/20 shadow-2xl ai-astrologer-section">
                {!chatOpen ? (
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                      <div
                        className="results-header"
                        style={{ marginBottom: "1rem" }}
                      >
                        <Cpu style={{ color: "#ca8a04" }} />
                        <h3 className="results-title">AI Astrologer</h3>
                      </div>

                      <h3 className="text-xl md:text-2xl text-gray-900 mb-1">
                        Get a Personalized AI Reading
                      </h3>
                      <p className="text-sm text-gray-70 max-w-xl">
                        Let our AI Astrologer interpret {member.name}'s birth chart, dashas
                        and planetary strengths in simple, practical language.
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setChatSessionId((prev) => prev + 1);
                          setChatOpen(true);
                        }}
                        className="relative inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-indigo-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_25px_rgba(250,204,21,0.5)] hover:shadow-[0_0_35px_rgba(250,204,21,0.8)] transition-all duration-200 border border-amber-200/80 group overflow-hidden"
                      >
                        <span className="absolute text-[#1e1b0c] inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_top,_white,transparent_60%)] transition-opacity duration-200" />
                        Talk to AI Astrologer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="chat-window-container">
                    <Chat
                      key={`family-chat-${member.id}-${chatSessionId}`}
                      pageTitle={`Predictions for ${member.name}`}
                      initialData={chatData}
                      onClose={() => setChatOpen(false)}
                    />
                  </div>
                )}
              </div>

              {/* Planet Placements Table */}
              {placements.length > 0 ? (
                <div className="card" style={{ scrollMarginTop: "96px" }}>
                  <div className="results-header">
                    <Orbit style={{ color: "#ca8a04" }} />
                    <h3 className="results-title">Planet Placements (D1)</h3>
                  </div>
                  <div className="table-scroll-container">
                    <table className="planet-table">
                      <thead>
                        <tr>
                          <th>Planet</th>
                          <th>Sign</th>
                          <th>House</th>
                          <th>Nakshatra (Pada)</th>
                          <th>Degrees</th>
                          <th>Strength</th>
                          <th>Ishta</th>
                          <th>Kashta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {placements.map((p) => {
                          const pname = (p.name || "").toString().trim();
                          const lname = pname.toLowerCase();
                          // match shadbala row
                          let row = shadbalaRows.find(
                            (r) => (r.name || "").toLowerCase() === lname
                          );
                          if (!row)
                            row = shadbalaRows.find((r) =>
                              (r.name || "").toLowerCase().startsWith(lname)
                            );
                          if (!row)
                            row = shadbalaRows.find((r) =>
                              (r.name || "").toLowerCase().includes(lname)
                            );
                          const parsePct = (v) => {
                            const n = Number(v);
                            return Number.isFinite(n) ? n : null;
                          };
                          const pctVal = row
                            ? parsePct(
                                row.percent ??
                                  row.percentage ??
                                  row.percentage_strength ??
                                  row.shadbala_percent ??
                                  row.strength_percent
                              )
                            : null;
                          const ishtaVal = row
                            ? parsePct(
                                row.ishta ??
                                  row.ishta_phala ??
                                  row.ishta_bala ??
                                  row.ishta_percent
                              )
                            : null;
                          const kashtaVal = row
                            ? parsePct(
                                row.kashta ??
                                  row.kashta_phala ??
                                  row.kashta_bala ??
                                  row.kashta_percent
                              )
                            : null;
                          const fullDeg =
                            typeof p.fullDegree === "number"
                              ? `Full: ${p.fullDegree.toFixed(2)}\u00B0`
                              : null;

                          const normDeg =
                            typeof p.normDegree === "number"
                              ? `Norm: ${p.normDegree.toFixed(2)}\u00B0`
                              : null;
                          const nakshatraDisplay = `${p.nakshatra ?? "-"} (${
                            p.pada ?? "-"
                          })`;
                          return (
                            <tr key={p.name}>
                              <td style={{ fontWeight: 500, color: "#1f2937" }}>
                                <div className="planet-cell">
                                  <span className="planet-main">{pname}</span>
                                  {p.retro && (
                                    <span className="planet-retro">(Retro)</span>
                                  )}
                                </div>
                              </td>
                              <td>{p.currentSign || "-"}</td>
                              <td>{p.house ?? "-"}</td>
                              <td>{nakshatraDisplay}</td>
                              <td className="degrees-cell">
                                {fullDeg || normDeg ? (
                                  <div className="degrees-stack">
                                    {fullDeg && <div>{fullDeg}</div>}
                                    {normDeg && <div>{normDeg}</div>}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {pctVal != null ? `${pctVal.toFixed(1)}%` : "-"}
                              </td>
                              <td style={{ width: "10rem" }}>
                                {ishtaVal != null ? (
                                  <div className="strength-container">
                                    <div className="strength-bar">
                                      <div
                                        className="strength-fill"
                                        style={{ width: `${ishtaVal}%` }}
                                      />
                                    </div>
                                    <div className="strength-label">
                                      {ishtaVal.toFixed(1)}%
                                    </div>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={{ width: "10rem" }}>
                                {kashtaVal != null ? (
                                  <div className="strength-container">
                                    <div className="strength-bar">
                                      <div
                                        className="strength-fill"
                                        style={{ width: `${kashtaVal}%` }}
                                      />
                                    </div>
                                    <div className="strength-label">
                                      {kashtaVal.toFixed(1)}%
                                    </div>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    No planet data found.
                  </div>
                </div>
              )}

              {/* Vimshottari Maha Dasha */}
              <div className="card">
                <div className="results-header">
                  <Moon style={{ color: "#ca8a04" }} />
                  <h3 className="results-title">Vimshottari Maha Dasha</h3>
                </div>

                {mahaRows.length > 0 ? (
                  <div className="horizontal-railway-container">
                    <div className="horizontal-railway-track">
                      {mahaRows.map((row, i) => {
                        const start = new Date(row.start).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        );

                        const end = new Date(row.end).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        );

                        return (
                          <div
                            key={row.key}
                            className="railway-segment"
                            style={{ "--i": i }}
                          >
                            <div className="segment-inner">
                              <div className="planet-header">
                                <span className="planet-name">{row.lord}</span>
                                <button
                                  className="analysis-btn"
                                  onClick={() => openAntarInlineFor(row.lord)}
                                >
                                  Analysis
                                </button>
                              </div>

                              <div className="segment-row">
                                <span className="date-label">{start}</span>

                                <div className="segment-bar">
                                  <div className="dot start-dot"></div>
                                  <div className="bar-line"></div>
                                  <div className="dot end-dot"></div>
                                </div>

                                <span className="date-label">{end}</span>
                              </div>
                            </div>

                            {/* Inline Antar Periods */}
                            {openAntarFor === row.lord && (
                              <div className="antar-inline-box">
                                {antarLoadingFor === row.lord ? (
                                  <div className="antar-loading">Loading...</div>
                                ) : antarRows[0]?.error ? (
                                  <div className="antar-error">
                                    {antarRows[0].error}
                                  </div>
                                ) : (
                                  <table className="antar-table">
                                    <thead>
                                      <tr>
                                        <th>Antar Lord</th>
                                        <th>Start</th>
                                        <th>End</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {antarRows.map((ad, i) => (
                                        <tr key={i}>
                                          <td>{ad.lord}</td>
                                          <td>
                                            {new Date(
                                              ad.start
                                            ).toLocaleDateString("en-GB", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </td>
                                          <td>
                                            {new Date(ad.end).toLocaleDateString(
                                              "en-GB",
                                              {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                              }
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    No Maha Dasha data. Submit the form above.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
