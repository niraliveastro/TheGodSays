"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { PageLoading } from "@/components/LoadingStates";
import "./matching_styles.css";
import MatchInsights from "./components/MatchInsights";
import MatchRemedies from "./components/MatchRemedies";
import AdvancedMatchGuidance from "./components/AdvancedMatchRemedies";
import ChartStrengthComparison from "./components/ChartStrength";
import LifeTogetherInsight from "./components/LifeTogether"
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
  PhoneIcon,
  Loader2,
} from "lucide-react";
import { IoHeartCircle } from "react-icons/io5";
import AstrologerAssistantTab from "@/components/AstrologerAssistantTab";
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

import PageSEO from "@/components/PageSEO";

// Lazy load heavy components for better initial load
const Modal = lazy(() => import("@/components/Modal"));
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
  const googleLoaded = useGoogleMaps();
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
  const [fCoords, setFCoords] = useState(null);
  const [mCoords, setMCoords] = useState(null);
  const [fSuggest, setFSuggest] = useState([]);
  const [mSuggest, setMSuggest] = useState([]);
  const [fLocating, setFLocating] = useState(false);
  const [mLocating, setMLocating] = useState(false);
  const [fSuggesting, setFSuggesting] = useState(false);
  const [mSuggesting, setMSuggesting] = useState(false);
  const fTimer = useRef(null);
  const mTimer = useRef(null);
  const fDateInputRef = useRef(null);
  const mDateInputRef = useRef(null);
  const fTimeInputRef = useRef(null);
  const mTimeInputRef = useRef(null);
  const [expandedAddresses, setExpandedAddresses] = useState({});
  const fAutocompleteService = useRef(null);
  const mAutocompleteService = useRef(null);
  const fPlacesService = useRef(null);
  const mPlacesService = useRef(null);

  // Submission and result state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [fDetails, setFDetails] = useState(null);
  const [mDetails, setMDetails] = useState(null);

  // === Chat State ===
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(0);
  const [shouldResetChat, setShouldResetChat] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [isAssistantMinimized, setIsAssistantMinimized] = useState(false);
  const chatRef = useRef(null);
  const resultsRef = useRef(null);

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
    setFemale({ fullName: "", dob: "", tob: "", place: "" });
    setMale({ fullName: "", dob: "", tob: "", place: "" });
    setFCoords(null);
    setMCoords(null);
    setFSuggest([]);
    setMSuggest([]);
    setError("");
    setResult(null);
    setFDetails(null);
    setMDetails(null);
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
  // Option 1: Make the whole onChange handler async (most common fix)
  const onChangePerson =
    (setter, coordsSetter, suggestSetter, timerRef, key, setSuggesting) =>
    async (e) => {
      const v = e.target.value;
      setter((prev) => ({ ...prev, [key]: v }));

      if (key === "place") {
        coordsSetter(null);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
          if (!googleLoaded || !v || v.length < 2) {
            suggestSetter([]);
            return;
          }

          setSuggesting(true);

          try {
            const { AutocompleteSuggestion } =
              await window.google.maps.importLibrary("places");

            const { suggestions } =
              await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input: v,
                language: "en",
                region: "IN",
              });

            suggestSetter(
              (suggestions || []).map((s) => ({
                label: s.placePrediction.text.text,
                placeId: s.placePrediction.placeId,
              })),
            );

            console.log(
              "[Matching] Got suggestions:",
              suggestions?.length || 0,
            );
          } catch (err) {
            console.warn("Google Places autocomplete failed:", err);
            suggestSetter([]);
          } finally {
            setSuggesting(false);
          }
        }, 300);
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

    if (dobParts.length === 3) {
      if (dobParts[0] > 1900) {
        [Y, M, D] = dobParts;
      } else {
        [D, M, Y] = dobParts;
      }
    } else {
      throw new Error(`Invalid date format: ${dob}`);
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

    if (Y < 1900 || Y > 2100)
      throw new Error(`Year must be between 1900 and 2100: ${Y}`);
    if (M < 1 || M > 12)
      throw new Error(`Month must be between 1 and 12: ${M}`);
    if (D < 1 || D > 31) throw new Error(`Date must be between 1 and 31: ${D}`);

    if (!tob) throw new Error("Time of birth is required");
    const timeParts = tob.split(":").map((n) => parseInt(n, 10));
    const [H, Min, S = 0] = timeParts;

    if (Number.isNaN(H) || Number.isNaN(Min) || Number.isNaN(S)) {
      throw new Error(`Invalid time format: ${tob}`);
    }

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
      if (!googleLoaded || !window.google?.maps) {
        return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
      }

      const geocoder = new window.google.maps.Geocoder();
      const res = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
          if (status === "OK" && results?.length) {
            resolve(results[0]);
          } else {
            reject(status);
          }
        });
      });

      return res.formatted_address || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
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
    setError("");

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = pos.coords;
      const label = await reverseGeocodeCoords(latitude, longitude);

      setFemale((prev) => ({ ...prev, place: label }));
      setFCoords({ latitude, longitude, label });
      setFSuggest([]);

      console.log("[Matching] Female location:", {
        latitude,
        longitude,
        label,
      });
    } catch (e) {
      console.error("[Matching] Female location error:", e);
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
    setError("");

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = pos.coords;
      const label = await reverseGeocodeCoords(latitude, longitude);

      setMale((prev) => ({ ...prev, place: label }));
      setMCoords({ latitude, longitude, label });
      setMSuggest([]);

      console.log("[Matching] Male location:", { latitude, longitude, label });
    } catch (e) {
      console.error("[Matching] Male location error:", e);
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

    checkAndResetChatOnFormChange();
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
        compatibility: `${out?.total_score ?? 0}/${out?.out_of ?? 36}`,
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
        "horoscope-chart-svg-code",
        "navamsa-chart-svg-code",
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

        const normalizeSvg = (v) => {
          if (!v) return null;
          const raw = typeof v === "string" ? v : v?.output || v?.svg || null;
          return typeof raw === "string" && raw.includes("<svg") ? raw : null;
        };

        const d1ChartSvg = normalizeSvg(r["horoscope-chart-svg-code"]);

        const d9ChartSvg = normalizeSvg(r["navamsa-chart-svg-code"]);

        return {
          currentDasha: currentDashaChain(vims) || null,
          shadbalaRows: toShadbalaRows(shadbala),
          placements: toPlacements(planets),
          vimsottari: vims,
          mahaDasas: maha,

          d1ChartSvg,
          d9ChartSvg,
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

  // Add useEffect to monitor suggestion state changes
  useEffect(() => {
    console.log("[Female Debug] fSuggest state changed:", fSuggest);
    console.log("[Female Debug] fSuggest.length:", fSuggest.length);
  }, [fSuggest]);

  useEffect(() => {
    console.log("[Male Debug] mSuggest state changed:", mSuggest);
    console.log("[Male Debug] mSuggest.length:", mSuggest.length);
  }, [mSuggest]);

  useEffect(() => {
    console.log("[Female Debug] fSuggesting state changed:", fSuggesting);
  }, [fSuggesting]);

  useEffect(() => {
    console.log("[Male Debug] mSuggesting state changed:", mSuggesting);
  }, [mSuggesting]);

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

  useEffect(() => {
    if (!googleLoaded || !window.google?.maps?.places) return;

    // Female services
    fAutocompleteService.current =
      new window.google.maps.places.AutocompleteService();
    fPlacesService.current = new window.google.maps.places.PlacesService(
      document.createElement("div"),
    );

    // Male services
    mAutocompleteService.current =
      new window.google.maps.places.AutocompleteService();
    mPlacesService.current = new window.google.maps.places.PlacesService(
      document.createElement("div"),
    );

    console.log("[Matching] Google Places services initialized");
  }, [googleLoaded]);

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
  const handleDownloadPDF = async () => {
    if (!result) {
      setError("No result to download.");
      return;
    }

    try {
      // Dynamically import PDF libraries only when needed (saves ~80KB initial bundle)
      const [{ default: jsPDF }, autoTable] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

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
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    }
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

  const fetchFemaleSuggestions = (query) => {
    console.log(
      "[Female Debug] fetchFemaleSuggestions called with query:",
      query,
    );

    if (!query || query.length < 2) {
      console.log("[Female Debug] Query too short, clearing suggestions");
      setFSuggest([]);
      return;
    }

    if (fTimer.current) {
      console.log("[Female Debug] Clearing existing timer");
      clearTimeout(fTimer.current);
    }

    fTimer.current = setTimeout(() => {
      console.log("[Female Debug] Timer fired, checking service availability");
      console.log("[Female Debug] googleLoaded:", googleLoaded);
      console.log(
        "[Female Debug] fAutocompleteService.current:",
        !!fAutocompleteService.current,
      );

      if (!googleLoaded || !fAutocompleteService.current) {
        console.log("[Female Debug] Service not ready, clearing suggestions");
        setFSuggest([]);
        return;
      }

      console.log("[Female Debug] Starting autocomplete request...");
      setFSuggesting(true);

      fAutocompleteService.current.getPlacePredictions(
        {
          input: query,
          types: ["(cities)"],
        },
        (predictions, status) => {
          console.log("[Female Debug] Autocomplete callback fired");
          console.log("[Female Debug] Status:", status);
          console.log("[Female Debug] Predictions:", predictions);

          setFSuggesting(false);

          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            const suggestions = predictions.map((p) => ({
              label: p.description,
              placeId: p.place_id,
            }));

            console.log("[Female Debug] Setting suggestions:", suggestions);
            setFSuggest(suggestions);
          } else {
            console.log(
              "[Female Debug] No valid predictions, clearing suggestions",
            );
            setFSuggest([]);
          }
        },
      );
    }, 300);
  };

  const handleFemaleSuggestionClick = (suggestion) => {
    if (!fPlacesService.current) {
      setFemale((prev) => ({ ...prev, place: suggestion.label }));
      setFSuggest([]);
      return;
    }

    setFSuggest([]);
    setFSuggesting(true);

    fPlacesService.current.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ["geometry", "formatted_address", "name"],
      },
      (place, status) => {
        setFSuggesting(false);

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          const latitude = place.geometry.location.lat();
          const longitude = place.geometry.location.lng();
          const label = place.formatted_address || place.name;

          setFemale((prev) => ({ ...prev, place: label }));
          setFCoords({ latitude, longitude, label });

          console.log("[Matching] Female coordinates:", {
            latitude,
            longitude,
          });
        } else {
          setFCoords(null);
        }
      },
    );
  };
  const fetchMaleSuggestions = (query) => {
    if (!query || query.length < 2) {
      setMSuggest([]); // ✅ Fixed
      return;
    }

    if (mTimer.current) clearTimeout(mTimer.current); // ✅ Fixed

    mTimer.current = setTimeout(() => {
      // ✅ Fixed
      if (!googleLoaded || !mAutocompleteService.current) {
        // ✅ Fixed
        setMSuggest([]); // ✅ Fixed
        return;
      }

      setMSuggesting(true); // ✅ Fixed

      mAutocompleteService.current.getPlacePredictions(
        // ✅ Fixed
        {
          input: query,
          types: ["(cities)"],
        },
        (predictions, status) => {
          setMSuggesting(false); // ✅ Fixed

          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            const suggestions = predictions.map((p) => ({
              label: p.description,
              placeId: p.place_id,
            }));

            setMSuggest(suggestions); // ✅ Fixed
          } else {
            setMSuggest([]); // ✅ Fixed
          }
        },
      );
    }, 300);
  };

  const handleMaleSuggestionClick = (suggestion) => {
    if (!mPlacesService.current) {
      setMale((prev) => ({ ...prev, place: suggestion.label }));
      setMSuggest([]);
      return;
    }

    setMSuggest([]);
    setMSuggesting(true);

    mPlacesService.current.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ["geometry", "formatted_address", "name"],
      },
      (place, status) => {
        setMSuggesting(false);

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          const latitude = place.geometry.location.lat();
          const longitude = place.geometry.location.lng();
          const label = place.formatted_address || place.name;

          setMale((prev) => ({ ...prev, place: label }));
          setMCoords({ latitude, longitude, label });

          console.log("[Matching] Male coordinates:", {
            latitude,
            longitude,
          });
        } else {
          setMCoords(null);
        }
      },
    );
  };

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const getChartSummary = (rows = []) => {
    const avg = rows.reduce((a, b) => a + (b.percent || 0), 0) / rows.length;

    let level = "Moderate";
    let description = "Mixed planetary influences are present.";
    let points = [];

    if (avg >= 120) {
      level = "Strong";
      description =
        "Emotional stability and relationship support are favorable.";
    } else if (avg < 105) {
      level = "Weak";
      description =
        "Emotional sensitivity and imbalance may require attention.";
    }

    rows.forEach((p) => {
      if (p.percent >= 120) {
        points.push({
          type: "ok",
          text: `${p.name} is strongly supportive`,
        });
      } else if (p.percent < 105) {
        points.push({
          type: "warn",
          text: `${p.name} may cause emotional friction`,
        });
      }
    });

    return { level, description, points };
  };

  const maleSummary = getChartSummary(mDetails?.shadbalaRows);
  const femaleSummary = getChartSummary(fDetails?.shadbalaRows);

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
            <header className="header">
              <IoHeartCircle
                className="headerIcon"
                style={{
                  color: "#ffff",
                  padding: "0.4rem",
                  width: 36,
                  height: 36,
                }}
              />
              <h1
                className="title"
                style={{ fontSize: "2.5rem", fontWeight: 700 }}
              >
                {t.matching.title}
              </h1>
              <p
                className="subtitle"
                style={{
                  fontSize: "1rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                }}
              >
                {t.matching.subtitle}
              </p>
              {/* Trust line */}
              <div className="trust-line">
                <span className="trust-line-item">
                  <span>🔒</span>
                  <span>Private</span>
                </span>
                <span className="trust-line-separator">•</span>
                <span className="trust-line-item">
                  <span>📍</span>
                  <span>Accurate location</span>
                </span>
                <span className="trust-line-separator">•</span>
                <span className="trust-line-item">
                  <span>💾</span>
                  <span>Saved profiles</span>
                </span>
              </div>
            </header>

            {/* =====================
      CARDS
  ===================== */}
            <section className="birth-cards">
              {/* ========= FEMALE ========= */}
              <div className="birth-card female card">
                <div className="birth-card-header">
                  <Moon className="icon-female" />
                  <h3 className="font-medium">{t.matching.femaleDetails}</h3>
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
                    <p className="form-field-helper">Only letters and spaces</p>
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
                    <p className="form-field-helper">Format: DD-MM-YYYY</p>
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
                    <p className="form-field-helper">24-hour format</p>
                  </div>
                  {/* Female Place input */}
                  <div
                    className="form-field full"
                    style={{ position: "relative" }}
                  >
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
                        onChange={(e) => {
                          const value = e.target.value;
                          setFemale((prev) => ({ ...prev, place: value }));
                          setFCoords(null);
                          fetchFemaleSuggestions(value); // ← Call the new function
                        }}
                        autoComplete="off"
                        required
                      />

                      <button
                        type="button"
                        className="location-icon-btn"
                        title="Use current location"
                        onClick={useMyLocationFemale}
                        disabled={fLocating}
                      >
                        {fLocating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MapPin />
                        )}
                      </button>
                    </div>

                    {/* Autocomplete dropdown for female */}
                    {/* Female autocomplete dropdown - ADD DEBUG */}
                    {console.log(
                      "[Female Render] About to check dropdown render. fSuggest.length:",
                      fSuggest.length,
                    )}
                    {/* Autocomplete dropdown for female */}
                    {console.log(
                      "[Female Render] About to check dropdown render. fSuggest.length:",
                      fSuggest.length,
                    )}
                    {fSuggest.length > 0 && (
                      <div
                        className="suggestions"
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 99999,
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {console.log("[Female Render] RENDERING DROPDOWN")}
                        {fSuggesting && (
                          <div className="suggestion-loading">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading suggestions...
                          </div>
                        )}
                        {!fSuggesting &&
                          fSuggest.map((s, i) => {
                            console.log(
                              "[Female Render] Rendering suggestion:",
                              s.label,
                            );
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleFemaleSuggestionClick(s)}
                                style={{
                                  width: "100%",
                                  padding: "0.75rem",
                                  textAlign: "left",
                                  background: "var(--color-cream)",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = "#f3f4f6")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "transparent")
                                }
                              >
                                <MapPin size={14} />
                                <span>{s.label}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}

                    <p className="form-field-helper place-helper">
                      {fCoords
                        ? "Location coordinates saved"
                        : "Choose the nearest city for accurate calculation"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ========= MALE ========= */}
              <div className="card birth-card male">
                <div className="birth-card-header">
                  <Sun className="icon-male" />
                  <h3 className="font-medium">{t.matching.maleDetails}</h3>
                </div>

                <div className="birth-grid">
                  {/* Female Name */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="female-name">
                      {t.matching.femaleName}
                    </label>

                    <input
                      id="male-name"
                      type="text"
                      className="form-field-input"
                      placeholder="e.g., Rohan"
                      value={male.fullName}
                      onChange={onChangePerson(
                        setMale,
                        setMCoords,
                        setMSuggest,
                        mTimer,
                        "fullName",
                      )}
                      required
                    />
                    <p className="form-field-helper">Only letters and spaces</p>
                  </div>

                  {/* Date of Birth */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="male-dob">
                      {t.matching.dateOfBirth}
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="male-dob"
                        ref={mDateInputRef}
                        type="date"
                        className="form-field-input"
                        value={male.dob}
                        onChange={onChangePerson(
                          setMale,
                          setMCoords,
                          setMSuggest,
                          mTimer,
                          "dob",
                        )}
                        required
                      />

                      <button
                        type="button"
                        className="calendar-icon-btn"
                        onClick={() =>
                          mDateInputRef.current?.showPicker?.() ||
                          mDateInputRef.current?.click()
                        }
                      >
                        <Calendar />
                      </button>
                    </div>
                    <p className="form-field-helper">Format: DD-MM-YYYY</p>
                  </div>

                  {/* Time of Birth */}
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="male-tob">
                      {t.matching.timeOfBirth}
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="male-tob"
                        ref={mTimeInputRef}
                        type="time"
                        step="60"
                        className="form-field-input"
                        value={male.tob}
                        onChange={onChangePerson(
                          setMale,
                          setMCoords,
                          setMSuggest,
                          mTimer,
                          "tob",
                        )}
                        required
                      />

                      <button
                        type="button"
                        className="clock-icon-btn"
                        onClick={() =>
                          mTimeInputRef.current?.showPicker?.() ||
                          mTimeInputRef.current?.click()
                        }
                      >
                        <Clock />
                      </button>
                    </div>
                    <p className="form-field-helper">24-hour format</p>
                  </div>

                  {/* Male Place Input - Updated with Google Maps autocomplete */}
                  <div
                    className="form-field full"
                    style={{ position: "relative" }}
                  >
                    <label className="form-field-label" htmlFor="male-place">
                      Place
                    </label>

                    <div className="input-with-icon">
                      <input
                        id="male-place"
                        type="text"
                        className="form-field-input"
                        placeholder="e.g., Mumbai, India"
                        value={male.place}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMale((prev) => ({ ...prev, place: value }));
                          setMCoords(null);
                          fetchMaleSuggestions(value);
                        }}
                        autoComplete="off"
                        required
                      />

                      <button
                        type="button"
                        className="location-icon-btn"
                        title="Use current location"
                        onClick={useMyLocationMale}
                        disabled={mLocating}
                      >
                        {mLocating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MapPin />
                        )}
                      </button>
                    </div>

                    {/* Autocomplete dropdown for male */}
                    {mSuggest.length > 0 && (
                      <div
                        className="suggestions"
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 99999,
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {mSuggesting && (
                          <div className="suggestion-loading">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading suggestions...
                          </div>
                        )}
                        {!mSuggesting &&
                          mSuggest.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleMaleSuggestionClick(s)}
                              style={{
                                width: "100%",
                                padding: "0.75rem",
                                textAlign: "left",
                                background: "var(--color-cream)",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f3f4f6")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <MapPin size={14} />
                              <span>{s.label}</span>
                            </button>
                          ))}
                      </div>
                    )}
                    <p className="form-field-helper place-helper">
                      {mCoords
                        ? "Location coordinates saved"
                        : "Choose the nearest city for accurate calculation"}
                    </p>
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
                className="btn-primary"
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
              <h3
                className="history-title flex text-gray-800"
                style={{
                  fontSize: "24px",
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                <Sparkles className="w-5 h-5 text-gray-800" />
                Saved Profiles
              </h3>

              {history.length > 0 && (
                <button onClick={clearHistory} className="btn-ghost">
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
                          alignItems: "center", // prevent vertical stretching
                          maxHeight: "unset",
                        }}
                      >
                        {/* LEFT: FEMALE + MALE */}
                        <div
                          className="history-row-left"
                          style={{ gap: "0.75rem" }}
                        >
                          {/* FEMALE */}
                          <div className="history-row-person">
                            <span className="pill pill-female">
                              {item.femaleName || "Female"}
                            </span>

                            <div className="history-row-details">
                              <div className="person-meta">
                                <Calendar className="meta-icon" />
                                <span>
                                  {item.femaleDob || "-"} ·{" "}
                                  {item.femaleTob || "-"}
                                </span>
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
                                <span>
                                  {item.maleDob || "-"} · {item.maleTob || "-"}
                                </span>
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
                          <span className="compatibility-label">
                            Compatibility
                          </span>
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
                              height: "40px", // 🔑 stops vertical stretch
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

            <MatchInsights result={result} />
            <LifeTogetherInsight
femaleDetails={fDetails}
  maleDetails={mDetails}
  femaleName={female.fullName}
  maleName={male.fullName}
  />
            <MatchRemedies
              result={result}
              femaleName={female.fullName}
              maleName={male.fullName}
            />

            <AdvancedMatchGuidance
              femaleDetails={fDetails}
              maleDetails={mDetails}
              result={result}
              femaleName={female.fullName}
              maleName={male.fullName}
            />


            <ChartStrengthComparison
  femaleDetails={fDetails}
  maleDetails={mDetails}
  femaleName={female.fullName}
  maleName={male.fullName}
/>




            {/* Female and Male Details */}
            {(fDetails || mDetails) && (
              <div className="details-grid mt-8">
                {/* Female Details */}
                <div className="flex flex-col gap-6">
                  {/* Female Shadbala Card */}
                  {fDetails && (
                    <div className="analysis-card female">
                      {/* HEADER */}
                      <div className="results-header">
                        <Moon style={{ color: "#a855f7" }} />
                        <h3 className="results-title">Female Details</h3>
                      </div>

                      {/* SUMMARY */}
                      {/* SUMMARY */}
                      <div className="analysis-summary">
                        <div className="summary-text">
                          <h4 className="summary-question">
                            How strong is her chart overall?
                          </h4>

                          <div className="summary-score">
                            <span
                              className={`score-pill ${femaleSummary.level.toLowerCase()}`}
                            >
                              {femaleSummary.level}
                            </span>
                            <span className="score-text">
                              {femaleSummary.description}
                            </span>
                          </div>

                          <ul className="summary-points">
                            {femaleSummary.points.slice(0, 2).map((p, i) => (
                              <li key={i} className={p.type}>
                                <span className="bullet" />
                                {p.text}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="summary-avatar moon">
                          <Moon />
                        </div>
                      </div>

                      {/* SHADBALA */}
                      <table className="planet-table shadbala-table">
                        <thead>
                          <tr>
                            <th>Planet</th>
                            <th>Strength</th>
                            <th>Ishta</th>
                            <th>Kashta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fDetails.shadbalaRows.map((p, i) => (
                            <tr key={i}>
                              <td className="planet-name">{p.name}</td>
                              <td>{p.percent?.toFixed(1)}%</td>
                              <td>
                                <span className="arc ishta">
                                  {p.ishta?.toFixed(0)}%
                                </span>
                              </td>
                              <td>
                                <span className="arc kashta">
                                  {p.kashta?.toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* FOOTER */}
                      <div className="analysis-footer">
                        <button
                          className="outline-btn"
                          onClick={onTalkToAstrologer}
                        >
                          Understand what this means →
                        </button>
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

                  {(fDetails?.d1ChartSvg || fDetails?.d9ChartSvg) && (
                    <div
                      className="charts-wrapper mt-6"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "1.5rem",
                      }}
                    >
                      {fDetails?.d1ChartSvg && (
                        <div className="card">
                          <div className="results-header">
                            <Orbit style={{ color: "#a855f7" }} />
                            <h3 className="results-title">
                              Female D1 – Lagna Chart
                            </h3>
                          </div>
                          <div
                            className="chart-svg flex justify-center align-center mx-auto"
                            dangerouslySetInnerHTML={{
                              __html: fDetails.d1ChartSvg,
                            }}
                          />
                        </div>
                      )}

                      {fDetails?.d9ChartSvg && (
                        <div className="card">
                          <div className="results-header">
                            <Orbit style={{ color: "#a855f7" }} />
                            <h3 className="results-title">
                              Female D9 – Navamsa Chart
                            </h3>
                          </div>
                          <div
                            className="chart-svg flex justify-center align-center mx-auto"
                            dangerouslySetInnerHTML={{
                              __html: fDetails.d9ChartSvg,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Male Details */}
                <div className="flex flex-col gap-6">
                  {/* Male Shadbala Card */}
                  {mDetails && (
                    <div className="analysis-card male">
                      <div className="results-header">
                        <Sun style={{ color: "#f59e0b" }} />
                        <h3 className="results-title">Male Details</h3>
                      </div>

                      <div className="analysis-summary">
                        <div className="summary-text">
                          <h4 className="summary-question">
                            How strong is his chart overall?
                          </h4>

                          <div className="summary-score">
                            <span
                              className={`score-pill ${maleSummary.level.toLowerCase()}`}
                            >
                              {maleSummary.level}
                            </span>
                            <span className="score-text">
                              {maleSummary.description}
                            </span>
                          </div>

                          <ul className="summary-points">
                            {maleSummary.points.slice(0, 2).map((p, i) => (
                              <li key={i} className={p.type}>
                                <span className="bullet" />
                                {p.text}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="summary-avatar sun">
                          <Sun />
                        </div>
                      </div>

                      <table className="planet-table shadbala-table">
                        <thead>
                          <tr>
                            <th>Planet</th>
                            <th>Strength</th>
                            <th>Ishta</th>
                            <th>Kashta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mDetails.shadbalaRows.map((p, i) => (
                            <tr key={i}>
                              <td className="planet-name">{p.name}</td>
                              <td>{p.percent?.toFixed(1)}%</td>
                              <td>
                                <span className="arc ishta">
                                  {p.ishta?.toFixed(0)}%
                                </span>
                              </td>
                              <td>
                                <span className="arc kashta">
                                  {p.kashta?.toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="analysis-footer">
                        <button
                          className="outline-btn"
                          onClick={onTalkToAstrologer}
                        >
                          Understand what this means →
                        </button>
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

                   {(mDetails?.d1ChartSvg || mDetails?.d9ChartSvg) && (
                    <div
                      className="charts-wrapper mt-6"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "1.5rem",
                      }}
                    >
                      {mDetails?.d1ChartSvg && (
                        <div className="card">
                          <div className="results-header">
                            <Orbit style={{ color: "#f59e0b" }} />
                            <h3 className="results-title">
                              Male D1 – Lagna Chart
                            </h3>
                          </div>
                          <div
                            className="chart-svg flex justify-center align-center mx-auto"
                            dangerouslySetInnerHTML={{
                              __html: mDetails.d1ChartSvg,
                            }}
                          />
                        </div>
                      )}

                      {mDetails?.d9ChartSvg && (
                        <div className="card">
                          <div className="results-header">
                            <Orbit style={{ color: "#f59e0b" }} />
                            <h3 className="results-title">
                              Male D9 – Navamsa Chart
                            </h3>
                          </div>
                          <div
                            className="chart-svg flex justify-center align-center mx-auto"
                            dangerouslySetInnerHTML={{
                              __html: mDetails.d9ChartSvg,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                
                </div>

              

                {/* ✅ PREMIUM – full width guidance banner */}
                <div
                  className="guidance-banner premium-full matchmaking-banner"
                  onClick={() => router.push("/talk-to-astrologer")}
                >
                  <div className="guidance-content">
                    <h3 className="guidance-title">
                      Wondering how strong this match really is?
                    </h3>

                    <p className="guidance-subtitle">
                      Talk to an experienced astrologer to understand
                      compatibility, future harmony, and the right steps forward
                      for this relationship.
                    </p>

                    <button
                      className="guidance-btn"
                      onClick={onTalkToAstrologer}
                    >
                      <PhoneIcon size={18} />
                      Talk to an astrologer
                    </button>
                  </div>

                  <div className="guidance-illustration" aria-hidden>
                    {/* matchmaking illustration / knot / couple sketch via CSS */}
                  </div>
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
                  className="btn-primary"
                  onClick={handleDownloadPDF}
                  disabled={!result}
                >
                  Download PDF
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleShare}
                  disabled={!result}
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MATCHING EXPLANATION – ACCORDION CARD */}
        <div
          style={{
            marginTop: "2rem",
            width: "100%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div
            className="card shadow-xl border"
            style={{
              background: "#ffffff",
              borderColor: "#eaeaea",
              maxWidth: "100%",
              boxShadow:
                "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* HERO */}
            <div
              style={{
                borderBottom: "2px solid rgba(212,175,55,0.25)",
                paddingBottom: "1.75rem",
                marginBottom: "1.75rem",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  fontFamily: "'Georgia','Times New Roman',serif",
                  fontSize: "32px",
                  fontWeight: 500,
                  color: "#111827",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                AI-Powered Kundli Matching Explained
              </h1>

              <p className="text-sm mt-1 text-slate-600 max-w-3xl mx-auto">
                Understand how Ashtakoot scores, planetary strengths, dashas,
                and doshas are analyzed to evaluate marriage compatibility —
                beyond basic guna milan.
              </p>

              <div className="flex justify-center mt-4 gap-3">
                <button className="btn-primary" onClick={scrollToTop}>
                  Check Compatibility
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={onTalkToAstrologer}
                  style={{ borderRadius: "12px" }}
                >
                  Talk to an Astrologer
                </button>
              </div>
            </div>

            {/* ACCORDIONS GO HERE */}
            <div style={{ padding: 0 }}>
              <Section
                title="What Is Kundli Matching & Why It Matters for Marriage"
                content={[
                  "Evaluates long-term marriage compatibility",
                  "Identifies emotional, mental, and physical harmony",
                  "Highlights potential conflict areas early",
                  "Helps in informed marriage decisions",
                ]}
              >
                Kundli matching is a Vedic astrology method used to assess
                marriage compatibility between two individuals. It compares
                planetary positions, Moon signs, and Nakshatras of both partners
                to understand how their energies interact over time. Rather than
                predicting fixed outcomes, kundli matching highlights strengths,
                challenges, and adjustment areas so couples can make informed,
                realistic, and prepared decisions about marriage.
              </Section>

              <Section
                title="What Ashtakoot (Guna Milan) Actually Measures"
                content={[
                  "Mental compatibility and communication",
                  "Physical and sexual harmony",
                  "Health and genetic indicators",
                  "Temperament and emotional balance",
                ]}
              >
                Ashtakoot matching evaluates compatibility using eight factors
                derived from Moon signs and Nakshatras. Each koot represents a
                specific area of married life, such as emotional bonding,
                attraction, health, and temperament. While the total score
                provides an overview, understanding individual koot results is
                far more important than focusing only on the final number.
              </Section>

              <Section
                title="Why Guna Milan Alone Is Not Enough"
                content={[
                  "Does not analyze planetary strength",
                  "Ignores dasha timing",
                  "Misses dosha cancellations",
                  "Cannot predict future phases",
                ]}
              >
                Guna milan is a basic compatibility filter, not a complete
                marriage analysis. Many successful marriages have low guna
                scores, while high scores can still face difficulties if
                planetary conditions are unfavorable. That’s why serious
                marriage analysis must include planetary aspects, dashas, and
                dosha evaluation alongside Ashtakoot scoring.
              </Section>

              <Section
                title="Planetary Compatibility Between Partners"
                content={[
                  "Venus and Mars harmony",
                  "Moon sign emotional alignment",
                  "Jupiter and Saturn influence on stability",
                  "Mutual planetary aspects",
                ]}
              >
                Planetary compatibility examines how key planets like Venus,
                Mars, Moon, Jupiter, and Saturn interact between both charts.
                These interactions directly influence attraction, emotional
                bonding, patience, and long-term stability. Favorable planetary
                aspects can compensate for low guna scores, while challenging
                interactions may require conscious effort and remedies.
              </Section>

              <Section
                title="Manglik Dosha & Other Important Doshas"
                content={[
                  "Manglik (Mangal) dosha evaluation",
                  "Nadi and Bhakoot dosha analysis",
                  "Dosha cancellation rules",
                  "Practical impact on married life",
                ]}
              >
                Doshas indicate areas where planetary energies may cause
                imbalance. Manglik dosha relates to Mars placement and its
                impact on harmony and conflict. Nadi and Bhakoot doshas relate
                to health, emotional bonding, and longevity. Not all doshas are
                harmful. Proper analysis checks cancellations, planetary
                strength, and overall chart balance before drawing conclusions.
              </Section>

              <Section
                title="Dasha & Timing Compatibility After Marriage"
                content={[
                  "Marriage phase stability",
                  "Career and financial growth periods",
                  "Stress and adjustment phases",
                  "Long-term life progression",
                ]}
              >
                Dashas determine *when* certain planetary influences become
                active. Even a compatible match can feel challenging if both
                partners enter difficult dashas simultaneously. Dasha analysis
                helps identify supportive periods for marriage, relocation,
                career growth, and family planning — making timing as important
                as matching.
              </Section>

              <Section
                title="AI-Based Kundli Matching vs Manual Analysis"
                content={[
                  "Accurate astronomical calculations",
                  "Consistent pattern analysis",
                  "Cross-checking multiple compatibility layers",
                  "Astrologer validation where required",
                ]}
              >
                AI enhances kundli matching by analyzing large combinations
                quickly and consistently. It calculates planetary positions,
                dashas, and compatibility layers with precision. However,
                interpretation still follows classical Vedic rules, and
                astrologers provide human judgment, context, and remedies where
                needed.
              </Section>

              <Section
                title="What Your Compatibility Score Really Means"
                content={[
                  "Overall harmony indicator",
                  "Not a guarantee or rejection",
                  "Requires contextual interpretation",
                  "Helps set realistic expectations",
                ]}
              >
                A compatibility score summarizes multiple factors into a single
                number, but it should never be viewed in isolation. The real
                value lies in understanding *why* the score is high or low and
                which areas need attention. Marriage success depends on
                awareness, communication, and preparedness — not just numbers.
              </Section>

              <Section
                title="Can Remedies Improve Marriage Compatibility?"
                content={[
                  "Planetary strengthening remedies",
                  "Behavioral and lifestyle guidance",
                  "Timing-based precautions",
                  "Spiritual and practical balance",
                ]}
              >
                Remedies aim to balance planetary influences, not override
                destiny. They may include lifestyle adjustments, rituals,
                gemstones, or timing guidance. Remedies work best when combined
                with understanding, effort, and realistic expectations from both
                partners.
              </Section>
            </div>
            <div className="text-sm mt-6 text-gray-500 text-center mx-auto max-w-2xl">
              Kundli matching does not decide your future. It provides clarity,
              awareness, and preparedness so you can make thoughtful decisions.
              Astrology supports conscious choices — it does not replace
              responsibility, communication, or mutual respect in marriage.
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

        <AstrologerAssistantTab
          pageTitle="Matching"
          initialData={(() => {
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

      {/* SEO: FAQ Schema - Invisible to users */}
      <PageSEO
        pageType="matching"
        faqs={[
          {
            question: "What Is Kundli Matching & Why It Matters for Marriage",
            answer:
              "Kundli matching is a Vedic astrology method used to assess marriage compatibility between two individuals. It compares planetary positions, Moon signs, and Nakshatras of both partners to understand how their energies interact over time. Rather than predicting fixed outcomes, kundli matching highlights strengths, challenges, and adjustment areas so couples can make informed, realistic, and prepared decisions about marriage.",
          },
          {
            question: "What Ashtakoot (Guna Milan) Actually Measures",
            answer:
              "Ashtakoot matching evaluates compatibility using eight factors derived from Moon signs and Nakshatras. Each koot represents a specific area of married life, such as emotional bonding, attraction, health, and temperament. While the total score provides an overview, understanding individual koot results is far more important than focusing only on the final number.",
          },
          {
            question: "Why Guna Milan Alone Is Not Enough",
            answer:
              "Guna milan is a basic compatibility filter, not a complete marriage analysis. Many successful marriages have low guna scores, while high scores can still face difficulties if planetary conditions are unfavorable. That's why serious marriage analysis must include planetary aspects, dashas, and dosha evaluation alongside Ashtakoot scoring.",
          },
          {
            question: "Planetary Compatibility Between Partners",
            answer:
              "Planetary compatibility examines how key planets like Venus, Mars, Moon, Jupiter, and Saturn interact between both charts. These interactions directly influence attraction, emotional bonding, patience, and long-term stability. Favorable planetary aspects can compensate for low guna scores, while challenging interactions may require conscious effort and remedies.",
          },
          {
            question: "Manglik Dosha & Other Important Doshas",
            answer:
              "Doshas indicate areas where planetary energies may cause imbalance. Manglik dosha relates to Mars placement and its impact on harmony and conflict. Nadi and Bhakoot doshas relate to health, emotional bonding, and longevity. Not all doshas are harmful. Proper analysis checks cancellations, planetary strength, and overall chart balance before drawing conclusions.",
          },
          {
            question: "Dasha & Timing Compatibility After Marriage",
            answer:
              "Dashas determine when certain planetary influences become active. Even a compatible match can feel challenging if both partners enter difficult dashas simultaneously. Dasha analysis helps identify supportive periods for marriage, relocation, career growth, and family planning — making timing as important as matching.",
          },
          {
            question: "AI-Based Kundli Matching vs Manual Analysis",
            answer:
              "AI enhances kundli matching by analyzing large combinations quickly and consistently. It calculates planetary positions, dashas, and compatibility layers with precision. However, interpretation still follows classical Vedic rules, and astrologers provide human judgment, context, and remedies where needed.",
          },
          {
            question: "What Your Compatibility Score Really Means",
            answer:
              "A compatibility score summarizes multiple factors into a single number, but it should never be viewed in isolation. The real value lies in understanding why the score is high or low and which areas need attention. Marriage success depends on awareness, communication, and preparedness — not just numbers.",
          },
          {
            question: "Can Remedies Improve Marriage Compatibility?",
            answer:
              "Remedies aim to balance planetary influences, not override destiny. They may include lifestyle adjustments, rituals, gemstones, or timing guidance. Remedies work best when combined with understanding, effort, and realistic expectations from both partners.",
          },
        ]}
      />
    </>
  );
}
