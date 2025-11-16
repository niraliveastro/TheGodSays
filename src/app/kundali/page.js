"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Download,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import astrologyAPI from "@/lib/api";

/**
 * Helper arrays for form options
 * - hours12: Array of 1-12 for hour selection
 * - minutes: Array of 0-59 for minute selection
 * - years: Array of past 120 years from current year
 * - months: Array of month names for reference (though not directly used in form)
 */
const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = Array.from({ length: 60 }, (_, i) => i);
const years = Array.from(
  { length: 120 },
  (_, i) => new Date().getFullYear() - i
);
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * KundaliPage Component
 *
 * A React component for generating a Vedic Janam Kundali (birth chart) based on user-provided birth details.
 * It includes a form for inputting name, gender, birth date/time, place, and language preferences.
 * Uses geolocation suggestions via Nominatim API, an interactive calendar for date selection,
 * and fetches an SVG chart from a custom astrology API.
 *
 * Features:
 * - Form validation for required fields.
 * - Autocomplete suggestions for birth place with lat/long resolution.
 * - 12-hour time picker with AM/PM.
 * - Interactive calendar popup for date selection.
 * - Handles timezone offset dynamically if coordinates are available (defaults to IST +5.5).
 * - Renders SVG output inline and provides download functionality.
 * - Responsive design with astrological-themed styling (floating orbs, gradients).
 * - Error handling for API failures and form issues.
 *
 * Dependencies:
 * - React hooks: useState, useEffect, useRef.
 * - Lucide React icons for UI elements.
 * - Custom astrologyAPI for chart generation.
 * - Nominatim (OpenStreetMap) for place suggestions.
 *
 * Styling:
 * - Inline JSX styles with CSS-in-JS.
 * - Google Fonts: Cormorant Garamond (headings) and Inter (body).
 * - Golden Vedic theme with blurs, animations, and responsive breakpoints.
 *
 * @returns {JSX.Element} The rendered Kundali generation page.
 */
