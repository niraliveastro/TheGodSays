"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { PageLoading } from "@/components/LoadingStates";
import "./matching_styles.css";
import {
  Sparkles,
  Sun,
  Moon,
  Orbit,
  RotateCcw,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  X,
  LoaderCircle,
  Star,
  PhoneCallIcon,
} from "lucide-react";
import { IoHeartCircle } from "react-icons/io5";
import AstrologerAssistant from "@/components/AstrologerAssistant";
import Modal from "@/components/Modal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api";
/**
 * Tiny UI helpers – pure CSS classes for reusable components.
 * These are simple functional components that render styled divs or spans.
 */
/**
 * ProgressBar Component
 *
 * A horizontal progress bar component that displays a percentage value.
 * Clamps value between 0-200%, with color tiers: emerald (>=120%), blue (>=100%), amber (<100%).
 *
 * @param {number} [value=0] - The progress value (0-200).
 * @param {string} [color] - Optional custom color class override.
 * @returns {JSX.Element} A div with a filled progress bar.
 */
const ProgressBar = ({ value = 0, color }) => {
  const v = Math.max(0, Math.min(200, Number(value) || 0));
  const barColor =
    v >= 120 ? "bg-emerald-500" : v >= 100 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="progress-wrapper">
      <div
        className={`progress-fill ${color || barColor}`}
        style={{ width: `${Math.min(100, v)}%` }}
      />
    </div>
  );
};
/**
 * Badge Component
 *
 * A small, styled badge for displaying status or labels.
 * Supports tone variants: neutral, info, success, warn.
 *
 * @param {ReactNode} children - The content inside the badge.
 * @param {string} [tone="neutral"] - The tone variant for styling.
 * @returns {JSX.Element} A span with badge styling.
 */
const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "badge-neutral",
    info: "badge-info",
    success: "badge-success",
    warn: "badge-warn",
  };
  return (
    <span className={`badge ${tones[tone] || tones.neutral}`}>{children}</span>
  );
};
/* ------------------------------------------------------------------ */
/* Main component */
/* ------------------------------------------------------------------ */
/**
 * MatchingPage Component
 *
 * A comprehensive React component for Vedic astrology match-making (Ashtakoot compatibility).
 * Allows input of birth details for two individuals (female/male), computes compatibility score,
 * displays charts (bar/line for Koot scores), individual details (Shadbala, placements, Dasha),
 * and maintains a local storage-based history of matches.
 *
 * Features:
 * - Dual form for female/male birth details (name, DOB, TOB, place) with autocomplete suggestions via Nominatim.
 * - Validation and submission handling with API calls to astrologyAPI for matching and individual calculations.
 * - Responsive charts using Recharts for Koot scores.
 * - Detailed views for Shadbala (strength, Ishta/Kashta) and planet placements.
 * - Matching history with CRUD (create/read/update/delete) via localStorage (max 10 entries).
 * - Error handling, loading states, and reset functionality.
 * - Responsive design with Tailwind-inspired classes and custom CSS.
 *
 * Dependencies:
 * - React hooks: useState, useEffect, useRef.
 * - Recharts for data visualization.
 * - Lucide React and React Icons for UI elements.
 * - Custom astrologyAPI, geocodePlace, getTimezoneOffsetHours for backend integration.
 *
 * Styling:
 * - Inline <style jsx> for self-contained CSS (Tailwind-like utilities + custom).
 * - Pink/blue themes for female/male sections.
 * - Golden accents for astrological theme.
 *
 * API Integrations:
 * - Ashtakoot score via "match-making/ashtakoot-score".
 * - Individual calcs: shadbala/summary, vimsottari/dasa-information, vimsottari/maha-dasas, planets.
 * - Nominatim for place geocoding.
 *
 * @returns {JSX.Element} The rendered match-making page.
 */
