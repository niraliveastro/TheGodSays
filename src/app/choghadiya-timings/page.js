"use client";

/**
 * Choghadiya Timings Module
 *
 * This module provides a dynamic page for displaying Choghadiya timings, an astrological system
 * used in Vedic traditions to determine auspicious and inauspicious periods throughout the day.
 * The component fetches real-time data based on the user's location, displays a live clock,
 * and renders interactive cards for each period with visual indicators, descriptions, and timings.
 *
 * Key Features:
 * - Automatic geolocation detection (with fallback to Delhi, India).
 * - Real-time clock update every minute.
 * - API integration for personalized Choghadiya calculations.
 * - Responsive grid layout for periods with hover effects and current period highlighting.
 * - Action buttons for refresh, download (JSON), and share (Web Share API or clipboard).
 * - Inline styled-jsx for animations, gradients, and responsive design.
 *
 * Dependencies:
 * - React (useState, useEffect)
 * - Lucide React icons
 * - astrologyAPI: Custom API client for astrological calculations
 *
 * Styling: Uses styled-jsx for scoped CSS with animations (orbs, pulse, spin) and responsive breakpoints.
 * Assumes CSS custom properties (e.g., --amrit-color) for period-specific theming.
 *
 * @module ChoghadiyaTimingsPage
 */

import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Download,
  Share,
  RefreshCw,
  MapPin,
  Calendar,
  Zap,
  Star,
  Sun,
  Cloud,
  DollarSign,
  Car,
  AlertCircle,
  Skull,
  Zap as ZapIcon,
} from "lucide-react";
import astrologyAPI from "@/lib/api";
import { PageLoading } from "@/components/LoadingStates";

/**
 * ChoghadiyaTimingsPage Component
 *
 * Renders the main page for Choghadiya timings with live updates, location-based calculations,
 * and interactive UI elements. Handles loading, error states, and user interactions like refresh/share.
 *
 * @returns {JSX.Element} The Choghadiya timings page UI.
 */