export default function KundaliPage() {
  /**
   * Form state object holding all user inputs.
   * @type {object}
   * @property {string} name - User's full name.
   * @property {string} gender - Gender selection ('male', 'female', 'other').
   * @property {string} birthDate - Birth date in YYYY-MM-DD format.
   * @property {number} hour - Hour in 12-hour format (1-12).
   * @property {number} minute - Minutes (0-59).
   * @property {string} ampm - 'AM' or 'PM'.
   * @property {string} place - Birth place text.
   * @property {string} language - Preferred language for chart ('English', etc.).
   * @property {number|null} latitude - Resolved latitude from place suggestion.
   * @property {number|null} longitude - Resolved longitude from place suggestion.
   */
  const [form, setForm] = useState({
    name: "",
    gender: "male",
    birthDate: new Date().toISOString().split("T")[0],
    hour: 10,
    minute: 30,
    ampm: "AM",
    place: "",
    language: "English",
    latitude: null,
    longitude: null,
  });

  const [errors, setErrors] = useState({}); // Form validation errors object
  const [submitting, setSubmitting] = useState(false); // Submission loading state
  const [suggestions, setSuggestions] = useState([]); // Array of place suggestion objects from Nominatim
  const [loadingSuggest, setLoadingSuggest] = useState(false); // Loading state for place suggestions
  const suggestTimeout = useRef(null); // Ref for debouncing place search
  const [svgOutput, setSvgOutput] = useState(""); // Raw SVG string for the generated chart
  const [genError, setGenError] = useState(""); // Error message for chart generation

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false); // Toggle for calendar popup
  const [calendarDate, setCalendarDate] = useState(new Date()); // Current date for calendar view
  const calendarRef = useRef(null); // Ref for calendar to handle outside clicks
  const [year, setYear] = useState(new Date().getFullYear()); // Current year for calendar
  const [month, setMonth] = useState(new Date().getMonth()); // Current month for calendar (0-11)

  /**
   * Helper function to update a single form field.
   * @param {string} k - Field key.
   * @param {any} v - New value for the field.
   */
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  /**
   * Validates required form fields.
   * @returns {boolean} True if no errors, false otherwise.
   */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (!form.place.trim()) e.place = "Please enter place of birth";
    if (!form.birthDate) e.birthDate = "Please select your birth date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /**
   * Fetches place suggestions from Nominatim API on place input change.
   * Debounced to 350ms, triggers only if query >= 3 chars.
   * Clears suggestions on unmount or short queries.
   */
  useEffect(() => {
    const q = form.place.trim();
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    suggestTimeout.current = setTimeout(async () => {
      try {
        setLoadingSuggest(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
          q
        )}`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        setSuggestions(data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, 350);
    return () => suggestTimeout.current && clearTimeout(suggestTimeout.current);
  }, [form.place]);

  /**
   * Closes calendar popup on outside click.
   */
  useEffect(() => {
    const handler = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /**
   * Handles date selection from calendar.
   * Sets birthDate in YYYY-MM-DD format and closes popup.
   * @param {number} day - Day of the month (1-31).
   */
  const handleDateClick = (day) => {
    // Create date in local timezone to avoid UTC conversion issues
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    setField("birthDate", dateStr);
    setShowCalendar(false);
  };

  /**
   * Renders calendar grid cells for the current month.
   * Includes empty cells for padding, highlights today and selected date.
   * @returns {JSX.Element[]} Array of calendar day elements.
   */
  const renderCalendar = () => {
    const first = new Date(year, month, 1).getDay();
    const daysIn = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);
    const selected = form.birthDate;

    const cells = [];
    for (let i = 0; i < first; i++)
      cells.push(<div key={`e${i}`} className="cal-empty" />);
    for (let d = 1; d <= daysIn; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      const isToday = iso === today;
      const isSel = iso === selected;
      cells.push(
        <button
          key={d}
          onClick={() => handleDateClick(d)}
          className={`cal-day ${isToday ? "today" : ""} ${
            isSel ? "selected" : ""
          }`}
        >
          {d}
        </button>
      );
    }
    return cells;
  };

  /**
   * Handles form submission.
   * Validates, converts time to 24-hour, resolves timezone, calls API for SVG chart.
   * @param {Event} e - Form submit event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setGenError("");
    setSvgOutput("");

    try {
      // Convert to 24-hour format
      let hour24 = form.hour;
      if (form.ampm === "PM" && form.hour !== 12) hour24 += 12;
      if (form.ampm === "AM" && form.hour === 12) hour24 = 0;

      // Parse birth date
      const [y, m, d] = form.birthDate.split("-").map(Number);

      // Get timezone offset if we have coordinates
      let timezone = 5.5; // Default IST
      if (form.latitude && form.longitude) {
        try {
          const { getTimezoneOffsetHours } = await import("@/lib/api");
          timezone = await getTimezoneOffsetHours(
            form.latitude,
            form.longitude
          );
        } catch (err) {
          console.warn("Failed to get timezone, using default IST:", err);
        }
      }

      // The API route expects: year, month, date, hours, minutes, latitude, longitude
      const payload = {
        year: y,
        month: m,
        date: d, // Note: 'date' not 'day'
        hours: hour24, // Note: 'hours' not 'hour'
        minutes: form.minute, // Note: 'minutes' not 'min'
        seconds: 0,
        latitude: form.latitude || 28.6139,
        longitude: form.longitude || 77.209,
        timezone: timezone,
      };

      console.log("Sending payload:", payload);

      const response = await astrologyAPI.getSingleCalculation(
        "horoscope-chart-svg-code",
        payload
      );

      console.log("Received response:", response);

      if (response && response.svg_output) {
        setSvgOutput(response.svg_output);
      } else if (typeof response === "string" && response.includes("<svg")) {
        setSvgOutput(response);
      } else {
        console.error("Unexpected response format:", response);
        throw new Error("No SVG data received from API");
      }
    } catch (err) {
      console.error("Kundali generation error:", err);
      setGenError(
        err.message || "Failed to generate Kundali. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap");

        :global(body) {
          margin: 0;
          background: #fdfbf7;
          font-family: "Inter", sans-serif;
        }
        .app {
          max-width: 480px;
          margin: 0 auto;
          padding: 2rem 1rem;
          position: relative;
        }
        @media (min-width: 1024px) {
          .app {
            max-width: 720px;
          }
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
          margin-bottom: 2rem;
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
          font-family: "Cormorant Garamond", serif;
          font-size: 2.5rem;
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
          font-size: 1rem;
        }

        .card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .cardHeader {
          padding: 1rem 1.5rem;
          background: #fefce8;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }
        .cardTitle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: "Cormorant Garamond", serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #7c2d12;
        }
        .cardBody {
          padding: 1.5rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #444;
          font-size: 0.95rem;
        }
        input,
        select {
          width: 100%;
          padding: 0.65rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-size: 0.925rem;
          transition: all 0.2s;
        }
        input:focus,
        select:focus {
          outline: none;
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.3);
        }
        .error {
          color: #b91c1c;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-weight: 600;
          transition: all 0.3s;
          cursor: pointer;
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

        /* Calendar */
        .calTrigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-size: 0.925rem;
          font-weight: 500;
          color: #444;
          cursor: pointer;
          transition: all 0.3s;
        }
        .calTrigger:hover {
          background: #f9fafb;
          border-color: #d4af37;
          color: #b8972e;
          transform: translateY(-1px);
        }
        .calPopup {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.5rem;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 1.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px) scale(0.95);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .calPopup.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }
        .calHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          color: #fff;
          font-weight: 600;
        }
        .calNavBtn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .calNavBtn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .calMonthYear {
          font-family: "Cormorant Garamond", serif;
          font-size: 1.25rem;
        }
        .calWeekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          padding: 1rem 1.5rem 0.5rem;
          background: rgba(212, 175, 55, 0.05);
          font-weight: 600;
          color: #7c2d12;
          font-size: 0.875rem;
        }
        .calDays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          padding: 0 1.5rem 1.5rem;
        }
        .cal-day {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          color: #444;
          transition: all 0.2s;
          cursor: pointer;
          background: transparent;
          border: 2px solid transparent;
        }
        .cal-day:hover {
          background: rgba(212, 175, 55, 0.15);
          color: #b8972e;
          transform: scale(1.05);
        }
        .cal-empty {
          cursor: default;
          background: none !important;
          color: transparent !important;
        }
        .cal-day.today {
          background: #fef3c7;
          color: #92400e;
          font-weight: 700;
          border-color: #f59e0b;
        }
        .cal-day.selected {
          background: linear-gradient(135deg, #d4af37, #b8972e);
          color: #fff;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
          transform: scale(1.1);
        }
        .cal-day.selected:hover {
          transform: scale(1.15);
        }
        .calTodayBtn {
          display: block;
          width: calc(100% - 3rem);
          margin: 0 auto 1rem;
          padding: 0.5rem;
          background: rgba(212, 175, 55, 0.1);
          border: 1.5px dashed #d4af37;
          border-radius: 0.75rem;
          color: #b8972e;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .calTodayBtn:hover {
          background: rgba(212, 175, 55, 0.2);
          border-style: solid;
        }

        .suggestList {
          position: absolute;
          z-index: 20;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 0.875rem;
          max-height: 200px;
          overflow: auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        .suggestItem {
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .suggestItem:hover {
          background: #f9fafb;
        }

        .note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: #666;
        }

        :global(body) {
          margin: 0;
          background: #fdfbf7;
          font-family: "Inter", sans-serif;
        }

        /* Responsive container */
        .app {
          min-height: 100vh;
          padding: 1.5rem 1rem;
          margin: 0 auto;
          position: relative;
          max-width: 100%;
        }
        @media (min-width: 480px) {
          .app {
            padding: 2rem 1.5rem;
          }
        }
        @media (min-width: 768px) {
          .app {
            padding: 2.5rem 2rem;
            max-width: 720px;
          }
        }
        @media (min-width: 1024px) {
          .app {
            max-width: 960px;
          }
        }
        @media (min-width: 1280px) {
          .app {
            max-width: 1200px;
          }
        } /* 3xl */

        /* Floating orbs – scale with screen */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.18;
          animation: float 22s ease-in-out infinite;
          width: 300px;
          height: 300px;
        }
        @media (min-width: 640px) {
          .orb {
            width: 500px;
            height: 500px;
          }
        }
        @media (min-width: 1024px) {
          .orb {
            width: 600px;
            height: 600px;
          }
        }
        .orb1 {
          top: 5%;
          left: 5%;
          background: linear-gradient(135deg, #d4af37, #7c3aed);
        }
        .orb2 {
          bottom: 5%;
          right: 5%;
          background: linear-gradient(135deg, #7c3aed, #b8972e);
          animation-delay: 7s;
        }
        .orb3 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, #d4af37, transparent);
          animation-delay: 14s;
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(20px, -20px) scale(1.1);
          }
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 640px) {
          .header {
            margin-bottom: 2rem;
          }
        }
        .headerIcon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.75rem;
          box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
        }
        @media (min-width: 640px) {
          .headerIcon {
            width: 64px;
            height: 64px;
          }
        }
        .title {
          font-family: "Cormorant Garamond", serif;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }
        @media (min-width: 640px) {
          .title {
            font-size: 2.5rem;
          }
        }
        .subtitle {
          color: #555;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        @media (min-width: 640px) {
          .subtitle {
            font-size: 1rem;
          }
        }

        /* Card */
        .card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .cardHeader {
          padding: 1rem 1.25rem;
          background: #fefce8;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }
        @media (min-width: 640px) {
          .cardHeader {
            padding: 1rem 1.5rem;
          }
        }
        .cardTitle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: "Cormorant Garamond", serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: #7c2d12;
        }
        @media (min-width: 640px) {
          .cardTitle {
            font-size: 1.25rem;
          }
        }
        .cardBody {
          padding: 1.25rem;
        }
        @media (min-width: 640px) {
          .cardBody {
            padding: 1.5rem;
          }
        }

        /* Form */
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #444;
          font-size: 0.9rem;
        }
        @media (min-width: 640px) {
          label {
            font-size: 0.95rem;
          }
        }
        input,
        select {
          width: 100%;
          padding: 0.65rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-size: 0.925rem;
          transition: all 0.2s;
        }
        input:focus,
        select:focus {
          outline: none;
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.3);
        }
        .error {
          color: #b91c1c;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        /* Buttons */
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-weight: 600;
          transition: all 0.3s;
          cursor: pointer;
          margin: 1rem auto;
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

        /* Calendar */
        .calTrigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-size: 0.925rem;
          font-weight: 500;
          color: #444;
          cursor: pointer;
          transition: all 0.3s;
        }
        .calTrigger:hover {
          background: #f9fafb;
          border-color: #d4af37;
          color: #b8972e;
          transform: translateY(-1px);
        }
        .calPopup {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.5rem;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 1.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px) scale(0.95);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .calPopup.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }
        .calHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          color: #fff;
          font-weight: 600;
        }
        @media (min-width: 640px) {
          .calHeader {
            padding: 1rem 1.5rem;
          }
        }
        .calNavBtn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .calNavBtn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .calMonthYear {
          font-family: "Cormorant Garamond", serif;
          font-size: 1.125rem;
        }
        @media (min-width: 640px) {
          .calMonthYear {
            font-size: 1.25rem;
          }
        }
        .calWeekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          padding: 1rem 1.25rem 0.5rem;
          background: rgba(212, 175, 55, 0.05);
          font-weight: 600;
          color: #7c2d12;
          font-size: 0.8rem;
        }
        @media (min-width: 640px) {
          .calWeekdays {
            padding: 1rem 1.5rem 0.5rem;
            font-size: 0.875rem;
          }
        }
        .calDays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          padding: 0 1.25rem 1.5rem;
        }
        @media (min-width: 640px) {
          .calDays {
            padding: 0 1.5rem 1.5rem;
          }
        }
        .cal-day {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          color: #444;
          transition: all 0.2s;
          cursor: pointer;
          background: transparent;
          border: 2px solid transparent;
        }
        @media (min-width: 640px) {
          .cal-day {
            width: 40px;
            height: 40px;
          }
        }
        .cal-day:hover {
          background: rgba(212, 175, 55, 0.15);
          color: #b8972e;
          transform: scale(1.05);
        }
        .cal-empty {
          cursor: default;
          background: none !important;
          color: transparent !important;
        }
        .cal-day.today {
          background: #fef3c7;
          color: #92400e;
          font-weight: 700;
          border-color: #f59e0b;
        }
        .cal-day.selected {
          background: linear-gradient(135deg, #d4af37, #b8972e);
          color: #fff;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
          transform: scale(1.1);
        }
        .cal-day.selected:hover {
          transform: scale(1.15);
        }
        .calTodayBtn {
          display: block;
          width: calc(100% - 2.5rem);
          margin: 0 auto 1rem;
          padding: 0.5rem;
          background: rgba(212, 175, 55, 0.1);
          border: 1.5px dashed #d4af37;
          border-radius: 0.75rem;
          color: #b8972e;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .calTodayBtn:hover {
          background: rgba(212, 175, 55, 0.2);
          border-style: solid;
        }

        /* Place suggestions */
        .suggestList {
          position: absolute;
          z-index: 20;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 0.875rem;
          max-height: 200px;
          overflow: auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        .suggestItem {
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .suggestItem:hover {
          background: #f9fafb;
        }

        /* Time picker – responsive */
        .timeGrid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.75rem;
        }
        @media (min-width: 480px) {
          .timeGrid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        /* Result card */
        .resultCard {
          margin-top: 1.5rem;
        }
        @media (min-width: 640px) {
          .resultCard {
            margin-top: 2rem;
          }
        }

        .note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: #666;
        }
      `}</style>

      <div className="app">
        {/* Background Orbs - Decorative floating elements for Vedic theme */}
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

        {/* Header Section */}
        <header className="header">
          <div className="headerIcon">
            <ShieldCheck style={{ width: 36, height: 36, color: "#fff" }} />
          </div>
          <h1 className="title">Janam Kundali</h1>
          <p className="subtitle">
            Enter birth details to generate your Vedic chart
          </p>
        </header>

        {/* Main Form Card */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">
              <ShieldCheck style={{ width: 20, height: 20 }} />
              Birth Details
            </div>
          </div>
          <div className="cardBody">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div>
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Your full name"
                />
                {errors.name && <p className="error">{errors.name}</p>}
              </div>

              {/* Gender Radio Buttons */}
              <div>
                <label>Gender</label>
                <div style={{ display: "flex", gap: "1.5rem" }}>
                  {["male", "female", "other"].map((g) => (
                    <label
                      key={g}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: ".5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="gender"
                        checked={form.gender === g}
                        onChange={() => setField("gender", g)}
                      />
                      <span style={{ textTransform: "capitalize" }}>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Birth Date Input with Calendar */}
              <div style={{ position: "relative" }} ref={calendarRef}>
                <label>Birth Date</label>

                {/* Input + Calendar Button */}
                <div
                  style={{
                    display: "flex",
                    gap: ".5rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={form.birthDate}
                    onChange={(e) => setField("birthDate", e.target.value)}
                    placeholder="YYYY-MM-DD"
                    pattern="\\d{4}-\\d{2}-\\d{2}"
                    style={{
                      flex: 1,
                      fontFamily: "monospace",
                      fontSize: "0.925rem",
                      padding: ".65rem 1rem",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: ".875rem",
                      transition: "all .2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#d4af37")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="calTrigger"
                    style={{ width: "48px", height: "48px", padding: 0 }}
                  >
                    <Calendar style={{ width: 20, height: 20 }} />
                  </button>
                </div>

                {errors.birthDate && (
                  <p className="error">{errors.birthDate}</p>
                )}

                {/* Calendar Popup */}
                <div className={`calPopup ${showCalendar ? "open" : ""}`}>
                  <div className="calHeader">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(
                            calendarDate.getFullYear(),
                            calendarDate.getMonth() - 1
                          )
                        )
                      }
                      className="calNavBtn"
                    >
                      <ChevronLeft style={{ width: 18, height: 18 }} />
                    </button>
                    <div className="calMonthYear">
                      {calendarDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(
                            calendarDate.getFullYear(),
                            calendarDate.getMonth() + 1
                          )
                        )
                      }
                      className="calNavBtn"
                    >
                      <ChevronRight style={{ width: 18, height: 18 }} />
                    </button>
                  </div>

                  <div className="calWeekdays">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <div key={d}>{d}</div>
                      )
                    )}
                  </div>

                  <div className="calDays">{renderCalendar()}</div>

                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setField("birthDate", today.toISOString().slice(0, 10));
                      setCalendarDate(today);
                      setShowCalendar(false);
                    }}
                    className="calTodayBtn"
                  >
                    Today
                  </button>
                </div>
              </div>
              {errors.birthDate && <p className="error">{errors.birthDate}</p>}

              {/* Birth Time Picker */}
              <div>
                <label>Birth Time</label>
                <div className="timeGrid">
                  <select
                    value={form.hour}
                    onChange={(e) => setField("hour", Number(e.target.value))}
                  >
                    {hours12.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={form.minute}
                    onChange={(e) => setField("minute", Number(e.target.value))}
                  >
                    {minutes.map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={form.ampm}
                    onChange={(e) => setField("ampm", e.target.value)}
                  >
                    <option>AM</option>
                    <option>PM</option>
                  </select>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".5rem",
                      fontSize: ".8rem",
                      color: "#666",
                    }}
                  >
                    <Clock style={{ width: 16, height: 16 }} />
                    12-hour
                  </div>
                </div>
              </div>

              {/* Place Input with Suggestions */}
              <div style={{ position: "relative" }}>
                <label>Place of Birth</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={form.place}
                    onChange={(e) => {
                      setField("place", e.target.value);
                      setField("latitude", null);
                      setField("longitude", null);
                    }}
                    placeholder="City, State, Country"
                  />
                  <MapPin
                    style={{
                      width: 18,
                      height: 18,
                      color: "#888",
                      position: "absolute",
                      left: 12,
                      top: 12,
                    }}
                  />
                </div>
                {errors.place && <p className="error">{errors.place}</p>}
                {(suggestions.length > 0 || loadingSuggest) && (
                  <ul className="suggestList">
                    {loadingSuggest ? (
                      <li className="suggestItem" style={{ color: "#999" }}>
                        Loading…
                      </li>
                    ) : (
                      suggestions.map((s) => (
                        <li
                          key={s.place_id}
                          className="suggestItem"
                          onClick={() => {
                            setField("place", s.display_name);
                            setField("latitude", Number(s.lat));
                            setField("longitude", Number(s.lon));
                            setSuggestions([]);
                          }}
                        >
                          {s.display_name}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              {/* Language Selector */}
              <div>
                <label>Language</label>
                <select
                  value={form.language}
                  onChange={(e) => setField("language", e.target.value)}
                >
                  {[
                    "English",
                    "Hindi",
                    "Gujarati",
                    "Marathi",
                    "Bengali",
                    "Tamil",
                    "Telugu",
                  ].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="btn"
                style={{ background: "#d4af37", color: "#fff", border: "none" }}
              >
                {submitting ? <>Processing…</> : "Get Kundali"}
              </button>

              {/* Generation Error Display */}
              {genError && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: ".875rem",
                    color: "#b91c1c",
                    fontSize: ".9rem",
                  }}
                >
                  {genError}
                </div>
              )}
            </form>

            {/* Note on Timezone Handling */}
            <div className="note">
              <Globe style={{ width: 16, height: 16 }} />
              Time & date are converted to UTC for accurate calculations.
            </div>
          </div>
        </div>

        {/* Result Card - SVG Chart */}
        {svgOutput && (
          <div className="card" style={{ marginTop: "2rem" }}>
            <div className="cardHeader">
              <div className="cardTitle">Your Kundali</div>
            </div>
            <div className="cardBody">
              <div
                style={{
                  overflow: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: ".75rem",
                  background: "#fff",
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: svgOutput }} />
              </div>
              {/* Download Button */}
              <button
                onClick={() => {
                  const blob = new Blob([svgOutput], { type: "image/svg+xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "kundali.svg";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn"
                style={{
                  marginTop: "1rem",
                  background: "#fff",
                  border: "1.5px solid #d4af37",
                  color: "#b8972e",
                }}
              >
                <Download style={{ width: 18, height: 18 }} />
                Download SVG
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
