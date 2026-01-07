"use client";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { IoHeartCircle } from "react-icons/io5";
import Chat from "@/components/Chat";
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
      femaleName: (female.fullName || '').trim().toUpperCase(),
      femaleDob: (female.dob || '').trim(),
      femaleTob: (female.tob || '').trim(),
      femalePlace: (female.place || '').trim().toUpperCase(),
      maleName: (male.fullName || '').trim().toUpperCase(),
      maleDob: (male.dob || '').trim(),
      maleTob: (male.tob || '').trim(),
      malePlace: (male.place || '').trim().toUpperCase(),
    };
    // Create a consistent hash from the form data
    const hashString = JSON.stringify(formData);
    // Simple hash function (you could use a more robust one if needed)
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
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
    if (previousFormDataHashRef.current !== null && previousFormDataHashRef.current !== newHash) {
      console.log('[Matching] Form data changed, resetting chat:', {
        previousHash: previousFormDataHashRef.current,
        newHash: newHash,
      });
      // Reset chat by incrementing session ID
      setChatSessionId(prev => prev + 1);
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
    const key = `${entry.femaleName.toUpperCase()}-${entry.maleName.toUpperCase()}-${entry.femaleDob
      }-${entry.maleDob}`;
    current = current.filter(
      (it) =>
        `${it.femaleName.toUpperCase()}-${it.maleName.toUpperCase()}-${it.femaleDob
        }-${it.maleDob}` !== key
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
  };

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
    setChatSessionId(prev => prev + 1);
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
        femaleName: (item.femaleName || '').trim().toUpperCase(),
        femaleDob: (item.femaleDob || '').trim(),
        femaleTob: (item.femaleTob || '').trim(),
        femalePlace: (item.femalePlace || '').trim().toUpperCase(),
        maleName: (item.maleName || '').trim().toUpperCase(),
        maleDob: (item.maleDob || '').trim(),
        maleTob: (item.maleTob || '').trim(),
        malePlace: (item.malePlace || '').trim().toUpperCase(),
      };
      const hashString = JSON.stringify(formData);
      let hash = 0;
      for (let i = 0; i < hashString.length; i++) {
        const char = hashString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString();
    })();
    
    // If this matches previous hash, don't reset chat (same data)
    // Otherwise, reset chat (different data loaded)
    if (previousFormDataHashRef.current !== null && previousFormDataHashRef.current !== loadedHash) {
      setChatSessionId(prev => prev + 1);
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
              v
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
              }))
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
      throw new Error(`Invalid date format: ${dob}. Expected YYYY-MM-DD or DD-MM-YYYY`);
    }

    if (!Y || !M || !D || Number.isNaN(Y) || Number.isNaN(M) || Number.isNaN(D)) {
      throw new Error(`Invalid date values: ${dob}`);
    }

    // Validate date ranges
    if (Y < 1900 || Y > 2100) throw new Error(`Year must be between 1900 and 2100: ${Y}`);
    if (M < 1 || M > 12) throw new Error(`Month must be between 1 and 12: ${M}`);
    if (D < 1 || D > 31) throw new Error(`Date must be between 1 and 31: ${D}`);

    // Parse time
    if (!tob) throw new Error("Time of birth is required");
    const timeParts = tob.split(":").map((n) => parseInt(n, 10));
    const [H, Min, S = 0] = timeParts;

    if (Number.isNaN(H) || Number.isNaN(Min) || Number.isNaN(S)) {
      throw new Error(`Invalid time format: ${tob}. Expected HH:MM or HH:MM:SS`);
    }

    // Validate time ranges
    if (H < 0 || H > 23) throw new Error(`Hours must be between 0 and 23: ${H}`);
    if (Min < 0 || Min > 59) throw new Error(`Minutes must be between 0 and 59: ${Min}`);
    if (S < 0 || S > 59) throw new Error(`Seconds must be between 0 and 59: ${S}`);

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
        "Could not access your location. Please allow permission or type the city manually."
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
        "Could not access your location. Please allow permission or type the city manually."
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
        "Please complete all fields for both individuals, including names."
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload = await buildPayload();
      const res = await astrologyAPI.getSingleCalculation(
        "match-making/ashtakoot-score",
        payload
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
        console.error('[Matching] Female calculation failed:', fCalc);
        throw new Error('Failed to fetch female individual data. Please try again.');
      }
      if (!mCalc || !mCalc.results) {
        console.error('[Matching] Male calculation failed:', mCalc);
        throw new Error('Failed to fetch male individual data. Please try again.');
      }
      
      // Check for errors in API responses
      if (fCalc.errors && Object.keys(fCalc.errors).length > 0) {
        console.warn('[Matching] Female calculation errors:', fCalc.errors);
      }
      if (mCalc.errors && Object.keys(mCalc.errors).length > 0) {
        console.warn('[Matching] Male calculation errors:', mCalc.errors);
      }
      
      // If Maha Dasha API call failed, retry separately for each individual
      const retryMahaDashaIfNeeded = async (calc, payload, gender) => {
        const mahaError = calc.errors?.["vimsottari/maha-dasas"];
        const hasMahaData = calc.results?.["vimsottari/maha-dasas"];
        
        if (mahaError || !hasMahaData) {
          console.warn(`[Matching] ${gender} Maha Dasha data missing or error occurred, retrying...`, {
            error: mahaError,
            hasData: !!hasMahaData,
          });
          
          try {
            const retryResult = await astrologyAPI.getSingleCalculation(
              "vimsottari/maha-dasas",
              payload
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
            console.error(`[Matching] ${gender} Maha Dasha retry failed:`, retryError);
            // Continue with existing data even if retry fails
          }
        }
      };
      
      // Retry Maha Dasha for both if needed
      await Promise.all([
        retryMahaDashaIfNeeded(fCalc, fPayload, 'Female'),
        retryMahaDashaIfNeeded(mCalc, mPayload, 'Male'),
      ]);
      
      // If Vimsottari data is missing, retry separately for each individual
      const retryVimsottariIfNeeded = async (calc, payload, gender) => {
        const vimsError = calc.errors?.["vimsottari/dasa-information"];
        const hasVimsData = calc.results?.["vimsottari/dasa-information"];
        
        if (vimsError || !hasVimsData) {
          console.warn(`[Matching] ${gender} Vimsottari data missing or error occurred, retrying...`, {
            error: vimsError,
            hasData: !!hasVimsData,
          });
          
          try {
            const retryResult = await astrologyAPI.getSingleCalculation(
              "vimsottari/dasa-information",
              payload
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
            console.error(`[Matching] ${gender} Vimsottari retry failed:`, retryError);
            // Continue with existing data even if retry fails
          }
        }
      };
      
      // Retry Vimsottari for both if needed
      await Promise.all([
        retryVimsottariIfNeeded(fCalc, fPayload, 'Female'),
        retryVimsottariIfNeeded(mCalc, mPayload, 'Male'),
      ]);
      
      // Log to verify both have vimsottari data (only in development)
      if (process.env.NODE_ENV === 'development') {
        const fVims = fCalc.results["vimsottari/dasa-information"];
        const mVims = mCalc.results["vimsottari/dasa-information"];
        console.log('[Matching] API Results:', {
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
            {}
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
              r["vimsottari/dasa-information"]
            )
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
          console.warn('[Matching] ⚠️ Female vimsottari endpoint failed:', vimsError);
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('[Matching] ⚠️ Female vimsottari data is missing (no error reported)', {
            fCalcResults: Object.keys(fCalc.results || {}),
            hasVimsottariEndpoint: !!fCalc.results["vimsottari/dasa-information"],
          });
        }
      }
      if (!mDetailsBuilt.vimsottari) {
        const vimsError = mCalc.errors?.["vimsottari/dasa-information"];
        if (vimsError) {
          console.warn('[Matching] ⚠️ Male vimsottari endpoint failed:', vimsError);
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('[Matching] ⚠️ Male vimsottari data is missing (no error reported)', {
            mCalcResults: Object.keys(mCalc.results || {}),
            hasVimsottariEndpoint: !!mCalc.results["vimsottari/dasa-information"],
          });
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
        setChatSessionId(prev => prev + 1);
        setShouldResetChat(false);
      }
      
      // Update hash reference after successful submission
      previousFormDataHashRef.current = newHash;

      // Auto-scroll to results after successful calculation
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
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
        "Please complete all fields for both individuals, including names, before using the chat."
      );
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // If no result exists, calculate it first
    if (!result) {
      // Create a synthetic event to trigger form submission and await the computed result
      const syntheticEvent = { preventDefault: () => { } };
      const computed = await onSubmit(syntheticEvent);
      if (computed) {
        // result state is set inside onSubmit; prepare chat and open
        prepareChatData();
        setChatSessionId(prev => prev + 1);
        setChatOpen(true);
        scrollToChat();
      }
    } else {
      // Result exists, prepare data and open chat
      prepareChatData();
      setChatSessionId(prev => prev + 1);
      setChatOpen(true);
      scrollToChat();
    }
  };

  /**
   * Prepares the data to be passed to the Chat component.
   * Ensures ALL data is included: personal details, planet placements, ashtakoot, vimsottari, maha dasas.
   */
  const prepareChatData = () => {
    // Ensure we have all the data before preparing
    if (!result || !fDetails || !mDetails) {
      console.warn('[Matching] prepareChatData called but data is incomplete:', {
        hasResult: !!result,
        hasFDetails: !!fDetails,
        hasMDetails: !!mDetails,
      });
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[Matching] Chat data prepared:', {
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
      if (previousFormDataHashRef.current !== null && previousFormDataHashRef.current !== newHash) {
        console.log('[Matching] Form data changed before submission, will reset chat on submit:', {
          previousHash: previousFormDataHashRef.current,
          newHash: newHash,
        });
        // Don't reset immediately, just mark that it should reset on next submit
        setShouldResetChat(true);
      }
      // Update the hash reference
      if (previousFormDataHashRef.current === null || previousFormDataHashRef.current !== newHash) {
        previousFormDataHashRef.current = newHash;
        setCurrentFormDataHash(newHash);
      }
    }
  }, [female.fullName, female.dob, female.tob, female.place, male.fullName, male.dob, male.tob, male.place]);
  
  // Monitor form data changes and reset chat if needed
  useEffect(() => {
    // Only check if we have some form data filled
    if (female.fullName || male.fullName || female.dob || male.dob) {
      checkAndResetChatOnFormChange();
    }
  }, [female.fullName, female.dob, female.tob, female.place, male.fullName, male.dob, male.tob, male.place]);

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
      `${femaleName}: ${fmtDate(female.dob)} ${fmtTime(female.tob)}, ${female.place
      }`,
      margin,
      yPos
    );
    yPos += 7;
    doc.text(
      `${maleName}: ${fmtDate(male.dob)} ${fmtTime(male.tob)}, ${male.place}`,
      margin,
      yPos
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
      { align: "center" }
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
  /* -------------------------------------------------------------- */
  /* Render */
  /* -------------------------------------------------------------- */
  // Show full-page loading when submitting and no result yet
  if (submitting && !result) {
    return <PageLoading type="matching" message="Analyzing compatibility between charts..." />;
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
        {error && <div className="error" style={{ maxWidth: "1600px", margin: "2rem auto", padding: "0 2rem" }}>{error}</div>}
        {/* Header Section */}
        <header className="header" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="headerIcon" style={{ 
            width: "64px", 
            height: "64px", 
            background: "linear-gradient(135deg, #d4af37, #b8972e)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "0 0 30px rgba(212, 175, 55, 0.3)"
          }}>
            <IoHeartCircle style={{ color: "white", width: "36px", height: "36px" }} />
          </div>
          <h1 className="title" style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "3rem",
            fontWeight: 400,
            background: "linear-gradient(135deg, #d4af37, #b8972e)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0
          }}>
            Match Making
          </h1>
          <p className="subtitle" style={{
            color: "#555",
            marginTop: "0.5rem",
            fontSize: "1rem"
          }}>
            Enter birth details for both to get Ashtakoot score
          </p>
        </header>
        <div className="matching-page-container">
          {/* Left Column - Birth Details */}
          <div className="birth-details-section">
            <form onSubmit={onSubmit}>
              {/* Header */}
              <div className="form-header">
                <Moon className="w-6 h-6" style={{ color: "#ca8a04" }} />
                <div>
                  <h3 className="form-title">{t.matching.birthDetails}</h3>
                  <p className="form-subtitle">
                    {t.matching.enterBothDetails}
                  </p>
                </div>
              </div>
              
              {/* Grid */}
              <div 
                className="form-sections-container"
              >
            {/* ---------- Female ---------- */}
            <div
              className="form-section border border-pink-200 bg-pink-50 rounded-2xl"
              style={{
                background: "#fdf2f8",
                borderColor: "#fbcfe8",
                width: "100%",
                boxSizing: "border-box",
                minWidth: 0,
              }}
            >
              <div className="results-header mb-3">
                <Moon style={{ color: "#ec4899" }} />
                <h3 className="results-title">{t.matching.femaleDetails}</h3>
              </div>
              <div className="form-grid-2col">
                {/* Row 1: Full Name + Date */}
                <div className="form-field">
                  <label className="form-field-label">{t.matching.femaleName}</label>
                  <input
                    type="text"
                    placeholder="e.g., Priya"
                    value={female.fullName}
                    onChange={onChangePerson(
                      setFemale,
                      setFCoords,
                      setFSuggest,
                      fTimer,
                      "fullName"
                    )}
                    required
                    className="form-field-input form-input-field"
                  />
                </div>
                <div className="form-field">
                  <label className="form-field-label">{t.matching.dateOfBirth}</label>
                  <div className="input-with-icon">
                    <input
                      ref={fDateInputRef}
                      type="date"
                      value={female.dob}
                      onChange={onChangePerson(
                        setFemale,
                        setFCoords,
                        setFSuggest,
                        fTimer,
                        "dob"
                      )}
                      required
                      className="form-field-input form-input-field"
                    />
                    <button
                      type="button"
                      onClick={() => fDateInputRef.current?.showPicker?.() || fDateInputRef.current?.click()}
                      className="input-icon-btn"
                    >
                      <Calendar className="w-5 h-5" style={{ color: "#000000" }} />
                    </button>
                  </div>
                </div>
                {/* Row 2: Time + Place */}
                <div className="form-field">
                  <label className="form-field-label">{t.matching.timeOfBirth}</label>
                  <div className="input-with-icon">
                    <input
                      ref={fTimeInputRef}
                      type="time"
                      step="60"
                      value={female.tob}
                      onChange={onChangePerson(
                        setFemale,
                        setFCoords,
                        setFSuggest,
                        fTimer,
                        "tob"
                      )}
                      className="form-field-input form-input-field"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => fTimeInputRef.current?.showPicker?.() || fTimeInputRef.current?.click()}
                      className="clock-icon-btn"
                      style={{ 
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Clock className="w-5 h-5" style={{ color: "#000000" }} />
                    </button>
                  </div>
                  <p className="form-field-helper">24-hour format</p>
                </div>
                <div className="form-field relative">
                  <label className="form-field-label">Place</label>
                  <div className="input-with-icon">
                    <input
                      placeholder="e.g., Mumbai, India"
                      value={female.place}
                      onChange={onChangePerson(
                        setFemale,
                        setFCoords,
                        setFSuggest,
                        fTimer,
                        "place"
                      )}
                      autoComplete="off"
                      required
                      className="form-field-input form-input-field"
                    />
                    <button
                      type="button"
                      onClick={useMyLocationFemale}
                      disabled={fLocating}
                      className="location-icon-btn"
                      style={{ 
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: fLocating ? "wait" : "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1,
                      }}
                    >
                      {fLocating ? (
                        <LoaderCircle className="w-5 h-5 animate-spin" style={{ color: "#ec4899" }} />
                      ) : (
                        <MapPin className="w-5 h-5" style={{ color: "#ec4899" }} />
                      )}
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
                          className="suggestion-item"
                        >
                          <MapPin className="w-3.5 h-3.5 text-pink-500" />
                          <span className="truncate">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* ---------- Male ---------- */}
            <div
              className="form-section border border-blue-200 bg-blue-50 rounded-2xl"
              style={{
                background: "#eff6ff",
                borderColor: "#bfdbfe",
                width: "100%",
                boxSizing: "border-box",
                minWidth: 0,
              }}
            >
              <div className="results-header mb-3">
                <Sun style={{ color: "#3b82f6" }} />
                <h3 className="results-title">{t.matching.maleDetails}</h3>
              </div>
              <div className="form-grid-2col">
                {/* Row 1: Full Name + Date */}
                <div className="form-field">
                  <label className="form-field-label">{t.matching.maleName}</label>
                  <input
                    type="text"
                    placeholder="e.g., Rohan"
                    value={male.fullName}
                    onChange={onChangePerson(
                      setMale,
                      setMCoords,
                      setMSuggest,
                      mTimer,
                      "fullName"
                    )}
                    required
                    className="form-field-input form-input-field"
                  />
                </div>
                <div className="form-field">
                  <label className="form-field-label">{t.matching.dateOfBirth}</label>
                  <div className="input-with-icon">
                    <input
                      ref={mDateInputRef}
                      type="date"
                      value={male.dob}
                      onChange={onChangePerson(
                        setMale,
                        setMCoords,
                        setMSuggest,
                        mTimer,
                        "dob"
                      )}
                      required
                      className="form-field-input form-input-field"
                    />
                    <button
                      type="button"
                      onClick={() => mDateInputRef.current?.showPicker?.() || mDateInputRef.current?.click()}
                      className="input-icon-btn"
                    >
                      <Calendar className="w-5 h-5" style={{ color: "#000000" }} />
                    </button>
                  </div>
                </div>
                {/* Row 2: Time + Place */}
                <div className="form-field">
                  <label className="form-field-label">{t.matching.timeOfBirth}</label>
                  <div className="input-with-icon">
                    <input
                      ref={mTimeInputRef}
                      type="time"
                      step="60"
                      value={male.tob}
                      onChange={onChangePerson(
                        setMale,
                        setMCoords,
                        setMSuggest,
                        mTimer,
                        "tob"
                      )}
                      className="form-field-input form-input-field"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => mTimeInputRef.current?.showPicker?.() || mTimeInputRef.current?.click()}
                      className="clock-icon-btn"
                      style={{ 
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Clock className="w-5 h-5" style={{ color: "#000000" }} />
                    </button>
                  </div>
                  <p className="form-field-helper">24-hour format</p>
                </div>
                <div className="form-field relative">
                  <label className="form-field-label">Place</label>
                  <div className="input-with-icon">
                    <input
                      placeholder="e.g., Mumbai, India"
                      value={male.place}
                      onChange={onChangePerson(
                        setMale,
                        setMCoords,
                        setMSuggest,
                        mTimer,
                        "place"
                      )}
                      autoComplete="off"
                      required
                      className="form-field-input form-input-field"
                    />
                    <button
                      type="button"
                      onClick={useMyLocationMale}
                      disabled={mLocating}
                      className="location-icon-btn"
                      style={{ 
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: mLocating ? "wait" : "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1,
                      }}
                    >
                      {mLocating ? (
                        <LoaderCircle className="w-5 h-5 animate-spin" style={{ color: "#3b82f6" }} />
                      ) : (
                        <MapPin className="w-5 h-5" style={{ color: "#3b82f6" }} />
                      )}
                    </button>
                  </div>
                  {mSuggest.length > 0 && (
                    <div className="suggestions">
                      {mSuggest.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setMale((p) => ({ ...p, place: s.label }));
                            setMCoords(s);
                            setMSuggest([]);
                          }}
                          className="suggestion-item"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          <span className="truncate">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  type="submit"
                  disabled={submitting || fFilled < 3 || mFilled < 3}
                  className="btn-primary"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
                      Calculating…
                    </>
                  ) : (
                    <>It's a Match?</>
                  )}
                </button>
                <button
                  type="reset"
                  onClick={resetAllFields}
                  className="btn-ghost"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Matching History Sidebar */}
          <div className="matching-history-sidebar">
            <div className="history-header">
              <h3 className="history-title">
                <Sparkles className="w-5 h-5" style={{ color: "#ca8a04" }} />
                Matching History
              </h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="btn-ghost"
                  style={{ padding: "0.5rem", fontSize: "0.875rem" }}
                >
                  <RotateCcw className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="empty-state">No matching history yet.</div>
            ) : (
              <div className="history-cards">
                {history.map((item) => {
                  const isExpanded = expandedAddresses[`${item.id}-female`] || expandedAddresses[`${item.id}-male`];
                  return (
                    <div
                      key={item.id}
                      className={`history-card ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => loadHistoryIntoForm(item)}
                    >
                    <div className="history-card-top">
                      <div className="history-card-names">
                        <span className="pill pill-female">
                          {item.femaleName || "Female"}
                        </span>
                        <span className="dot-separator">↔</span>
                        <span className="pill pill-male">
                          {item.maleName || "Male"}
                        </span>
                      </div>
                      <div className="history-actions">
                        <button
                          className="use-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadHistoryIntoForm(item);
                          }}
                        >
                          Use
                        </button>
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="history-card-body">
                      <div className="person-block">
                        <div className="person-label">FEMALE</div>
                        <div className="person-meta">
                          <Calendar className="meta-icon" />
                          <span>
                            {item.femaleDob || "-"} · {item.femaleTob || "-"}
                          </span>
                        </div>
                        <div className="person-meta">
                          <MapPin className="meta-icon" />
                          <div style={{ flex: 1 }}>
                            <span className={`address-text ${expandedAddresses[`${item.id}-female`] ? 'expanded' : ''}`}>
                              {item.femalePlace || "-"}
                            </span>
                            {item.femalePlace && item.femalePlace.length > 50 && (
                              <button
                                className="show-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedAddresses(prev => ({
                                    ...prev,
                                    [`${item.id}-female`]: !prev[`${item.id}-female`]
                                  }));
                                }}
                              >
                                {expandedAddresses[`${item.id}-female`] ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="person-divider" />
                      <div className="person-block">
                        <div className="person-label">MALE</div>
                        <div className="person-meta">
                          <Calendar className="meta-icon" />
                          <span>
                            {item.maleDob || "-"} · {item.maleTob || "-"}
                          </span>
                        </div>
                        <div className="person-meta">
                          <MapPin className="meta-icon" />
                          <div style={{ flex: 1 }}>
                            <span className={`address-text ${expandedAddresses[`${item.id}-male`] ? 'expanded' : ''}`}>
                              {item.malePlace || "-"}
                            </span>
                            {item.malePlace && item.malePlace.length > 50 && (
                              <button
                                className="show-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedAddresses(prev => ({
                                    ...prev,
                                    [`${item.id}-male`]: !prev[`${item.id}-male`]
                                  }));
                                }}
                              >
                                {expandedAddresses[`${item.id}-male`] ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Explanation Card - Below form and history */}
        <div style={{ marginTop: "-3rem", width: "100%", padding: "0 1rem" }}>
          <div 
            className="card backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-xl border"
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))",
              borderColor: "rgba(212, 175, 55, 0.3)",
              maxWidth: "100%",
            }}
          >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "1.5rem",
            borderBottom: "2px solid rgba(212, 175, 55, 0.2)",
            marginBottom: "1.5rem",
          }}>
            <h2 style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#1f2937",
              margin: 0,
            }}>
              Understanding Compatibility Matching
            </h2>
          </div>
          <div style={{ padding: 0 }}>
            <p style={{
              fontSize: "0.875rem",
              color: "#374151",
              fontStyle: "normal",
              marginBottom: 0,
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.6,
            }}>
              The <strong>Ashtakoot System</strong> (8-Point Matching) evaluates compatibility across eight key dimensions: <strong>Varna</strong> (spiritual compatibility), <strong>Vashya</strong> (mutual attraction), <strong>Tara</strong> (birth star compatibility), <strong>Yoni</strong> (nature compatibility), <strong>Graha Maitri</strong> (planetary friendship), <strong>Gana</strong> (temperament), <strong>Bhakoot</strong> (emotional compatibility), and <strong>Nadi</strong> (health compatibility). Each dimension contributes points to the total compatibility score, with higher scores indicating better alignment between partners.
            </p>
          </div>
        </div>
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

            {/* Header */}
            <header className="header left-align">
              <h1 className="title">Pro Kundali Match</h1>
            </header>

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

            {/* AI Astrologer CTA / Chat Window */}
            <div 
              className="card mt-8 ai-astrologer-section"
              style={{ 
                position: "relative",
                zIndex: chatOpen ? 200 : 1,
                marginBottom: "2rem",
                background: "linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 20px rgba(212, 175, 55, 0.15)",
                padding: "1.5rem"
              }}
            >
              {!chatOpen ? (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1">
                    <div
                      className="results-header"
                      style={{ marginBottom: "1rem" }}
                    >
                      <img
                        src="/infinity-symbol.svg"
                        alt="Infinity"
                        style={{
                          width: "24px",
                          height: "24px",
                          transform: "rotate(-45deg)",
                          transformOrigin: "center center",
                        }}
                      />
                      <h3 className="results-title">Astrologer</h3>
                    </div>

                    <h3 className="text-xl md:text-2xl text-gray-900 mb-1">
                      Get a Personalized Reading
                    </h3>
                    <p className="text-sm text-gray-70 max-w-xl">
                      Let our Astrologer interpret your birth chart, dashas
                      and planetary strengths in simple, practical language
                      tailored just for you.
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!validateBirthDetails()) {
                          setError(
                            "Please complete all fields for both individuals, including names, before using the chat."
                          );
                          window.scrollTo({ top: 0, behavior: "smooth" });
                          return;
                        }
                        if (!result) {
                          // Auto-submit if result doesn't exist
                          document.querySelector("form")?.requestSubmit();
                          setTimeout(() => {
                            prepareChatData();
                            setChatSessionId(prev => prev + 1);
                            setChatOpen(true);
                            scrollToChat();
                          }, 2000);
                        } else {
                          prepareChatData();
                          setChatSessionId(prev => prev + 1);
                          setChatOpen(true);
                          scrollToChat();
                        }
                      }}
                      className="relative inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-indigo-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_25px_rgba(250,204,21,0.5)] hover:shadow-[0_0_35px_rgba(250,204,21,0.8)] transition-all duration-200 border border-amber-200/80 group overflow-hidden"
                    >
                      <span className="absolute text-[#1e1b0c] inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_top,_white,transparent_60%)] transition-opacity duration-200" />
                      Talk to Astrologer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="chat-window-container">
                  <Chat
                    key={`matching-chat-${chatSessionId}-${currentFormDataHash || 'new'}`}
                    shouldReset={shouldResetChat}
                    formDataHash={currentFormDataHash}
                    pageTitle="Matching"
                    chatType="matchmaking"
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
                      
                      // Log to verify match data is being passed (only in development)
                      if (process.env.NODE_ENV === 'development' && data.match) {
                        console.log('[Matching] Passing initialData to Chat component:', {
                          hasMatch: !!data.match,
                          matchTotalScore: data.match?.total_score,
                          matchOutOf: data.match?.out_of,
                          matchKeys: data.match ? Object.keys(data.match) : [],
                          matchSample: data.match ? JSON.stringify(data.match).substring(0, 300) : null,
                        });
                      }
                      
                      return data;
                    })()}
                    onClose={() => {
                      setChatOpen(false);
                      setIsAssistantMinimized(true);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Verdict Card */}
            <div className="card mt-6">
              <div className="results-header">
                <Sun style={{ color: "#ca8a04" }} />
                <h3 className="results-title">Ashtakoot Compatibility</h3>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl font-bold text-gold">
                  {Number(result?.total_score ?? 0)}
                  <span className="text-gray-500 text-xl">
                    /{Number(result?.out_of ?? 36)}
                  </span>
                </div>
                <div className="liveBadge">
                  <div className="pulseDot" /> Score Summary
                </div>
              </div>

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
                <div className="card">
                  <div className="results-header">
                    <Moon style={{ color: "#a78bfa" }} />
                    <h3 className="results-title">{t.matching.femaleDetails}</h3>
                  </div>

                  {/* Shadbala / Ishta-Kashta */}
                  <div>
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
                        {(fDetails?.shadbalaRows || []).map((p, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{p.name || "—"}</td>
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

                  {/* Planet Placements */}
                  <div className="mt-6 table-scroll-container">
                    <table className="planet-table placements-table">
                      <thead>
                        <tr>
                          <th>Planet</th>
                          <th>Sign</th>
                          <th>House</th>
                          <th>Nakshatra (Pada)</th>
                          <th>Degrees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(fDetails?.placements || []).map((p, i) => {
                          const nakshatraDisplay = `${p.nakshatra ?? "—"} (${p.pada ?? "—"
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
                                    <div>Full: {p.fullDegree.toFixed(2)}°</div>
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

                {/* Male Details */}
                <div className="card">
                  <div className="results-header">
                    <Sun style={{ color: "#d4af37" }} />
                    <h3 className="results-title">{t.matching.maleDetails}</h3>
                  </div>

                  {/* Shadbala / Ishta-Kashta */}
                  <div>
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
                        {(mDetails?.shadbalaRows || []).map((p, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{p.name || "—"}</td>
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

                  {/* Planet Placements */}
                  <div className="mt-6 table-scroll-container">
                    <table className="planet-table placements-table">
                      <thead>
                        <tr>
                          <th>Planet</th>
                          <th>Sign</th>
                          <th>House</th>
                          <th>Nakshatra (Pada)</th>
                          <th>Degrees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(mDetails?.placements || []).map((p, i) => {
                          const nakshatraDisplay = `${p.nakshatra ?? "—"} (${p.pada ?? "—"
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
                                    <div>Full: {p.fullDegree.toFixed(2)}°</div>
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
      </div>



      {/* Fixed Chat Assistant Card - Show logo until result is generated, then show full card */}
      <div
        className="fixed bottom-6 right-6 z-50 ai-assistant-card"
        style={{
          maxWidth: (!result || isAssistantMinimized) ? "64px" : "320px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {(!result || isAssistantMinimized) ? (
          // Minimized Icon - Astrologer + AI Assistant
          <button
            onClick={() => {
              if (result) {
                setIsAssistantMinimized(false);
              }
            }}
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #d4af37, #b8972e)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 20px rgba(212, 175, 55, 0.15)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px) scale(1.05)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15), 0 0 30px rgba(212, 175, 55, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 20px rgba(212, 175, 55, 0.15)";
            }}
          >
            {/* Golden Infinity Icon (tilted 45 degrees) */}
            <div style={{ position: "relative", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src="/infinity-symbol.svg"
                alt="Infinity"
                style={{
                  width: "32px",
                  height: "32px",
                  transform: "rotate(-45deg)",
                  transformOrigin: "center center",
                  filter: "brightness(0) invert(1)",
                }}
              />
            </div>
            {/* Pulsing indicator */}
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
                animation: "pulse 2s infinite",
              }}
            />
          </button>
        ) : (
          <div
            className="chat-assistant-card"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 20px rgba(212, 175, 55, 0.15)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              position: "relative",
            }}
            onClick={() => {
              // Check if form is filled
              const isFormFilled = female.fullName && female.dob && female.tob && female.place &&
                male.fullName && male.dob && male.tob && male.place;
              if (!isFormFilled) {
                setError("Please complete all birth details for both individuals before using the chat.");
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
              }
              if (!result) {
                // Submit form if no result yet
                const form = document.querySelector("form");
                if (form) {
                  form.requestSubmit();
                  setTimeout(() => {
                    setChatSessionId(prev => prev + 1);
                    setChatOpen(true);
                    setTimeout(() => {
                      document
                        .querySelector(".ai-astrologer-section")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }, 2000);
                }
              } else {
                setChatSessionId(prev => prev + 1);
                setChatOpen(true);
                setTimeout(() => {
                  document
                    .querySelector(".ai-astrologer-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15), 0 0 30px rgba(212, 175, 55, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 20px rgba(212, 175, 55, 0.15)";
            }}
          >
            {/* Minimize Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAssistantMinimized(true);
              }}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(212, 175, 55, 0.1)",
                border: "1px solid rgba(212, 175, 55, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(212, 175, 55, 0.2)";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(212, 175, 55, 0.1)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <X size={16} color="#b8972e" />
            </button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #d4af37, #b8972e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
                }}
              >
                <img
                  src="/infinity-symbol.svg"
                  alt="Infinity"
                  style={{
                    width: "24px",
                    height: "24px",
                    transform: "rotate(-45deg)",
                    transformOrigin: "center center",
                    filter: "brightness(0) invert(1)",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 4px 0",
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    background: "linear-gradient(135deg, #d4af37, #b8972e)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Astrologer Assistant
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    margin: 0,
                    lineHeight: "1.5",
                  }}
                >
                  Get personalized insights about your birth chart, planetary positions, and astrological predictions
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "12px",
                borderTop: "1px solid rgba(212, 175, 55, 0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                  Online
                </span>
              </div>
              <button
                disabled={submitting}
                style={{
                  background: submitting 
                    ? "rgba(212, 175, 55, 0.5)" 
                    : "linear-gradient(135deg, #d4af37, #b8972e)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  color: "#1f2937",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(251, 191, 36, 0.3)",
                  opacity: submitting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(251, 191, 36, 0.5)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(251, 191, 36, 0.3)";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering card click
                  if (submitting) return;
                  
                  // Since we only show full card when result exists, we can directly open chat
                  if (result) {
                    setChatSessionId(prev => prev + 1);
                    setChatOpen(true);
                    setTimeout(() => {
                      document
                        .querySelector(".ai-astrologer-section")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }
                }}
              >
                {submitting ? "Loading..." : "Start Chat"}
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