export default function ChoghadiyaTimingsPage() {
  const { t } = useTranslation();
  // State management for data, loading, errors, and UI
  const [choghadiyaData, setChoghadiyaData] = useState(null); // Raw API response data
  const [isLoading, setIsLoading] = useState(false); // Loading state during API fetch
  const [error, setError] = useState(null); // Error message from API or geolocation
  const [userLocation, setUserLocation] = useState(null); // User's geolocation {latitude, longitude, timezone}
  const [currentTime, setCurrentTime] = useState(new Date()); // Current local time for live clock

  /* ---------- Clock ---------- */
  /**
   * Effect: Live clock update.
   * Sets up an interval to refresh currentTime every 60 seconds for real-time display.
   */
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t); // Cleanup interval on unmount
  }, []);

  /* ---------- Geolocation ---------- */
  /**
   * Effect: Fetch user's geolocation.
   * Uses browser's Geolocation API; falls back to Delhi coordinates (IST timezone) on denial/error.
   */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timezone: new Date().getTimezoneOffset() / -60, // Convert to hours (positive for IST)
          });
        },
        () =>
          setUserLocation({
            latitude: 28.6139,
            longitude: 77.209,
            timezone: 5.5,
          }) // Default: Delhi, India
      );
    } else {
      setUserLocation({ latitude: 28.6139, longitude: 77.209, timezone: 5.5 });
    }
  }, []); // Empty deps: run once on mount

  /* ---------- Fetch ---------- */
  /**
   * Effect: Trigger API fetch when location is available.
   * Ensures data is fetched only after geolocation resolves.
   */
  useEffect(() => {
    if (userLocation) fetchChoghadiyaData();
  }, [userLocation]); // Deps: re-run if userLocation changes

  /**
   * Fetch Choghadiya data from API.
   * Constructs payload with current date/time and location; handles errors and loading states.
   */
  const fetchChoghadiyaData = async () => {
    if (!userLocation) return;
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const payload = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        date: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        timezone: userLocation.timezone,
        config: { observation_point: "geocentric", ayanamsha: "lahiri" }, // Fixed config for calculations
      };
      const data = await astrologyAPI.getSingleCalculation(
        "choghadiya-timings",
        payload
      );
      setChoghadiyaData(data);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch timings.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- Helpers ---------- */
  /**
   * Parse raw API output to JSON object.
   * Safely handles JSON parsing errors.
   * @param {string} raw - Raw string output from API
   * @returns {object|null} Parsed data or null on error
   */
  const parse = (raw) => {
    try {
      return JSON.parse(raw.output);
    } catch {
      return null;
    }
  };

  /**
   * Format ISO timestamp to localized time string.
   * Uses 12-hour format with leading zeros.
   * @param {string} iso - ISO timestamp string
   * @returns {string} Formatted time (e.g., "2:30 PM")
   */
  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  /**
   * Icon mapping for Choghadiya types.
   * Defaults to Star if type not found.
   */
  const iconMap = {
    amrit: Sun,
    shubh: Cloud,
    labh: DollarSign,
    char: Car,
    rog: AlertCircle,
    kaal: Skull,
    udveg: ZapIcon,
  };

  /**
   * Get icon component for a given Choghadiya type.
   * @param {string} name - Choghadiya period name (e.g., 'Amrit')
   * @returns {JSX.Element} Icon with fixed size
   */
  const getIcon = (name) => {
    const Comp = iconMap[name.toLowerCase()] || Star;
    return <Comp style={{ width: 28, height: 28 }} />;
  };

  /**
   * Description mapping for Choghadiya types.
   */
  const descMap = {
    amrit: "Most auspicious time for all activities",
    shubh: "Auspicious time for important work",
    labh: "Good for financial & business activities",
    char: "Good for travel and movement",
    rog: "Avoid important activities",
    kaal: "Inauspicious – avoid all activities",
    udveg: "Stressful time – avoid decisions",
  };

  /**
   * Get description for a given Choghadiya type.
   * @param {string} name - Choghadiya period name
   * @returns {string} Descriptive text or default
   */
  const getDesc = (name) => descMap[name.toLowerCase()] || "Choghadiya period";

  /**
   * Check if a period is currently active.
   * Compares current timestamp with period start/end.
   * @param {object} p - Period object with starts_at/ends_at ISO strings
   * @returns {boolean} True if currently active
   */
  const isCurrent = (p) => {
    const n = Date.now();
    return n >= new Date(p.starts_at) && n <= new Date(p.ends_at);
  };

  /**
   * Refresh data handler.
   * Triggers a new API fetch.
   */
  const handleRefresh = () => fetchChoghadiyaData();

  /**
   * Download JSON handler.
   * Creates a downloadable blob of the parsed data.
   */
  const handleDownload = () => {
    if (!choghadiyaData) return;
    const blob = new Blob([JSON.stringify(choghadiyaData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "choghadiya-timings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Share handler.
   * Uses Web Share API if available; otherwise copies URL to clipboard.
   */
  const handleShare = async () => {
    const fullUrl = window.location.href; // Gets complete URL including path

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Choghadiya Timings",
          url: fullUrl,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(fullUrl);
      alert("Link copied to clipboard!");
    }
  };

  // Parse data for rendering
  const parsed = choghadiyaData ? parse(choghadiyaData) : null;

  // Main render: Page layout with inline styles
  return (
    <>
      {/* ====================== CSS ====================== */}
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap");

        :global(body) {
          margin: 0;
          font-family: "Inter", sans-serif;
        }
        :global(body) {
          background: #fdfbf7;
        }
        .app {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
          position: relative;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.18;
          animation: float 22s ease-in-out infinite;
        }
        .orb1 {
          top: 10%;
          left: 10%;
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #d4af37, #7c3aed);
        }
        .orb2 {
          bottom: 10%;
          right: 10%;
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, #7c3aed, #b8972e);
          animation-delay: 7s;
        }
        .orb3 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #d4af37, transparent);
          animation-delay: 14s;
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }

        .header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .headerIcon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
        }
        .title {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }
        .subtitle {
          color: #555;
          margin-top: 0.5rem;
        }

        .infoBar {
          backdrop-filter: blur(12px);
          border-radius: 1.5rem;
          padding: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          justify-content: center;
          margin-bottom: 2rem;
          box-shadow: 0 0 30px rgba(212, 175, 55, 0.2);
        }
        .infoBar {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(212, 175, 55, 0.2);
        }
        .infoItem {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
        }
        .infoItem svg {
          width: 1.1rem;
          height: 1.1rem;
          color: #d4af37;
        }
        .infoLabel {
          font-weight: 500;
          color: #444;
        }
        .infoValue {
          font-weight: 600;
          color: #111;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        .actionBar {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-size: 0.925rem;
          font-weight: 500;
          color: #444;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn:hover {
          background: #f9fafb;
          border-color: #d4af37;
          color: #b8972e;
          transform: translateY(-1px);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .stateBox {
          text-align: center;
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 1.5rem;
          border: 1px solid #e5e7eb;
        }
        .spinner {
          width: 3.5rem;
          height: 3.5rem;
          border: 5px solid rgba(212, 175, 55, 0.2);
          border-top-color: #d4af37;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .resultsHeader {
          text-align: center;
          margin-bottom: 2rem;
        }
        .resultsHeader h2 {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 2rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #111;
        }
        .resultsHeader svg {
          color: #d4af37;
        }

        .grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .card {
          position: relative;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 1.5rem;
          overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }
        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .accent {
          height: 5px;
        }
        .current {
          border: 2px solid #d4af37 !important;
          box-shadow: 0 0 0 5px rgba(212, 175, 55, 0.3),
            0 16px 40px rgba(212, 175, 55, 0.25) !important;
        }
        .current .accent {
          background: linear-gradient(90deg, #d4af37, #b8972e);
        }

        .amrit .accent {
          background: linear-gradient(90deg, #22c55e, #16a34a);
        }
        .shubh .accent {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }
        .labh .accent {
          background: linear-gradient(90deg, #a855f7, #9333ea);
        }
        .char .accent {
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }
        .rog .accent {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }
        .kaal .accent {
          background: linear-gradient(90deg, #475569, #334155);
        }
        .udveg .accent {
          background: linear-gradient(90deg, #f97316, #ea580c);
        }

        .cardBody {
          padding: 1.5rem 1.75rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        .iconBox {
          width: 56px;
          height: 56px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .titleGroup h3 {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #111;
        }
        .desc {
          font-size: 0.875rem;
          color: #555;
          margin-top: 0.25rem;
        }
        .liveBadge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(212, 175, 55, 0.2);
          color: #b8972e;
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          border: 1px solid rgba(212, 175, 55, 0.4);
        }
        .pulseDot {
          width: 9px;
          height: 9px;
          background: #d4af37;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .timeRow {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }
        .timeLabel {
          font-weight: 600;
          color: #666;
        }
        .timeValue {
          font-family: "Courier New", monospace;
          font-weight: 700;
          color: #111;
        }
        .footer {
          padding: 1rem 1.75rem;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
          text-align: center;
          background: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #666;
        }
      `}</style>

      {/* ====================== JSX ====================== */}
      <div className="app">
        {/* floating orbs – Background decorative elements */}
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

        {/* Header – Title and subtitle with icon */}
        <header className="header">
          <div className="headerIcon">
            <Zap style={{ width: 36, height: 36, color: "#fff" }} />
          </div>
          <h1 className="title">Choghadiya Timings</h1>
          <p className="subtitle">
            Auspicious &amp; Inauspicious Muhurats for Today
          </p>
        </header>

        {/* Info Bar – Displays date, time, and location */}
        <div className="infoBar">
          <div className="infoItem">
            <Calendar />
            <span className="infoLabel">Date:</span>
            <span className="infoValue">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="infoItem">
            <Calendar />
            <span className="infoLabel">Time:</span>
            <span className="infoValue pulse">
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
          <div className="infoItem">
            <MapPin />
            <span className="infoLabel">Location:</span>
            <span className="infoValue">
              {userLocation
                ? `${userLocation.latitude.toFixed(
                    4
                  )}, ${userLocation.longitude.toFixed(4)}`
                : "Detecting..."}
            </span>
          </div>
        </div>

        {/* Action Buttons – Refresh and share controls */}
        <div className="actionBar">
          <div style={{ display: "flex", gap: "0.75rem", margin: "0 auto" }}>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="btn"
            >
              <RefreshCw className={isLoading ? "spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleShare}
              disabled={!choghadiyaData}
              className="btn"
            >
              <Share />
              Share
            </button>
          </div>
        </div>

        {/* Loading – Full page loading */}
        {isLoading && <PageLoading type="panchang" message="Calculating Choghadiya timings..." />}

        {/* Error – Error message with retry button */}
        {error && !choghadiyaData && (
          <div
            className="stateBox"
            style={{ borderColor: "#fca5a5", background: "#fee2e2" }}
          >
            <p style={{ color: "#b91c1c" }}>{error}</p>
            <button
              onClick={handleRefresh}
              className="btn"
              style={{ marginTop: "1rem" }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results – Grid of period cards */}
        {parsed && !isLoading && (
          <>
            <div className="resultsHeader">
              <Star /> <h2> Today's Choghadiya Periods</h2>
            </div>

            <div className="grid">
              {Object.entries(parsed).map(([key, p]) => {
                const cur = isCurrent(p);
                const type = p.name.toLowerCase();

                return (
                  <div
                    key={key}
                    className={`card ${type} ${cur ? "current" : ""}`}
                  >
                    <div className="accent" />{" "}
                    {/* Period-specific accent bar */}
                    <div className="cardBody">
                      <div
                        className="iconBox"
                        style={{
                          background: `linear-gradient(135deg, var(--${type}-color, #999), var(--${type}-dark, #666))`,
                        }}
                      >
                        {getIcon(p.name)} {/* Dynamic icon based on type */}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="titleGroup">
                          <h3>{p.name}</h3> {/* Period name */}
                          <p className="desc">{getDesc(p.name)}</p>{" "}
                          {/* Description */}
                        </div>
                        {cur && (
                          <div className="liveBadge">
                            <div className="pulseDot" />
                            LIVE
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="cardBody" style={{ paddingTop: 0 }}>
                      <div className="timeRow">
                        <span className="timeLabel">Starts</span>
                        <span className="timeValue">{fmt(p.starts_at)}</span>
                      </div>{" "}
                      {/* Start time */}
                      <div className="timeRow">
                        <span className="timeLabel">Ends</span>
                        <span className="timeValue">{fmt(p.ends_at)}</span>
                      </div>{" "}
                      {/* End time */}
                    </div>
                    <div className="footer">Period #{key}</div>{" "}
                    {/* Period number */}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