export default function MatchingPage() {
  const { t } = useTranslation();
  // Form state for female and male individuals
  const [female, setFemale] = useState({
    fullName: "",
    dob: "",
    tob: "",
    place: "",
  });
  const [male, setMale] = useState({
    fullName: "",
    dob: "",
    tob: "",
    place: "",
  });
  // Coordinates and suggestions state
  const [fCoords, setFCoords] = useState(null); // Female coordinates {latitude, longitude}
  const [mCoords, setMCoords] = useState(null); // Male coordinates {latitude, longitude}
  const [fSuggest, setFSuggest] = useState([]); // Female place suggestions array
  const [mSuggest, setMSuggest] = useState([]); // Male place suggestions array
  const [fLocating, setFLocating] = useState(false); // Female location fetching state
  const [mLocating, setMLocating] = useState(false); // Male location fetching state
  const fTimer = useRef(null); // Debounce timer ref for female place search
  const mTimer = useRef(null); // Debounce timer ref for male place search
  const fDateInputRef = useRef(null); // Ref for female date input
  const mDateInputRef = useRef(null); // Ref for male date input
  const fTimeInputRef = useRef(null); // Ref for female time input
  const mTimeInputRef = useRef(null); // Ref for male time input
  const [expandedAddresses, setExpandedAddresses] = useState({}); // Track expanded addresses by itemId-field
  // Submission and result state
  const [submitting, setSubmitting] = useState(false); // Loading state during submission
  const [error, setError] = useState(""); // Error message string
  const [result, setResult] = useState(null); // Ashtakoot result object
  const [fDetails, setFDetails] = useState(null); // Female individual details object
  const [mDetails, setMDetails] = useState(null); // Male individual details object

  // === Chat State ===
  const [chatOpen, setChatOpen] = useState(false); // Chat modal visibility
  const [chatSessionId, setChatSessionId] = useState(0); // Chat session counter for reset
  const [shouldResetChat, setShouldResetChat] = useState(false);
  const [chatData, setChatData] = useState(null); // Data to pass to chat component
  const [isAssistantMinimized, setIsAssistantMinimized] = useState(false); // Minimized state for AI assistant
  const chatRef = useRef(null); // Reference to chat section for scrolling
  const resultsRef = useRef(null); // Reference to results section for auto-scrolling

  // Track current form data hash to detect changes
  const [currentFormDataHash, setCurrentFormDataHash] = useState(null);
  const previousFormDataHashRef = useRef(null);

  /**
   * Generates a unique hash from form data (names, DOB, TOB, place)
   * This hash is used to identify if form data has changed
   */
  const generateFormDataHash = () => {
    const formData = {
      femaleName: (female.fullName || "").trim().toUpperCase(),
      femaleDob: (female.dob || "").trim(),
      femaleTob: (female.tob || "").trim(),
      femalePlace: (female.place || "").trim().toUpperCase(),
      maleName: (male.fullName || "").trim().toUpperCase(),
      maleDob: (male.dob || "").trim(),
      maleTob: (male.tob || "").trim(),
      malePlace: (male.place || "").trim().toUpperCase(),
    };
    // Create a consistent hash from the form data
    const hashString = JSON.stringify(formData);
    // Simple hash function (you could use a more robust one if needed)
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  /**
   * Checks if form data has changed and resets chat if needed
   */
  const checkAndResetChatOnFormChange = () => {
    const newHash = generateFormDataHash();

    // If form is empty, don't reset
    if (!female.fullName && !male.fullName && !female.dob && !male.dob) {
      return;
    }

    // If hash changed, reset chat
    if (
      previousFormDataHashRef.current !== null &&
      previousFormDataHashRef.current !== newHash
    ) {
      console.log("[Matching] Form data changed, resetting chat:", {
        previousHash: previousFormDataHashRef.current,
        newHash: newHash,
      });
      // Reset chat by incrementing session ID
      setChatSessionId((prev) => prev + 1);
      setShouldResetChat(true);
      // Clear any existing chat data
      setChatData(null);
    }

    // Update the hash
    previousFormDataHashRef.current = newHash;
    setCurrentFormDataHash(newHash);
  };

  // === Matching History ===
  const MATCHING_HISTORY_KEY = "matching_history_v1"; // localStorage key for history
  const [history, setHistory] = useState([]); // Array of history entries
  const [historySearch, setHistorySearch] = useState(""); // Search filter for history
  /**
   * Retrieves matching history from localStorage.
   * @returns {array} Array of history objects or empty array on error.
   */
  const getHistory = () => {
    try {
      const stored = localStorage.getItem(MATCHING_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };
  /**
   * Saves a new matching entry to history (unshift, dedupe, limit to 10).
   * @param {object} entry - History entry with female/male details.
   */
  const saveToHistory = (entry) => {
    let current = getHistory();
    const key = `${entry.femaleName.toUpperCase()}-${entry.maleName.toUpperCase()}-${
      entry.femaleDob
    }-${entry.maleDob}`;
    current = current.filter(
      (it) =>
        `${it.femaleName.toUpperCase()}-${it.maleName.toUpperCase()}-${
          it.femaleDob
        }-${it.maleDob}` !== key,
    );
    current.unshift(entry);
    if (current.length > 10) current = current.slice(0, 10);
    localStorage.setItem(MATCHING_HISTORY_KEY, JSON.stringify(current));
    setHistory(current);
  };
  /**
   * Deletes a specific history item by ID.
   * @param {string|number} id - The ID of the history item to delete.
   */
  const deleteHistoryItem = (id) => {
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(MATCHING_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };
  /**
   * Clears all matching history from localStorage.
   */
  const clearHistory = () => {
    localStorage.removeItem(MATCHING_HISTORY_KEY);
    setHistory([]);
    setHistorySearch("");
  };

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const searchLower = historySearch.toLowerCase();
    return history.filter((item) => {
      const femaleNameMatch = (item.femaleName || "")
        .toLowerCase()
        .includes(searchLower);
      const maleNameMatch = (item.maleName || "")
        .toLowerCase()
        .includes(searchLower);
      const femalePlaceMatch = (item.femalePlace || "")
        .toLowerCase()
        .includes(searchLower);
      const malePlaceMatch = (item.malePlace || "")
        .toLowerCase()
        .includes(searchLower);
      const femaleDobMatch = (item.femaleDob || "").includes(searchLower);
      const maleDobMatch = (item.maleDob || "").includes(searchLower);
      return (
        femaleNameMatch ||
        maleNameMatch ||
        femalePlaceMatch ||
        malePlaceMatch ||
        femaleDobMatch ||
        maleDobMatch
      );
    });
  }, [history, historySearch]);

  const resetAllFields = () => {
    setFemale({
      fullName: "",
      dob: "",
      tob: "",
      place: "",
    });

    setMale({
      fullName: "",
      dob: "",
      tob: "",
      place: "",
    });

    setFCoords(null);
    setMCoords(null);
    setFSuggest([]);
    setMSuggest([]);
    setError("");
    setResult(null);
    setFDetails(null);
    setMDetails(null);

    // Reset chat when form is cleared
    setChatSessionId((prev) => prev + 1);
    setShouldResetChat(true);
    setChatData(null);
    previousFormDataHashRef.current = null;
    setCurrentFormDataHash(null);
  };

  const loadHistoryIntoForm = (item) => {
    setFemale({
      fullName: item.femaleName,
      dob: item.femaleDob,
      tob: item.femaleTob,
      place: item.femalePlace,
    });

    setMale({
      fullName: item.maleName,
      dob: item.maleDob,
      tob: item.maleTob,
      place: item.malePlace,
    });

    // Optional: Clear suggestions
    setFSuggest([]);
    setMSuggest([]);

    // Optional: Reset coords so user must re-select or re-run
    setFCoords(null);
    setMCoords(null);

    // Generate hash for loaded history item to check if chat should be restored
    const loadedHash = (() => {
      const formData = {
        femaleName: (item.femaleName || "").trim().toUpperCase(),
        femaleDob: (item.femaleDob || "").trim(),
        femaleTob: (item.femaleTob || "").trim(),
        femalePlace: (item.femalePlace || "").trim().toUpperCase(),
        maleName: (item.maleName || "").trim().toUpperCase(),
        maleDob: (item.maleDob || "").trim(),
        maleTob: (item.maleTob || "").trim(),
        malePlace: (item.malePlace || "").trim().toUpperCase(),
      };
      const hashString = JSON.stringify(formData);
      let hash = 0;
      for (let i = 0; i < hashString.length; i++) {
        const char = hashString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash.toString();
    })();

    // If this matches previous hash, don't reset chat (same data)
    // Otherwise, reset chat (different data loaded)
    if (
      previousFormDataHashRef.current !== null &&
      previousFormDataHashRef.current !== loadedHash
    ) {
      setChatSessionId((prev) => prev + 1);
      setShouldResetChat(true);
      setChatData(null);
    }

    // Update hash reference
    previousFormDataHashRef.current = loadedHash;
    setCurrentFormDataHash(loadedHash);

    // Scroll to top where the form is
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Automatically show full assistant card when results are generated
  useEffect(() => {
    if (result) {
      setIsAssistantMinimized(false);
    } else {
      setIsAssistantMinimized(true);
    }
  }, [result]);

  /* -------------------------------------------------------------- */
  /* Lifecycle / resize */
  /* -------------------------------------------------------------- */

  /* -------------------------------------------------------------- */
  /* Helpers */
  /* -------------------------------------------------------------- */
  /**
   * Counts filled fields (dob, tob, place) for a person object.
   * @param {object} p - Person object with dob, tob, place.
   * @returns {number} Count of non-empty fields.
   */
  const countFilled = (p) => [p.dob, p.tob, p.place].filter(Boolean).length;
  const fFilled = countFilled(female); // Female filled count
  const mFilled = countFilled(male); // Male filled count
  /**
   * Generic change handler for person form fields.
   * Handles place autocomplete with debounced Nominatim fetch.
   * @param {function} setter - State setter for the person.
   * @param {function} coordsSetter - Setter for coordinates.
   * @param {function} suggestSetter - Setter for suggestions array.
   * @param {object} timerRef - Ref for debounce timer.
   * @param {string} key - The field key being changed.
   * @returns {function} Event handler for input change.
   */
  const onChangePerson =
    (setter, coordsSetter, suggestSetter, timerRef, key) => (e) => {
      const v = e.target.value;
      setter((prev) => ({ ...prev, [key]: v }));
      if (key === "place") {
        coordsSetter(null);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
          if (!v || v.length < 2) {
            suggestSetter([]);
            return;
          }
          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(
              v,
            )}`;
            const res = await fetch(url, {
              headers: { "Accept-Language": "en" },
            });
            const arr = await res.json();
            suggestSetter(
              (arr || []).map((it) => ({
                label: it.display_name,
                latitude: parseFloat(it.lat),
                longitude: parseFloat(it.lon),
              })),
            );
          } catch {
            suggestSetter([]);
          }
        }, 250);
      }
    };
  /**
   * Parses DOB (handles both YYYY-MM-DD and DD-MM-YYYY formats) and TOB (HH:MM) into API payload format.
   * @param {string} dob - Date of birth string (YYYY-MM-DD or DD-MM-YYYY).
   * @param {string} tob - Time of birth string (HH:MM or HH:MM:SS).
   * @returns {object} Parsed {year, month, date, hours, minutes, seconds}.
   */
  const parseDateTime = (dob, tob) => {
    if (!dob) throw new Error("Date of birth is required");

    const dobParts = dob.split("-").map((n) => parseInt(n, 10));
    let Y, M, D;

    // Handle both YYYY-MM-DD and DD-MM-YYYY formats
    if (dobParts.length === 3) {
      if (dobParts[0] > 1900) {
        // YYYY-MM-DD format
        [Y, M, D] = dobParts;
      } else {
        // DD-MM-YYYY format
        [D, M, Y] = dobParts;
      }
    } else {
      throw new Error(
        `Invalid date format: ${dob}. Expected YYYY-MM-DD or DD-MM-YYYY`,
      );
    }

    if (
      !Y ||
      !M ||
      !D ||
      Number.isNaN(Y) ||
      Number.isNaN(M) ||
      Number.isNaN(D)
    ) {
      throw new Error(`Invalid date values: ${dob}`);
    }

    // Validate date ranges
    if (Y < 1900 || Y > 2100)
      throw new Error(`Year must be between 1900 and 2100: ${Y}`);
    if (M < 1 || M > 12)
      throw new Error(`Month must be between 1 and 12: ${M}`);
    if (D < 1 || D > 31) throw new Error(`Date must be between 1 and 31: ${D}`);

    // Parse time
    if (!tob) throw new Error("Time of birth is required");
    const timeParts = tob.split(":").map((n) => parseInt(n, 10));
    const [H, Min, S = 0] = timeParts;

    if (Number.isNaN(H) || Number.isNaN(Min) || Number.isNaN(S)) {
      throw new Error(
        `Invalid time format: ${tob}. Expected HH:MM or HH:MM:SS`,
      );
    }

    // Validate time ranges
    if (H < 0 || H > 23)
      throw new Error(`Hours must be between 0 and 23: ${H}`);
    if (Min < 0 || Min > 59)
      throw new Error(`Minutes must be between 0 and 59: ${Min}`);
    if (S < 0 || S > 59)
      throw new Error(`Seconds must be between 0 and 59: ${S}`);

    return { year: Y, month: M, date: D, hours: H, minutes: Min, seconds: S };
  };
  /**
   * Reverse geocodes coordinates to get place name.
   * @param {number} lat - Latitude.
   * @param {number} lon - Longitude.
   * @returns {Promise<string>} Place name or coordinates string.
   */
  async function reverseGeocodeCoords(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=0`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data?.display_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    } catch {
      return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    }
  }

  /**
   * Fetches current location for female and fills place field.
   */
  async function useMyLocationFemale() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setFLocating(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const label = await reverseGeocodeCoords(latitude, longitude);
      setFemale((prev) => ({ ...prev, place: label }));
      setFCoords({ latitude, longitude, label });
      setFSuggest([]);
    } catch (e) {
      setError(
        "Could not access your location. Please allow permission or type the city manually.",
      );
    } finally {
      setFLocating(false);
    }
  }

  /**
   * Fetches current location for male and fills place field.
   */
  async function useMyLocationMale() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setMLocating(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const label = await reverseGeocodeCoords(latitude, longitude);
      setMale((prev) => ({ ...prev, place: label }));
      setMCoords({ latitude, longitude, label });
      setMSuggest([]);
    } catch (e) {
      setError(
        "Could not access your location. Please allow permission or type the city manually.",
      );
    } finally {
      setMLocating(false);
    }
  }

  /**
   * Ensures coordinates for a person; geocodes if not provided.
   * @param {object} person - Person with place string.
   * @param {object|null} coords - Existing {latitude, longitude}.
   * @returns {Promise<object|null>} Coordinates or null on error.
   */
  const ensureCoords = async (person, coords) => {
    if (coords?.latitude && coords?.longitude) return coords;
    if (!person.place) return null;
    return geocodePlace(person.place);
  };
  /**
   * Builds the API payload for matching, including timezone resolution.
   * @returns {Promise<object>} Payload with female/male details and config.
   * @throws {Error} If coordinates cannot be resolved.
   */
  const buildPayload = async () => {
    const fC = await ensureCoords(female, fCoords);
    const mC = await ensureCoords(male, mCoords);
    if (!fC || !mC) throw new Error("Please pick a valid location for both.");
    const fTz = await getTimezoneOffsetHours(fC.latitude, fC.longitude);
    const mTz = await getTimezoneOffsetHours(mC.latitude, mC.longitude);
    return {
      female: {
        ...parseDateTime(female.dob, female.tob),
        latitude: fC.latitude,
        longitude: fC.longitude,
        timezone: fTz,
      },
      male: {
        ...parseDateTime(male.dob, male.tob),
        latitude: mC.latitude,
        longitude: mC.longitude,
        timezone: mTz,
      },
      config: {
        observation_point: "topocentric",
        language: "en",
        ayanamsha: "lahiri",
      },
    };
  };
  /* -------------------------------------------------------------- */
  /* Submit handler */
  /* -------------------------------------------------------------- */
  /**
   * Handles form submission: validates, builds payload, calls APIs for matching and individuals,
   * parses results, saves to history, and sets state.
   * @param {Event} e - Form submit event.
   */
  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setFDetails(null);
    setMDetails(null);

    // Check if form data has changed and reset chat if needed
    checkAndResetChatOnFormChange();

    // Mark that chat should reset on next result (new form submission)
    setShouldResetChat(true);
    if (
      !female.fullName ||
      !female.dob ||
      !female.tob ||
      !female.place ||
      !male.fullName ||
      !male.dob ||
      !male.tob ||
      !male.place
    ) {
      setError(
        "Please complete all fields for both individuals, including names.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload = await buildPayload();
      const res = await astrologyAPI.getSingleCalculation(
        "match-making/ashtakoot-score",
        payload,
      );
      const out =
        typeof res?.output === "string"
          ? JSON.parse(res.output)
          : res?.output || res;
      setResult(out);
      saveToHistory({
        id: Date.now(),
        femaleName: female.fullName,
        femaleDob: female.dob,
        femaleTob: female.tob,
        femalePlace: female.place,
        maleName: male.fullName,
        maleDob: male.dob,
        maleTob: male.tob,
        malePlace: male.place,
        lastGenerated: new Date().toISOString(),
      });
      /* ---- Individual calculations ---- */
      const mkSinglePayload = (p) => ({
        year: p.year,
        month: p.month,
        date: p.date,
        hours: p.hours,
        minutes: p.minutes,
        seconds: p.seconds,
        latitude: p.latitude,
        longitude: p.longitude,
        timezone: p.timezone,
        config: { observation_point: "topocentric", ayanamsha: "lahiri" },
      });
      const fPayload = mkSinglePayload(payload.female);
      const mPayload = mkSinglePayload(payload.male);
      const endpoints = [
        "shadbala/summary",
        "vimsottari/dasa-information",
        "vimsottari/maha-dasas",
        "planets/extended",
      ];
      const [fCalc, mCalc] = await Promise.all([
        astrologyAPI.getMultipleCalculations(endpoints, fPayload),
        astrologyAPI.getMultipleCalculations(endpoints, mPayload),
      ]);

      // Validate that both API calls succeeded
      if (!fCalc || !fCalc.results) {
        console.error("[Matching] Female calculation failed:", fCalc);
        throw new Error(
          "Failed to fetch female individual data. Please try again.",
        );
      }
      if (!mCalc || !mCalc.results) {
        console.error("[Matching] Male calculation failed:", mCalc);
        throw new Error(
          "Failed to fetch male individual data. Please try again.",
        );
      }

      // Check for errors in API responses
      if (fCalc.errors && Object.keys(fCalc.errors).length > 0) {
        console.warn("[Matching] Female calculation errors:", fCalc.errors);
      }
      if (mCalc.errors && Object.keys(mCalc.errors).length > 0) {
        console.warn("[Matching] Male calculation errors:", mCalc.errors);
      }

      // If Maha Dasha API call failed, retry separately for each individual
      const retryMahaDashaIfNeeded = async (calc, payload, gender) => {
        const mahaError = calc.errors?.["vimsottari/maha-dasas"];
        const hasMahaData = calc.results?.["vimsottari/maha-dasas"];

        if (mahaError || !hasMahaData) {
          console.warn(
            `[Matching] ${gender} Maha Dasha data missing or error occurred, retrying...`,
            {
              error: mahaError,
              hasData: !!hasMahaData,
            },
          );

          try {
            const retryResult = await astrologyAPI.getSingleCalculation(
              "vimsottari/maha-dasas",
              payload,
            );

            if (retryResult && calc.results) {
              calc.results["vimsottari/maha-dasas"] = retryResult;
              // Remove error if retry succeeded
              if (calc.errors && calc.errors["vimsottari/maha-dasas"]) {
                delete calc.errors["vimsottari/maha-dasas"];
              }
              console.log(`[Matching] ${gender} Maha Dasha retry successful`);
            }
          } catch (retryError) {
            console.error(
              `[Matching] ${gender} Maha Dasha retry failed:`,
              retryError,
            );
            // Continue with existing data even if retry fails
          }
        }
      };

      // Retry Maha Dasha for both if needed
      await Promise.all([
        retryMahaDashaIfNeeded(fCalc, fPayload, "Female"),
        retryMahaDashaIfNeeded(mCalc, mPayload, "Male"),
      ]);

      // If Vimsottari data is missing, retry separately for each individual
      const retryVimsottariIfNeeded = async (calc, payload, gender) => {
        const vimsError = calc.errors?.["vimsottari/dasa-information"];
        const hasVimsData = calc.results?.["vimsottari/dasa-information"];

        if (vimsError || !hasVimsData) {
          console.warn(
            `[Matching] ${gender} Vimsottari data missing or error occurred, retrying...`,
            {
              error: vimsError,
              hasData: !!hasVimsData,
            },
          );

          try {
            const retryResult = await astrologyAPI.getSingleCalculation(
              "vimsottari/dasa-information",
              payload,
            );

            if (retryResult && calc.results) {
              calc.results["vimsottari/dasa-information"] = retryResult;
              // Remove error if retry succeeded
              if (calc.errors && calc.errors["vimsottari/dasa-information"]) {
                delete calc.errors["vimsottari/dasa-information"];
              }
              console.log(`[Matching] ${gender} Vimsottari retry successful`);
            }
          } catch (retryError) {
            console.error(
              `[Matching] ${gender} Vimsottari retry failed:`,
              retryError,
            );
            // Continue with existing data even if retry fails
          }
        }
      };

      // Retry Vimsottari for both if needed
      await Promise.all([
        retryVimsottariIfNeeded(fCalc, fPayload, "Female"),
        retryVimsottariIfNeeded(mCalc, mPayload, "Male"),
      ]);

      // Log to verify both have vimsottari data (only in development)
      if (process.env.NODE_ENV === "development") {
        const fVims = fCalc.results["vimsottari/dasa-information"];
        const mVims = mCalc.results["vimsottari/dasa-information"];
        console.log("[Matching] API Results:", {
          femaleHasVimsottari: !!fVims,
          maleHasVimsottari: !!mVims,
          femaleResultsKeys: Object.keys(fCalc.results || {}),
          maleResultsKeys: Object.keys(mCalc.results || {}),
          femaleErrors: fCalc.errors || {},
          maleErrors: mCalc.errors || {},
        });
      }
      const safeParse = (v) => {
        try {
          return typeof v === "string" ? JSON.parse(v) : v;
        } catch {
          return v;
        }
      };
      /**
       * Parses Shadbala raw response into structured data.
       * @param {any} raw - Raw API response.
       * @returns {object|null} Parsed Shadbala data.
       */
      const parseShadbala = (raw) => {
        if (!raw) return null;
        let sb = safeParse(safeParse(raw.output ?? raw));
        if (sb && typeof sb === "object" && sb.output)
          sb = safeParse(sb.output);
        return sb;
      };
      /**
       * Parses Maha Dasas raw response.
       * @param {any} raw - Raw API response.
       * @returns {object|null} Parsed Maha Dasas data.
       */
      const parseMaha = (raw) => {
        if (!raw) return null;
        let v = safeParse(safeParse(raw.output ?? raw));
        if (v && typeof v === "object" && v.output) v = safeParse(v.output);
        return v;
      };

      const parsePlanets = (raw) => {
        if (!raw) return null;
        let v = safeParse(safeParse(raw.output ?? raw));
        if (v && typeof v === "object" && v.output) {
          v = safeParse(v.output);
        }
        return v;
      };

      const currentDashaChain = (v) => {
        if (!v) return null;
        const cur = v.current || v.running || v.now || v?.mahadasha?.current;
        if (cur && (cur.md || cur.mahadasha)) {
          const md = cur.md || cur.mahadasha;
          const ad = cur.ad || cur.antardasha;
          const pd = cur.pd || cur.pratyantar;
          return [md, ad, pd]
            .filter(Boolean)
            .map((x) => (x.name || x.planet || x).toString().trim())
            .join(" > ");
        }
        const md = (v.mahadasha_list || v.mahadasha || v.md || [])[0];
        const adList = v.antardasha_list || v.antardasha || v.ad || {};
        const firstMdKey = md?.key || md?.planet || md?.name;
        const ad = Array.isArray(adList[firstMdKey])
          ? adList[firstMdKey][0]
          : Array.isArray(adList)
            ? adList[0]
            : null;
        const pdList = v.pratyantar_list || v.pd || {};
        const firstAdKey = ad?.key || ad?.planet || ad?.name;
        const pd = Array.isArray(pdList[firstAdKey])
          ? pdList[firstAdKey][0]
          : Array.isArray(pdList)
            ? pdList[0]
            : null;
        return [
          md?.name || md?.planet,
          ad?.name || ad?.planet,
          pd?.name || pd?.planet,
        ]
          .filter(Boolean)
          .join(" > ");
      };
      /**
       * Transforms Shadbala data into rows for display.
       * @param {object} sb - Shadbala data.
       * @returns {array} Array of planet strength rows.
       */
      const toShadbalaRows = (sb) => {
        if (!sb) return [];
        if (sb && typeof sb === "object") {
          const out = sb.output ?? sb.Output ?? sb.data;
          if (out) sb = typeof out === "string" ? safeParse(out) : out;
        }
        if (Array.isArray(sb))
          sb = sb.reduce(
            (acc, it) => (typeof it === "object" ? { ...acc, ...it } : acc),
            {},
          );
        const maybePlanets = sb.planets || sb || {};
        return Object.keys(maybePlanets)
          .filter((k) => typeof maybePlanets[k] === "object")
          .map((k) => {
            const p = maybePlanets[k];
            const percent =
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
            return { name: p.name || k, percent, ishta, kashta, retro };
          })
          .sort((a, b) => Number(b.percent ?? 0) - Number(a.percent ?? 0));
      };

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

      const toPlacements = (pl) => {
        if (!pl) return [];

        // planets/extended often comes as an object keyed by planet name
        if (typeof pl === "object" && !Array.isArray(pl)) {
          return Object.entries(pl).map(([name, v]) => {
            const signNum =
              v.current_sign != null ? Number(v.current_sign) : undefined;
            const currentSign = signNum
              ? `${SIGN_NAMES[(signNum - 1) % 12]} (${signNum})`
              : v.zodiac_sign_name || v.sign_name || v.sign || v.rashi;

            return {
              name: v.name || v.planet || name,
              currentSign,
              house: v.house_number ?? v.house,
              nakshatra: v.nakshatra_name || v.nakshatra,
              pada: v.nakshatra_pada || v.pada,
              retro:
                v.isRetro === "true" ||
                v.retrograde === true ||
                v.is_retro === true,
              fullDegree:
                typeof v.fullDegree === "number"
                  ? v.fullDegree
                  : typeof v.longitude === "number"
                    ? v.longitude
                    : undefined,
              normDegree:
                typeof v.normDegree === "number" ? v.normDegree : undefined,
            };
          });
        }

        // Fallback: array-like structures
        const arr = Array.isArray(pl)
          ? pl
          : pl.planets || pl.planet_positions || Object.values(pl || {});

        return (arr || []).map((p) => {
          const signNum =
            p.current_sign != null ? Number(p.current_sign) : undefined;
          const currentSign = signNum
            ? `${SIGN_NAMES[(signNum - 1) % 12]} (${signNum})`
            : p.zodiac_sign_name || p.sign || p.rashi || p.sign_name;

          return {
            name: p.name || p.planet,
            currentSign,
            house: p.house || p.house_number,
            nakshatra: p.nakshatra_name || p.nakshatra,
            pada: p.nakshatra_pada || p.pada,
            retro:
              p.retrograde === true ||
              p.is_retro === true ||
              String(p.isRetro).toLowerCase() === "true",
            fullDegree:
              typeof p.fullDegree === "number"
                ? p.fullDegree
                : typeof p.longitude === "number"
                  ? p.longitude
                  : undefined,
            normDegree:
              typeof p.normDegree === "number" ? p.normDegree : undefined,
          };
        });
      };

      const buildUserDetails = (calc) => {
        const r = calc?.results || {};
        const shadbala = parseShadbala(r["shadbala/summary"]);
        const vims = r["vimsottari/dasa-information"]
          ? safeParse(
              safeParse(
                r["vimsottari/dasa-information"].output ??
                  r["vimsottari/dasa-information"],
              ),
            )
          : null;
        const maha = parseMaha(r["vimsottari/maha-dasas"]);
        const planets = parsePlanets(r["planets/extended"]);
        return {
          currentDasha: currentDashaChain(vims) || null,
          shadbalaRows: toShadbalaRows(shadbala),
          placements: toPlacements(planets),
          vimsottari: vims, // Include raw vimsottari data for Chat component
          mahaDasas: maha, // Include maha dasas data for Chat component
        };
      };
      const fDetailsBuilt = buildUserDetails(fCalc);
      const mDetailsBuilt = buildUserDetails(mCalc);

      // Validate that both have vimsottari data (warn only if endpoint failed, not if it's just missing)
      if (!fDetailsBuilt.vimsottari) {
        const vimsError = fCalc.errors?.["vimsottari/dasa-information"];
        if (vimsError) {
          console.warn(
            "[Matching] ⚠️ Female vimsottari endpoint failed:",
            vimsError,
          );
        } else if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Matching] ⚠️ Female vimsottari data is missing (no error reported)",
            {
              fCalcResults: Object.keys(fCalc.results || {}),
              hasVimsottariEndpoint:
                !!fCalc.results["vimsottari/dasa-information"],
            },
          );
        }
      }
      if (!mDetailsBuilt.vimsottari) {
        const vimsError = mCalc.errors?.["vimsottari/dasa-information"];
        if (vimsError) {
          console.warn(
            "[Matching] ⚠️ Male vimsottari endpoint failed:",
            vimsError,
          );
        } else if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Matching] ⚠️ Male vimsottari data is missing (no error reported)",
            {
              mCalcResults: Object.keys(mCalc.results || {}),
              hasVimsottariEndpoint:
                !!mCalc.results["vimsottari/dasa-information"],
            },
          );
        }
      }

      setFDetails(fDetailsBuilt);
      setMDetails(mDetailsBuilt);

      // Prepare chat data with all details when results are ready
      // Use setTimeout to ensure state updates are complete
      setTimeout(() => {
        prepareChatData();
      }, 100);

      // Update form data hash when results are ready
      const newHash = generateFormDataHash();
      setCurrentFormDataHash(newHash);

      // Reset chat on new form submission (increment session ID to trigger reset)
      if (shouldResetChat) {
        setChatSessionId((prev) => prev + 1);
        setShouldResetChat(false);
      }

      // Update hash reference after successful submission
      previousFormDataHashRef.current = newHash;

      // Auto-scroll to results after successful calculation
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);

      // Return the computed result for callers that await onSubmit
      return out;
    } catch (err) {
      setError(err?.message || "Failed to compute matching score.");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------- */
  /* Chat functionality */
  /* -------------------------------------------------------------- */
  /**
   * Validates if all birth details are filled for both individuals.
   * @returns {boolean} True if all fields are filled, false otherwise.
   */
  const validateBirthDetails = () => {
    return (
      female.fullName &&
      female.dob &&
      female.tob &&
      female.place &&
      male.fullName &&
      male.dob &&
      male.tob &&
      male.place
    );
  };

  /**
   * Handles the Chat With AI button click.
   * Validates birth details, auto-calculates if needed, and opens chat.
   */
  const handleChatButtonClick = async () => {
    // Check if birth details are filled
    if (!validateBirthDetails()) {
      setError(
        "Please complete all fields for both individuals, including names, before using the chat.",
      );
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // If no result exists, calculate it first
    if (!result) {
      // Create a synthetic event to trigger form submission and await the computed result
      const syntheticEvent = { preventDefault: () => {} };
      const computed = await onSubmit(syntheticEvent);
      if (computed) {
        // result state is set inside onSubmit; prepare chat and open
        prepareChatData();
        setChatSessionId((prev) => prev + 1);
        setChatOpen(true);
        scrollToChat();
      }
    } else {
      // Result exists, prepare data and open chat
      prepareChatData();
      setChatSessionId((prev) => prev + 1);
      setChatOpen(true);
      scrollToChat();
    }
  };


const router = useRouter();

const onTalkToAstrologer = () => {
  router.push("/talk-to-astrologer");
};

  /**
   * Prepares the data to be passed to the Chat component.
   * Ensures ALL data is included: personal details, planet placements, ashtakoot, vimsottari, maha dasas.
   */
  const prepareChatData = () => {
    // Ensure we have all the data before preparing
    if (!result || !fDetails || !mDetails) {
      console.warn(
        "[Matching] prepareChatData called but data is incomplete:",
        {
          hasResult: !!result,
          hasFDetails: !!fDetails,
          hasMDetails: !!mDetails,
        },
      );
    }

    const data = {
      female: {
        input: {
          name: female.fullName,
          dob: female.dob,
          tob: female.tob,
          place: female.place,
          coords: fCoords,
        },
        // Pass the full details object with ALL data:
        // - currentDasha: Current Dasha chain
        // - shadbalaRows: Shadbala strength data
        // - placements: Planetary positions
        // - vimsottari: Full Vimsottari Dasha data
        // - mahaDasas: Maha Dasha timeline data
        details: fDetails || null,
      },
      male: {
        input: {
          name: male.fullName,
          dob: male.dob,
          tob: male.tob,
          place: male.place,
          coords: mCoords,
        },
        // Pass the full details object with ALL data:
        // - currentDasha: Current Dasha chain
        // - shadbalaRows: Shadbala strength data
        // - placements: Planetary positions
        // - vimsottari: Full Vimsottari Dasha data
        // - mahaDasas: Maha Dasha timeline data
        details: mDetails || null,
      },
      // Pass the complete match result with Ashtakoot scores
      // This includes: total_score, out_of, rasi_kootam, graha_maitri_kootam, yoni_kootam, gana_kootam, nadi_kootam
      match: result || null,
    };

    // Log data structure for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("[Matching] Chat data prepared:", {
        femaleName: data.female.input.name,
        maleName: data.male.input.name,
        hasMatch: !!data.match,
        matchTotalScore: data.match?.total_score,
        matchOutOf: data.match?.out_of,
        femaleHasDetails: !!data.female.details,
        maleHasDetails: !!data.male.details,
        femaleHasVimsottari: !!data.female.details?.vimsottari,
        maleHasVimsottari: !!data.male.details?.vimsottari,
        femaleHasMahaDasas: !!data.female.details?.mahaDasas,
        maleHasMahaDasas: !!data.male.details?.mahaDasas,
        femaleHasPlacements: !!data.female.details?.placements,
        maleHasPlacements: !!data.male.details?.placements,
        femaleHasShadbala: !!data.female.details?.shadbalaRows,
        maleHasShadbala: !!data.male.details?.shadbalaRows,
      });
    }

    setChatData(data);
    return data;
  };

  // Auto-update chatData when results/details change
  useEffect(() => {
    if (result && fDetails && mDetails) {
      // Prepare chat data with current state values
      const data = {
        female: {
          input: {
            name: female.fullName,
            dob: female.dob,
            tob: female.tob,
            place: female.place,
            coords: fCoords,
          },
          details: fDetails,
        },
        male: {
          input: {
            name: male.fullName,
            dob: male.dob,
            tob: male.tob,
            place: male.place,
            coords: mCoords,
          },
          details: mDetails,
        },
        match: result,
      };
      setChatData(data);

      // Update form data hash when results are ready
      const newHash = generateFormDataHash();
      setCurrentFormDataHash(newHash);
      previousFormDataHashRef.current = newHash;
    }
  }, [result, fDetails, mDetails, female, male, fCoords, mCoords]);

  // Monitor form data changes and reset chat if needed (before submission)
  useEffect(() => {
    // Only check if we have some form data filled
    if (female.fullName || male.fullName || female.dob || male.dob) {
      const newHash = generateFormDataHash();
      // Only reset if hash changed and we had a previous hash (not on initial load)
      if (
        previousFormDataHashRef.current !== null &&
        previousFormDataHashRef.current !== newHash
      ) {
        console.log(
          "[Matching] Form data changed before submission, will reset chat on submit:",
          {
            previousHash: previousFormDataHashRef.current,
            newHash: newHash,
          },
        );
        // Don't reset immediately, just mark that it should reset on next submit
        setShouldResetChat(true);
      }
      // Update the hash reference
      if (
        previousFormDataHashRef.current === null ||
        previousFormDataHashRef.current !== newHash
      ) {
        previousFormDataHashRef.current = newHash;
        setCurrentFormDataHash(newHash);
      }
    }
  }, [
    female.fullName,
    female.dob,
    female.tob,
    female.place,
    male.fullName,
    male.dob,
    male.tob,
    male.place,
  ]);

  // Monitor form data changes and reset chat if needed
  useEffect(() => {
    // Only check if we have some form data filled
    if (female.fullName || male.fullName || female.dob || male.dob) {
      checkAndResetChatOnFormChange();
    }
  }, [
    female.fullName,
    female.dob,
    female.tob,
    female.place,
    male.fullName,
    male.dob,
    male.tob,
    male.place,
  ]);

  /**
   * Scrolls to the chat section smoothly.
   */
  const scrollToChat = () => {
    setTimeout(() => {
      const aiSection = document.querySelector(".ai-astrologer-section");
      if (aiSection) {
        aiSection.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (chatRef.current) {
        chatRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  };
  /* -------------------------------------------------------------- */
  /* Sharing and Downloading Functions */
  /* -------------------------------------------------------------- */
  /**
   * Generates a shareable text summary of the matching result.
   * @returns {string} Formatted text for sharing.
   */
  const generateShareText = () => {
    if (!result) return "";
    const totalScore = Number(result?.total_score ?? 0);
    const outOf = Number(result?.out_of ?? 36);
    const percentage = Math.round((totalScore / outOf) * 100);
    const femaleName = female.fullName || "Female";
    const maleName = male.fullName || "Male";
    let text = `Astrology Match Result: ${femaleName} & ${maleName}\n`;
    text += `Ashtakoot Score: ${totalScore}/${outOf} (${percentage}%)\n\n`;
    text += "Koot Breakdown:\n";
    KOOTS.forEach((k) => {
      const sec = result?.[k];
      const name = k
        .replace(/_/g, " ")
        .replace(/kootam/i, "")
        .trim();
      const score = typeof sec?.score === "number" ? sec.score : 0;
      const outOfK = typeof sec?.out_of === "number" ? sec.out_of : 0;
      text += `${name}: ${score}/${outOfK}\n`;
    });
    text += `\nGenerated via Vedic Astrology Match Maker. Share your cosmic connection!`;
    return text;
  };

  /**
   * Handles sharing the result using Web Share API.
   */
  const handleShare = async () => {
    if (!result) {
      setError("No result to share.");
      return;
    }
    const shareText = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Astrology Match Result",
          text: shareText,
        });
      } catch (err) {
        console.error("Share failed:", err);
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        alert("Result copied to clipboard!");
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      alert("Result copied to clipboard! You can paste it anywhere.");
    }
  };

  /**
   * Generates and downloads a PDF report of the matching result.
   */
  const handleDownloadPDF = () => {
    if (!result) {
      setError("No result to download.");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Vedic Astrology Match Report", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 15;

    // Birth Info
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text("Birth Details:", margin, yPos);
    yPos += 10;
    const femaleName = female.fullName || "Female";
    const maleName = male.fullName || "Male";
    doc.text(
      `${femaleName}: ${fmtDate(female.dob)} ${fmtTime(female.tob)}, ${
        female.place
      }`,
      margin,
      yPos,
    );
    yPos += 7;
    doc.text(
      `${maleName}: ${fmtDate(male.dob)} ${fmtTime(male.tob)}, ${male.place}`,
      margin,
      yPos,
    );
    yPos += 15;

    // Score Summary
    doc.setFont(undefined, "bold");
    doc.text("Ashtakoot Compatibility Score:", margin, yPos);
    yPos += 7;
    doc.setFont(undefined, "normal");
    const totalScore = Number(result?.total_score ?? 0);
    const outOf = Number(result?.out_of ?? 36);
    doc.text(`${totalScore}/${outOf}`, margin, yPos);
    yPos += 15;

    // Koot Table
    doc.setFont(undefined, "bold");
    doc.text("Koot Breakdown:", margin, yPos);
    yPos += 10;
    const kootTableData = KOOTS.map((k) => {
      const sec = result?.[k];
      const name = k
        .replace(/_/g, " ")
        .replace(/kootam/i, "")
        .trim();
      const score = typeof sec?.score === "number" ? sec.score : 0;
      const outOfK = typeof sec?.out_of === "number" ? sec.out_of : 0;
      const area =
        {
          varna: "Spiritual Compatibility",
          vasya: "Mutual Affection / Control",
          tara: "Health & Longevity",
          yoni: "Sexual Compatibility",
          "graha maitri": "Mental Harmony",
          gana: "Temperament",
          rasi: "Love & Emotion",
          nadi: "Health & Genes",
        }[name.toLowerCase()] || "—";
      return [name, `${score}/${outOfK}`, area];
    });
    autoTable(doc, {
      startY: yPos,
      head: [["Kootam", "Points", "Area of Life"]],
      body: kootTableData,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [218, 165, 32] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 100 },
      },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // Female Details
    if (fDetails) {
      doc.setFont(undefined, "bold");
      doc.text("Female Details:", margin, yPos);
      yPos += 10;
      if (fDetails.currentDasha) {
        doc.setFont(undefined, "normal");
        doc.text(`Current Dasha: ${fDetails.currentDasha}`, margin, yPos);
        yPos += 7;
      }
      // Shadbala Table
      const fShadData = (fDetails.shadbalaRows || []).map((p) => [
        p.name,
        p.percent ? `${p.percent.toFixed(1)}%` : "—",
        p.ishta ? `${p.ishta.toFixed(1)}%` : "—",
        p.kashta ? `${p.kashta.toFixed(1)}%` : "—",
      ]);
      autoTable(doc, {
        startY: yPos,
        head: [["Planet", "Strength %", "Ishta %", "Kashta %"]],
        body: fShadData,
        theme: "grid",
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Male Details
    if (mDetails) {
      doc.setFont(undefined, "bold");
      doc.text("Male Details:", margin, yPos);
      yPos += 10;
      if (mDetails.currentDasha) {
        doc.setFont(undefined, "normal");
        doc.text(`Current Dasha: ${mDetails.currentDasha}`, margin, yPos);
        yPos += 7;
      }
      // Shadbala Table
      const mShadData = (mDetails.shadbalaRows || []).map((p) => [
        p.name,
        p.percent ? `${p.percent.toFixed(1)}%` : "—",
        p.ishta ? `${p.ishta.toFixed(1)}%` : "—",
        p.kashta ? `${p.kashta.toFixed(1)}%` : "—",
      ]);
      autoTable(doc, {
        startY: yPos,
        head: [["Planet", "Strength %", "Ishta %", "Kashta %"]],
        body: mShadData,
        theme: "grid",
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Footer
    doc.setFontSize(8);
    doc.setFont(undefined, "italic");
    doc.text(
      "Generated on " + new Date().toLocaleDateString(),
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );

    // Download
    doc.save(`astrology-match-${femaleName}-${maleName}-${Date.now()}.pdf`);
  };
  /* -------------------------------------------------------------- */
  /* Formatting helpers */
  /* -------------------------------------------------------------- */
  /**
   * Formats ISO date string to readable format (e.g., "November 13, 2025").
   * @param {string} iso - YYYY-MM-DD string.
   * @returns {string} Formatted date or "—" on error.
   */
  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      const [y, m, d] = iso.split("-");
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return dt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };
  /**
   * Formats time string to readable 12-hour format (e.g., "10:30 AM").
   * @param {string} hms - HH:MM string.
   * @returns {string} Formatted time or "—" on error.
   */
  const fmtTime = (hms) => {
    if (!hms) return "—";
    try {
      const [h, m] = hms.split(":").map(Number);
      const dt = new Date();
      dt.setHours(h || 0, m || 0, 0, 0);
      return dt.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return hms;
    }
  };
  // Koota categories for Ashtakoot
  const KOOTS = [
    "varna_kootam",
    "vasya_kootam",
    "tara_kootam",
    "yoni_kootam",
    "graha_maitri_kootam",
    "gana_kootam",
    "rasi_kootam",
    "nadi_kootam",
  ];

  /* -------------------------------------------------------------- */
  /* Person details component */
  /* -------------------------------------------------------------- */
  /**
   * PersonDetails Component
   *
   * Renders detailed astrological info for one person (Shadbala, placements, Dasha).
   *
   * @param {string} title - Person title (e.g., "Female").
   * @param {object} d - Details object with currentDasha, shadbalaRows, placements.
   * @returns {JSX.Element} Person details section.
   */
  const PersonDetails = ({ title, d }) => (
    <section className="person-card">
      <div className="person-header">
        <div className="person-title">{title}</div>
        <div className="person-planets">
          {d?.placements?.length || 0} planets
        </div>
      </div>
      <div className="person-dasha-label">Current Dasha</div>
      <div className="person-dasha">{d?.currentDasha || "—"}</div>
      <div className="person-grid">
        {/* Shadbala */}
        <div>
          <div className="section-title">Shadbala & Ishta/Kashta</div>
          <div className="shadbala-list">
            {(d?.shadbalaRows || []).map((r) => {
              const pct = r?.percent != null ? Number(r.percent) : null;
              const ishta = r?.ishta != null ? Number(r.ishta) : null;
              const kashta = r?.kashta != null ? Number(r.kashta) : null;
              const tone =
                pct >= 120 ? "success" : pct >= 100 ? "info" : "warn";
              return (
                <div key={`${title}-sb-${r.name}`} className="shadbala-item">
                  <div className="shadbala-head">
                    <div className="shadbala-name">
                      <span>{r.retro ? "R" : "Star"}</span>
                      <span>{r.name}</span>
                    </div>
                    <Badge tone={tone}>
                      {pct != null ? `${pct.toFixed(1)} %` : "—"}
                    </Badge>
                  </div>
                  <ProgressBar value={pct ?? 0} />
                  <div className="shadbala-sub">
                    <div>
                      <div className="sub-label">Ishta</div>
                      <ProgressBar value={ishta ?? 0} color="bg-emerald-500" />
                      <div className="sub-value">
                        {ishta != null ? `${ishta.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="sub-label">Kashta</div>
                      <ProgressBar value={kashta ?? 0} color="bg-rose-500" />
                      <div className="sub-value">
                        {kashta != null ? `${kashta.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {(!d?.shadbalaRows || d.shadbalaRows.length === 0) && (
              <div className="empty">No shadbala data</div>
            )}
          </div>
        </div>
        {/* Placements */}
        <div>
          <div className="section-title">Planet Placements (D1)</div>
          <div className="placement-grid">
            {(d?.placements || []).map((p) => (
              <div key={`${title}-pl-${p.name}`} className="placement-item">
                <div className="placement-head">
                  <div className="placement-name">
                    {p.retro ? `${p.name} (Retro)` : p.name}
                  </div>
                </div>
                <div className="placement-badges">
                  <Badge tone="neutral">Sign: {p.currentSign || "—"}</Badge>
                  <Badge tone="info">House: {p.house ?? "—"}</Badge>
                  {typeof p.fullDegree === "number" && (
                    <Badge tone="neutral">
                      {p.fullDegree.toFixed(2)} degrees
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {(!d?.placements || d.placements.length === 0) && (
              <div className="empty">No planet data</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const getCompatibilityVerdict = (score = 0, outOf = 36) => {
    const pct = (Number(score) / Number(outOf)) * 100;

    if (pct >= 85) {
      return {
        label: "Excellent Compatibility",
        tone: "success",
        description:
          "Strong emotional, mental, and spiritual alignment. This match flows naturally.",
      };
    }

    if (pct >= 70) {
      return {
        label: "Very Good Match",
        tone: "info",
        description:
          "Harmonious with minor adjustments needed in communication and expectations.",
      };
    }

    if (pct >= 55) {
      return {
        label: "Acceptable Match",
        tone: "neutral",
        description:
          "Moderate compatibility. Success depends on mutual effort and understanding.",
      };
    }

    if (pct >= 40) {
      return {
        label: "Challenging Match",
        tone: "warn",
        description:
          "Differences may cause friction. Conscious compromise is essential.",
      };
    }

    return {
      label: "Highly Challenging",
      tone: "warn",
      description:
        "Significant emotional and temperament gaps. Requires strong commitment and guidance.",
    };
  };

  /* -------------------------------------------------------------- */
  /* Render */
  /* -------------------------------------------------------------- */
  // Show full-page loading when submitting and no result yet
  if (submitting && !result) {
    return (
      <PageLoading
        type="matching"
        message="Analyzing compatibility between charts..."
      />
    );
  }

  return (
    <>
      {/* ---------------------------------------------------------- */}
      {/* PAGE CONTENT */}
      {/* ---------------------------------------------------------- */}
      <div className="app">
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
        {error && (
          <div
            className="error"
            style={{
              maxWidth: "1600px",
              margin: "2rem auto",
              padding: "0 2rem",
            }}
          >
            {error}
          </div>
        )}
        

        <div className="matching-page">
          <form onSubmit={onSubmit} className="match-form">

            {/* Header */}
            <header className="header left-align">
              <h1 className="title">Pro Kundali Match</h1>
            </header>

            {/* =====================
      CARDS
  ===================== */}
            <section className="birth-cards">
              {/* ========= FEMALE ========= */}
              <div className="birth-card female">
                <div className="birth-card-header">
                  <Moon className="icon-female" />
                  <h3 >{t.matching.femaleDetails}</h3>
                </div>

                <div className="birth-grid">
                  {/* Female Name */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="female-name">
                      {t.matching.femaleName}
                    </label>

                    <input
                      id="female-name"
                      type="text"
                      className="form-field-input"
                      placeholder="e.g., Priya"
                      value={female.fullName}
                      onChange={onChangePerson(
                        setFemale,
                        setFCoords,
                        setFSuggest,
                        fTimer,
                        "fullName",
                      )}
                      required
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="female-dob">
                      {t.matching.dateOfBirth}
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="female-dob"
                        ref={fDateInputRef}
                        type="date"
                        className="form-field-input"
                        value={female.dob}
                        onChange={onChangePerson(
                          setFemale,
                          setFCoords,
                          setFSuggest,
                          fTimer,
                          "dob",
                        )}
                        required
                      />

                      <button
                        type="button"
                        className="calendar-icon-btn"
                        onClick={() =>
                          fDateInputRef.current?.showPicker?.() ||
                          fDateInputRef.current?.click()
                        }
                      >
                        <Calendar />
                      </button>
                    </div>
                  </div>

                  {/* Time of Birth */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="female-tob">
                      {t.matching.timeOfBirth}
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="female-tob"
                        ref={fTimeInputRef}
                        type="time"
                        step="60"
                        className="form-field-input"
                        value={female.tob}
                        onChange={onChangePerson(
                          setFemale,
                          setFCoords,
                          setFSuggest,
                          fTimer,
                          "tob",
                        )}
                        required
                      />

                      <button
                        type="button"
                        className="clock-icon-btn"
                        onClick={() =>
                          fTimeInputRef.current?.showPicker?.() ||
                          fTimeInputRef.current?.click()
                        }
                      >
                        <Clock />
                      </button>
                    </div>
                  </div>

                  {/* Place */}
                  <div className="form-field full">
                    <label className="form-field-label" htmlFor="female-place">
                      Place
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="female-place"
                        type="text"
                        className="form-field-input"
                        placeholder="e.g., Mumbai, India"
                        value={female.place}
                        onChange={onChangePerson(
                          setFemale,
                          setFCoords,
                          setFSuggest,
                          fTimer,
                          "place",
                        )}
                        autoComplete="off"
                        required
                      />

                      <button
                        type="button"
                        className="location-icon-btn"
                        title="Use current location"
                        onClick={useMyLocationFemale}
                      >
                        <MapPin />
                      </button>
                    </div>

                    {fSuggest.length > 0 && (
                      <div className="suggestions">
                        {fSuggest.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setFemale((p) => ({ ...p, place: s.label }));
                              setFCoords(s);
                              setFSuggest([]);
                            }}
                          >
                            <MapPin size={14} />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ========= MALE ========= */}
              <div className="birth-card male">
                <div className="birth-card-header">
                  <Sun className="icon-male" />
                  <h3>{t.matching.maleDetails}</h3>
                </div>

                <div className="birth-grid">
                  {/* Female Name */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="female-name">
                      {t.matching.femaleName}
                    </label>

                    <input
                      id="female-name"
                      type="text"
                      className="form-field-input"
                      placeholder="e.g., Priya"
                      value={female.fullName}
                      onChange={onChangePerson(
                        setFemale,
                        setFCoords,
                        setFSuggest,
                        fTimer,
                        "fullName",
                      )}
                      required
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="female-dob">
                      {t.matching.dateOfBirth}
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="female-dob"
                        ref={fDateInputRef}
                        type="date"
                        className="form-field-input"
                        value={female.dob}
                        onChange={onChangePerson(
                          setFemale,
                          setFCoords,
                          setFSuggest,
                          fTimer,
                          "dob",
                        )}
                        required
                      />

                      <button
                        type="button"
                        className="calendar-icon-btn"
                        onClick={() =>
                          fDateInputRef.current?.showPicker?.() ||
                          fDateInputRef.current?.click()
                        }
                      >
                        <Calendar />
                      </button>
                    </div>
                  </div>

                  {/* Time of Birth */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="female-tob">
                      {t.matching.timeOfBirth}
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="female-tob"
                        ref={fTimeInputRef}
                        type="time"
                        step="60"
                        className="form-field-input"
                        value={female.tob}
                        onChange={onChangePerson(
                          setFemale,
                          setFCoords,
                          setFSuggest,
                          fTimer,
                          "tob",
                        )}
                        required
                      />

                      <button
                        type="button"
                        className="clock-icon-btn"
                        onClick={() =>
                          fTimeInputRef.current?.showPicker?.() ||
                          fTimeInputRef.current?.click()
                        }
                      >
                        <Clock />
                      </button>
                    </div>
                  </div>

                  {/* Place */}
                  <div className="form-field full">
                    <label className="form-field-label" htmlFor="female-place">
                      Place
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="female-place"
                        type="text"
                        className="form-field-input"
                        placeholder="e.g., Mumbai, India"
                        value={female.place}
                        onChange={onChangePerson(
                          setMale,
                          setMCoords,
                          setMSuggest,
                          fTimer,
                          "place",
                        )}
                        autoComplete="off"
                        required
                      />

                      <button
                        type="button"
                        className="location-icon-btn"
                        title="Use current location"
                        onClick={useMyLocationMale}
                      >
                        <MapPin />
                      </button>
                    </div>

                    {fSuggest.length > 0 && (
                      <div className="suggestions">
                        {fSuggest.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setMale((p) => ({ ...p, place: s.label }));
                              setMCoords(s);
                              setMSuggest([]);
                            }}
                          >
                            <MapPin size={14} />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* =====================
      ACTIONS
  ===================== */}
            <footer className="form-actions">
              <button
                type="submit"
                className="primary-btn"
                disabled={submitting || fFilled < 3 || mFilled < 3}
              >
                {submitting ? "Calculating…" : "Check Compatibility"}
              </button>

              <button
                type="reset"
                className="ghost-btn"
                onClick={resetAllFields}
              >
                Reset
              </button>
            </footer>
          </form>

{/* ===================== */}
{/* HISTORY BELOW FORM */}
{/* ===================== */}
<section className="history-section">

  {/* ---------- Header ---------- */}
  <div className="history-header mt-6">
    <h3 className="history-title flex" style={{ fontSize:"2.25rem", color: "var(--color-gold)", fontWeight: "500", textAlign:"center", }}>
      <Sparkles className="w-5 h-5" style={{ color: "var(--color-gold)" }} />
      Saved Profiles
    </h3>

    {history.length > 0 && (
      <button
        onClick={clearHistory}
        className="btn-ghost"
      >
        <RotateCcw className="w-4 h-4" />
        Clear
      </button>
    )}
  </div>

  {/* ---------- Search ---------- */}
  {history.length > 0 && (
    <input
      type="text"
      placeholder="Search by name, place, or date..."
      value={historySearch}
      onChange={(e) => setHistorySearch(e.target.value)}
      className="history-search"
    />
  )}

  {/* ---------- Horizontal Scroll ---------- */}
  <div className="history-scroll-area horizontal">
    {history.length === 0 ? (
      <div className="empty-state">No matching history yet.</div>
    ) : filteredHistory.length === 0 ? (
      <div className="empty-state">No matches found.</div>
    ) : (
      <div className="history-cards horizontal">
        {filteredHistory.map((item) => {
          const isExpanded =
            expandedAddresses[`${item.id}-female`] ||
            expandedAddresses[`${item.id}-male`];

          return (
<div
  key={item.id}
  className="history-card history-card-row"
  onClick={() => loadHistoryIntoForm(item)}
  style={{
    alignItems: "center",        // prevent vertical stretching
    maxHeight: "unset",
  }}
>
  {/* LEFT: FEMALE + MALE */}
  <div className="history-row-left" style={{ gap: "0.75rem" }}>
    {/* FEMALE */}
    <div className="history-row-person">
      <span className="pill pill-female">
        {item.femaleName || "Female"}
      </span>

      <div className="history-row-details">
        <div className="person-meta">
          <Calendar className="meta-icon" />
          <span>{item.femaleDob || "-"} · {item.femaleTob || "-"}</span>
        </div>

        <div className="person-meta">
          <MapPin className="meta-icon" />
          <span className="address-text">
            {item.femalePlace || "-"}
          </span>
        </div>
      </div>
    </div>

    {/* MALE */}
    <div className="history-row-person">
      <span className="pill pill-male">
        {item.maleName || "Male"}
      </span>

      <div className="history-row-details">
        <div className="person-meta">
          <Calendar className="meta-icon" />
          <span>{item.maleDob || "-"} · {item.maleTob || "-"}</span>
        </div>

        <div className="person-meta">
          <MapPin className="meta-icon" />
          <span className="address-text">
            {item.malePlace || "-"}
          </span>
        </div>
      </div>
    </div>
  </div>

  {/* CENTER: COMPATIBILITY */}
  <div
    className="history-row-compatibility"
    style={{
      alignSelf: "stretch",
      justifyContent: "center",
      minWidth: "140px",
    }}
  >
    <span className="compatibility-label">Compatibility</span>
    <span className="compatibility-value">
      {item.compatibility || "—"}
    </span>
  </div>

  {/* RIGHT: ACTIONS */}
  <div
    className="history-row-actions"
    style={{
      justifyContent: "center",
      alignItems: "stretch",
      gap: "0.5rem",
    }}
  >
    <button
      className="use-btn"
      style={{
        flex: "unset",
        height: "40px",          // 🔑 stops vertical stretch
        padding: "0 1rem",
      }}
      onClick={(e) => {
        e.stopPropagation();
        loadHistoryIntoForm(item);
      }}
    >
      Load
    </button>

    <button
      className="delete-btn"
      style={{
        flex: "unset",
        height: "40px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      }}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</div>
          );
        })}
      </div>
    )}
  </div>
</section>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* RESULT SECTION */}
        {/* ---------------------------------------------------------- */}
        {result && (
          <div ref={resultsRef} className="app fade-in">
            {/* Background Orbs */}
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


            {/* Birth Info Snapshot */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Female Birth Info */}
              <div className="card">
                <div className="results-header">
                  <Moon style={{ color: "#a78bfa" }} />
                  <h3 className="results-title">Female Birth Information</h3>
                </div>
                <div className="birth-info-grid">
                  {[
                    {
                      icon: Sparkles,
                      label: "Full Name",
                      value: female.fullName || "—",
                    },
                    {
                      icon: Calendar,
                      label: "Date",
                      value: fmtDate(female.dob),
                    },
                    { icon: Clock, label: "Time", value: fmtTime(female.tob) },
                    {
                      icon: MapPin,
                      label: "Place",
                      value: female.place || "—",
                    },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="info-card">
                        <div className="info-label">
                          <Icon />
                          {item.label}
                        </div>
                        <div className="info-value">{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Male Birth Info */}
              <div className="card">
                <div className="results-header">
                  <Sun style={{ color: "#ca8a04" }} />
                  <h3 className="results-title">Male Birth Information</h3>
                </div>
                <div className="birth-info-grid">
                  {[
                    {
                      icon: Sparkles,
                      label: "Full Name",
                      value: male.fullName || "—",
                    },
                    { icon: Calendar, label: "Date", value: fmtDate(male.dob) },
                    { icon: Clock, label: "Time", value: fmtTime(male.tob) },
                    { icon: MapPin, label: "Place", value: male.place || "—" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="info-card">
                        <div className="info-label">
                          <Icon />
                          {item.label}
                        </div>
                        <div className="info-value">{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Verdict Card */}
            <div className="card mt-6">
              <div className="results-header">
                <Sun style={{ color: "#ca8a04" }} />
                <h3 className="results-title">Ashtakoot Compatibility</h3>
              </div>

              {(() => {
                const verdict = getCompatibilityVerdict(
                  result?.total_score,
                  result?.out_of,
                );

                return (
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl font-bold text-gold">
                        {Number(result?.total_score ?? 0)}
                        <span className="text-gray-500 text-xl">
                          /{Number(result?.out_of ?? 36)}
                        </span>
                      </div>

                      <Badge tone={verdict.tone}>{verdict.label}</Badge>

                      <div className="liveBadge">
                        <div className="pulseDot" /> Score Summary
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 max-w-xl">
                      {verdict.description}
                    </p>
                  </div>
                );
              })()}

              {/* Koot Table */}
              <div className="table-scroll-container mt-4">
                <table className="planet-table">
                  <thead>
                    <tr>
                      <th>Kootam</th>
                      <th>Points</th>
                      <th>Area of Life</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KOOTS.map((k) => {
                      const sec = result?.[k];
                      const name = k
                        .replace(/_?kootam/i, "")
                        .replace(/_/g, " ")
                        .trim();
                      const score =
                        typeof sec?.score === "number" ? sec.score : "—";
                      const outOf =
                        typeof sec?.out_of === "number" ? sec.out_of : "—";

                      // Define the meaning map OUTSIDE normalization scope
                      const meaningMap = {
                        varna: "Spiritual Compatibility",
                        vasya: "Mutual Affection / Control",
                        tara: "Health & Longevity",
                        yoni: "Sexual Compatibility",
                        graha_maitri: "Mental Harmony",
                        gana: "Temperament",
                        rasi: "Love & Emotion",
                        nadi: "Health & Genes",
                      };

                      // Normalize name to match map keys correctly
                      const normalizedKey = k
                        .replace(/_?kootam/i, "")
                        .trim()
                        .toLowerCase();

                      const area = meaningMap[normalizedKey] || "—";

                      return (
                        <tr key={k}>
                          <td className="capitalize font-medium text-gray-700">
                            {name}
                          </td>
                          <td className="font-semibold text-gray-900">
                            {score} / {outOf}
                          </td>
                          <td className="text-gray-600">{area}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Female and Male Details */}
            {(fDetails || mDetails) && (
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                {/* Female Details */}
                <div className="flex flex-col gap-6">
                  {/* Female Shadbala Card */}
                  {fDetails && (
                    <div className="card">
                      <div className="results-header">
                        <Moon style={{ color: "#a78bfa" }} />
                        <h3 className="results-title">
                          {t.matching.femaleDetails} - Shadbala
                        </h3>
                      </div>
                      <div className="card summary-card female">
                        <h4>How strong is her chart overall?</h4>

                        <div className="summary-score">
                          <span className="score-pill good">Strong</span>
                          <span className="score-text">
                            Emotional stability and relationship support are
                            favorable
                          </span>
                        </div>

                        <ul className="summary-points">
                          <li>✔ Moon and Venus are supportive</li>
                          <li>⚠ Mars shows emotional friction</li>
                          <li>🔒 Exact remedies & timing locked</li>
                        </ul>

                        <button
                          className="unlock-btn"
                          onClick={onTalkToAstrologer}
                        >
                          Understand what this means →
                        </button>
                      </div>
                      {/* Shadbala / Ishta-Kashta */}
                      <div>
                        <table className="planet-table shadbala-table">
                          <thead>
                            <tr>
                              <th style={{ textAlign: "center" }}>Planet</th>
                              <th style={{ textAlign: "center" }}>Strength</th>
                              <th style={{ textAlign: "center" }}>Ishta</th>
                              <th style={{ textAlign: "center" }}>Kashta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(fDetails?.shadbalaRows || []).map((p, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 500 }}>
                                  {p.name || "—"}
                                </td>
                                <td>
                                  {p.percent ? `${p.percent.toFixed(1)}%` : "—"}
                                </td>
                                <td>
                                  {p.ishta != null ? (
                                    <div className="progress-container">
                                      <div className="progress-bar">
                                        <div
                                          className="progress-fill"
                                          style={{ width: `${p.ishta}%` }}
                                        />
                                      </div>
                                      <div className="progress-label">
                                        {p.ishta.toFixed(1)}%
                                      </div>
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>
                                  {p.kashta != null ? (
                                    <div className="progress-container">
                                      <div className="progress-bar">
                                        <div
                                          className="progress-fill"
                                          style={{ width: `${p.kashta}%` }}
                                        />
                                      </div>
                                      <div className="progress-label">
                                        {p.kashta.toFixed(1)}%
                                      </div>
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Female Planet Placements Card */}
                  {fDetails && (
                    <div className="card">
                      <div className="results-header">
                        <Moon style={{ color: "#a78bfa" }} />
                        <h3 className="results-title">
                          {t.matching.femaleDetails} - Planet Placements
                        </h3>
                      </div>

                      {/* Planet Placements */}
                      <div className="table-scroll-container">
                        <table className="planet-table placements-table">
                          <thead>
                            <tr>
                              <th>Planet</th>
                              <th>Sign</th>
                              <th>House</th>
                              <th>Nakshatra</th>
                              <th>Degrees</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(fDetails?.placements || []).map((p, i) => {
                              const nakshatraDisplay = `${p.nakshatra ?? "—"} (${
                                p.pada ?? "—"
                              })`;

                              return (
                                <tr key={i}>
                                  <td style={{ fontWeight: 500 }}>
                                    <div className="planet-cell">
                                      <span>{p.name}</span>
                                      {p.retro && (
                                        <span className="planet-retro">
                                          (Retro)
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td>{p.currentSign || "—"}</td>
                                  <td>{p.house ?? "—"}</td>
                                  <td>{nakshatraDisplay}</td>
                                  <td>
                                    <div className="deg-cell">
                                      {typeof p.fullDegree === "number" && (
                                        <div>
                                          Full: {p.fullDegree.toFixed(2)}°
                                        </div>
                                      )}
                                      {typeof p.normDegree === "number" && (
                                        <div className="deg-norm">
                                          Norm: {p.normDegree.toFixed(2)}°
                                        </div>
                                      )}
                                      {typeof p.fullDegree !== "number" &&
                                        typeof p.normDegree !== "number" &&
                                        "—"}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Male Details */}
                <div className="flex flex-col gap-6">
                  {/* Male Shadbala Card */}
                  {mDetails && (
                    <div className="card">
                      <div className="results-header">
                        <Sun style={{ color: "#d4af37" }} />
                        <h3 className="results-title">
                          {t.matching.maleDetails} - Shadbala
                        </h3>
                      </div>

                                            <div className="card summary-card female " style={{ marginBottom: "1.5rem", fontWeight: "500" }}>
                        <h4>How strong is his chart overall?</h4>

                        <div className="summary-score">
                          <span className="score-pill good">Strong</span>
                          <span className="score-text">
                            Emotional stability and relationship support are
                            favorable
                          </span>
                        </div>

                        <ul className="summary-points">
                          <li>✔ Moon and Venus are supportive</li>
                          <li>⚠ Mars shows emotional friction</li>
                          <li>🔒 Exact remedies & timing locked</li>
                        </ul>

                        <button
                          className="unlock-btn"
                          onClick={onTalkToAstrologer}
                        >
                          Understand what this means →
                        </button>
                      </div>

                      {/* Shadbala / Ishta-Kashta */}
                      <div>
                        <table className="planet-table shadbala-table">
                          <thead>
                            <tr>
                              <th style={{ textAlign: "center" }}>Planet</th>
                              <th style={{ textAlign: "center" }}>Strength</th>
                              <th style={{ textAlign: "center" }}>Ishta</th>
                              <th style={{ textAlign: "center" }}>Kashta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(mDetails?.shadbalaRows || []).map((p, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 500 }}>
                                  {p.name || "—"}
                                </td>
                                <td>
                                  {p.percent ? `${p.percent.toFixed(1)}%` : "—"}
                                </td>
                                <td>
                                  {p.ishta != null ? (
                                    <div className="progress-container">
                                      <div className="progress-bar">
                                        <div
                                          className="progress-fill"
                                          style={{ width: `${p.ishta}%` }}
                                        />
                                      </div>
                                      <div className="progress-label">
                                        {p.ishta.toFixed(1)}%
                                      </div>
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>
                                  {p.kashta != null ? (
                                    <div className="progress-container">
                                      <div className="progress-bar">
                                        <div
                                          className="progress-fill"
                                          style={{ width: `${p.kashta}%` }}
                                        />
                                      </div>
                                      <div className="progress-label">
                                        {p.kashta.toFixed(1)}%
                                      </div>
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Male Planet Placements Card */}
                  {mDetails && (
                    <div className="card">
                      <div className="results-header">
                        <Sun style={{ color: "#d4af37" }} />
                        <h3 className="results-title">
                          {t.matching.maleDetails} - Planet Placements
                        </h3>
                      </div>

                      {/* Planet Placements */}
                      <div className="table-scroll-container">
                        <table className="planet-table placements-table">
                          <thead>
                            <tr>
                              <th>Planet</th>
                              <th>Sign</th>
                              <th>House</th>
                              <th>Nakshatra</th>
                              <th>Degrees</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(mDetails?.placements || []).map((p, i) => {
                              const nakshatraDisplay = `${p.nakshatra ?? "—"} (${
                                p.pada ?? "—"
                              })`;

                              return (
                                <tr key={i}>
                                  <td style={{ fontWeight: 500 }}>
                                    <div className="planet-cell">
                                      <span>{p.name}</span>
                                      {p.retro && (
                                        <span className="planet-retro">
                                          (Retro)
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td>{p.currentSign || "—"}</td>
                                  <td>{p.house ?? "—"}</td>
                                  <td>{nakshatraDisplay}</td>
                                  <td>
                                    <div className="deg-cell">
                                      {typeof p.fullDegree === "number" && (
                                        <div>
                                          Full: {p.fullDegree.toFixed(2)}°
                                        </div>
                                      )}
                                      {typeof p.normDegree === "number" && (
                                        <div className="deg-norm">
                                          Norm: {p.normDegree.toFixed(2)}°
                                        </div>
                                      )}
                                      {typeof p.fullDegree !== "number" &&
                                        typeof p.normDegree !== "number" &&
                                        "—"}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="actionBar mt-8">
              <button className="btn btn-ghost" onClick={resetAllFields}>
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <div className="flex gap-3">
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadPDF}
                  disabled={!result}
                >
                  Download PDF
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleShare}
                  disabled={!result}
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Explanation Card - Below form and history */}
        <div
          style={{
            marginTop: "-3rem",
            width: "100%",
            padding: "0 1rem",
            margin: "0 auto",
          }}
        >
          <div
            className="card backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-xl border"
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))",
              borderColor: "rgba(212, 175, 55, 0.3)",
              maxWidth: "100%",
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
                Understanding Compatibility Matching
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
                The <strong>Ashtakoot System</strong> (8-Point Matching)
                evaluates compatibility across eight key dimensions:{" "}
                <strong>Varna</strong> (spiritual compatibility),{" "}
                <strong>Vashya</strong> (mutual attraction),{" "}
                <strong>Tara</strong> (birth star compatibility),{" "}
                <strong>Yoni</strong> (nature compatibility),{" "}
                <strong>Graha Maitri</strong> (planetary friendship),{" "}
                <strong>Gana</strong> (temperament), <strong>Bhakoot</strong>{" "}
                (emotional compatibility), and <strong>Nadi</strong> (health
                compatibility). Each dimension contributes points to the total
                compatibility score, with higher scores indicating better
                alignment between partners.
              </p>
            </div>
          </div>
        </div>

        <a
          href="/talk-to-astrologer"
          className="global-floater global-floater--astrologer"
          aria-label="Talk to Astrologer"
        >
          <PhoneCallIcon className="global-floater-icon" />
          <span className="global-floater-text">Talk to Astrologer</span>
        </a>

        {/* Astrologer Assistant Floating Card */}
        <AstrologerAssistant
          pageTitle="Matching"
          initialData={(() => {
            // Use chatData if available, otherwise build from current state
            const data = chatData || {
              female: {
                input: {
                  name: female.fullName,
                  dob: female.dob,
                  tob: female.tob,
                  place: female.place,
                  coords: fCoords,
                },
                details: fDetails,
              },
              male: {
                input: {
                  name: male.fullName,
                  dob: male.dob,
                  tob: male.tob,
                  place: male.place,
                  coords: mCoords,
                },
                details: mDetails,
              },
              match: result || null,
            };
            return data;
          })()}
          chatType="matchmaking"
          shouldReset={shouldResetChat}
          formDataHash={currentFormDataHash}
          chatSessionId={chatSessionId}
          show={true}
          hasData={!!result}
        />
      </div>
    </>
  );
}
