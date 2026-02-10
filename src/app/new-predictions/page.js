"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import Modal from "@/components/Modal";
import Chat from "@/components/Chat";
import ChartHighlights from "./components/ChartHighlights";
import DashaIQ from "./components/DashaIQ";
import VimshottariMahaDasha from "@/components/VimshottariMahaDasha";
import WhatsBlocking from "./components/WhatsBlocking";
import {
  Sparkles,
  History,
  Calendar,
  Clock,
  MapPin,
  Orbit,
  Moon,
  Sun,
  X,
  Loader2,
  RotateCcw,
  Trash2,
  PhoneCallIcon,
  Phone,
} from "lucide-react";
import "./prediction.css";
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api";
import {
  trackEvent,
  trackActionStart,
  trackActionComplete,
  trackActionAbandon,
  trackPageView,
} from "@/lib/analytics";
import { computeAshtakavarga, SIGNS } from "@/lib/ashtakavarga";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/components/LoadingStates";
import HighConvertingInsights from "./high-converting-page";
import AstrologerAssistant from "@/components/AstrologerAssistant";


// -----------------------------
// Chart Challenge Analyzer
// -----------------------------


// -----------------------------
// Life Area Scoring Rules
// -----------------------------
const LIFE_RULES = {
  career: {
    houses: [10, 6, 2],
    planets: ["Sun", "Saturn", "Mercury"],
  },
  wealth: {
    houses: [2, 11],
    planets: ["Jupiter", "Venus"],
  },
  marriage: {
    houses: [7],
    planets: ["Venus", "Moon"],
  },
  health: {
    houses: [1, 6, 8],
    planets: ["Sun", "Mars"],
  },
  property: {
    houses: [4],
    planets: ["Moon", "Mars"],
  },
  travel: {
    houses: [3, 9, 12],
    planets: ["Mercury", "Rahu"],
  },
};


function analyzeChartChallenges({
  shadbalaRows,
  placements,
  mahaRows,
  currentDashaChain,
  insights,
}) {
  let score = 0;
  const reasons = [];

  const weakPlanets = shadbalaRows.filter(
    (p) => typeof p.percent === "number" && p.percent < 45,
  );

  if (weakPlanets.length >= 2) {
    score += 2;
    reasons.push(
      `Weak planetary strength (${weakPlanets.map((p) => p.name).join(", ")})`,
    );
  }

  const malefics = ["Saturn", "Mars", "Rahu", "Ketu"];
  const strongMalefics = shadbalaRows.filter(
    (p) =>
      malefics.includes(p.name) &&
      typeof p.percent === "number" &&
      p.percent > 65,
  );

  if (strongMalefics.length >= 2) {
    score += 2;
    reasons.push("Strong malefic influence detected");
  }

  const retroCount = placements.filter((p) => p.retro).length;
  if (retroCount >= 2) {
    score += 1;
    reasons.push("Multiple retrograde planets causing delays");
  }

  if (currentDashaChain && /Saturn|Rahu|Ketu/.test(currentDashaChain)) {
    score += 2;
    reasons.push(`Challenging Dasha period (${currentDashaChain})`);
  }

  if (insights?.scores) {
    const stressedAreas = Object.entries(insights.scores).filter(
      ([_, v]) => v < 60,
    );

    if (stressedAreas.length >= 2) {
      score += 2;
      reasons.push(
        `Stress seen in ${stressedAreas.map(([k]) => k).join(", ")}`,
      );
    }
  }

  let severity = "LOW";
  if (score >= 6) severity = "HIGH";
  else if (score >= 4) severity = "MEDIUM";

  return {
    hasChallenges: score >= 4,
    severity,
    reasons,
  };
}

// -----------------------------
// Life Area Score Calculator
// -----------------------------
function calculateLifeScores({
  placements,
  shadbalaRows,
  currentDashaChain,
}) {
  const scores = {};

  Object.entries(LIFE_RULES).forEach(([area, rule]) => {
    let score = 50;

    // Planet strength
    rule.planets.forEach((planet) => {
      const p = shadbalaRows.find(
        (x) => x.name?.toLowerCase() === planet.toLowerCase(),
      );

      if (p?.percent >= 70) score += 10;
      else if (p?.percent >= 55) score += 5;
      else if (p?.percent < 45) score -= 8;
    });

    // House activation
    const houseHits = placements.filter(
  (p) => rule.houses.includes(Number(p.house))
).length;

const normalize = (s) =>
  s?.toLowerCase().replace(/[^a-z]/g, "");

rule.planets.forEach((planet) => {
  const p = shadbalaRows.find(
    (x) => normalize(x.name) === normalize(planet),
  );
});


    score += Math.min(houseHits * 4, 12);

    // Dasha emphasis
    if (currentDashaChain) {
      rule.planets.forEach((planet) => {
        if (currentDashaChain.includes(planet)) {
          score += 6;
        }
      });
    }

    // Retrograde penalty
    placements.forEach((p) => {
      if (p.retro && rule.planets.includes(p.name)) {
        score -= 5;
      }
    });

    scores[area] = Math.max(25, Math.min(95, Math.round(score)));
  });

  return scores;
}


export default function PredictionsPage() {
  const { t } = useTranslation();
  // Track page view on mount
  useEffect(() => {
    trackPageView("/predictions", "Astrological Predictions");
  }, []);

  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  // Timezone (UTC offset hours) - default IST 5.5
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const suggestTimer = useRef(null);
  const formRef = useRef(null);
  const historyCardRef = useRef(null);
  const initialHistoryHeightRef = useRef(null); // Store initial height to lock it
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  /* Removed unused useEffect for assistant card */
  const [selectedMaha, setSelectedMaha] = useState(null);

  const [antarOpen, setAntarOpen] = useState(false);
  const [antarLoading, setAntarLoading] = useState(false);
  const [antarError, setAntarError] = useState("");
  const [antarRows, setAntarRows] = useState([]);
  const [predictionsOpen, setPredictionsOpen] = useState(false);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState("");
  const [aiPredictions, setAiPredictions] = useState("");
  const [selectedPlanetForPredictions, setSelectedPlanetForPredictions] =
    useState(null);
  const [fullName, setFullName] = useState("");
  const [openAntarFor, setOpenAntarFor] = useState(null);
  const [antarLoadingFor, setAntarLoadingFor] = useState(null);
  // === Prediction History ===
  const PREDICTION_HISTORY_KEY = "prediction_history_v1";
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true); // Control history visibility
  const [isAddressExpanded, setIsAddressExpanded] = useState({});
  const [inlineChatOpen, setInlineChatOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(0);
  const [shouldResetChat, setShouldResetChat] = useState(false);
  const lastResultRef = useRef(null); // Track last result to detect new submissions
  const [showNotification, setShowNotification] = useState(false);

  const addressRefs = useRef({});
  const [isOverflowing, setIsOverflowing] = useState({});
  const [gender, setGender] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form data hash for chat conversation management
  const [currentFormDataHash, setCurrentFormDataHash] = useState(null);
  const previousFormDataHashRef = useRef(null);
  const router = useRouter();
  


  const toggleAddressVisibility = (id) => {
    setIsAddressExpanded((prevState) => ({
      ...prevState,
      [id]: !prevState[id], // Toggle visibility for specific address
    }));
  };

  /**
   * Generates a unique hash from form data (name, gender, DOB, TOB, place)
   * This hash is used to identify if form data has changed
   */
  const generateFormDataHash = () => {
    const formData = {
      fullName: (fullName || "").trim().toUpperCase(),
      gender: (gender || "").trim().toUpperCase(),
      dob: (dob || "").trim(),
      tob: (tob || "").trim(),
      place: (place || "").trim().toUpperCase(),
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
    if (!fullName && !dob && !tob && !place) {
      return;
    }

    // If hash changed, reset chat
    if (
      previousFormDataHashRef.current !== null &&
      previousFormDataHashRef.current !== newHash
    ) {
      console.log("[Predictions] Form data changed, resetting chat:", {
        previousHash: previousFormDataHashRef.current,
        newHash: newHash,
      });
      // Reset chat by incrementing session ID
      setChatSessionId((prev) => prev + 1);
      setShouldResetChat(true);
    }

    // Update the hash
    previousFormDataHashRef.current = newHash;
    setCurrentFormDataHash(newHash);
  };

  const handleTalkToAstrologer = () => {
    router.push("/talk-to-astrologer");
  };

  const getHistory = () => {
    try {
      const stored = localStorage.getItem(PREDICTION_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  };

  const saveToHistory = (entry) => {
    let current = getHistory();
    const key = `${entry.fullName.toUpperCase()}-${entry.dob}-${entry.tob}`;
    current = current.filter(
      (it) => `${it.fullName.toUpperCase()}-${it.dob}-${it.tob}` !== key,
    );
    // Add timestamp for "Last generated" display
    const entryWithTimestamp = {
      ...entry,
      lastGenerated: new Date().toISOString(),
    };
    current.unshift(entryWithTimestamp);
    if (current.length > 10) current = current.slice(0, 10);
    localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(current));
    setHistory(current);
    // Show history after saving
    setShowHistory(true);
  };

  const deleteHistoryItem = (id) => {
    if (showDeleteConfirm !== id) {
      setShowDeleteConfirm(id);
      return;
    }
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
    setShowDeleteConfirm(null);
  };

  // Filter history based on search
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const searchLower = historySearch.toLowerCase();
    return history.filter((item) => {
      const nameMatch = (item.fullName || "")
        .toLowerCase()
        .includes(searchLower);
      const placeMatch = (item.place || "").toLowerCase().includes(searchLower);
      const dobMatch = (item.dob || "").includes(searchLower);
      return nameMatch || placeMatch || dobMatch;
    });
  }, [history, historySearch]);

  const clearHistory = () => {
    localStorage.removeItem(PREDICTION_HISTORY_KEY);
    setHistory([]);
  };
  const loadFromHistory = (item) => {
    setFullName(item.fullName || "");
    setGender(item.gender || "");
    setDob(item.dob || "");
    setTob(item.tob || "");
    setPlace(item.place || "");
    setSelectedCoords(null);
    setSuggestions([]);
    setError("");
    setResult(null); // optional: clear old result so user explicitly re-runs

    // Generate hash for loaded history item to check if chat should be restored
    const loadedHash = (() => {
      const formData = {
        fullName: (item.fullName || "").trim().toUpperCase(),
        gender: (item.gender || "").trim().toUpperCase(),
        dob: (item.dob || "").trim(),
        tob: (item.tob || "").trim(),
        place: (item.place || "").trim().toUpperCase(),
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
    }

    // Update hash reference
    previousFormDataHashRef.current = loadedHash;
    setCurrentFormDataHash(loadedHash);
  };

  // Track if we should auto-submit
  const shouldAutoSubmit = useRef(false);

// Auto-scroll target
const birthInfoRef = useRef(null);

  // Auto-scroll to Birth Info when result is ready
useEffect(() => {
  if (result && birthInfoRef.current) {
    const t = setTimeout(() => {
      birthInfoRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    return () => clearTimeout(t);
  }
}, [result]);


  useEffect(() => {
    setHistory(getHistory());

    // Load data from landing page form if available
    try {
      const savedData = localStorage.getItem("tgs:aiPredictionForm");
      if (savedData) {
        const parsedData = JSON.parse(savedData);

        // Hide history when coming from landing page
        setShowHistory(false);

        // Populate form fields
        if (parsedData.name && parsedData.name.trim()) {
          setFullName(parsedData.name.trim());
        }
        if (parsedData.gender) {
          setGender(parsedData.gender);
        }
        if (parsedData.dob) {
          // Check if date is already in YYYY-MM-DD format (from date input)
          // or needs conversion from DD-MM-YYYY
          const parts = parsedData.dob.split("-");
          if (parts.length === 3) {
            // Check if first part is 4 digits (YYYY-MM-DD format)
            if (parts[0].length === 4) {
              // Already in YYYY-MM-DD format, use directly
              setDob(parsedData.dob);
            } else {
              // Convert DD-MM-YYYY to YYYY-MM-DD format
              const [day, month, year] = parts;
              setDob(
                `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
              );
            }
          } else {
            // Use as-is if format is unexpected
            setDob(parsedData.dob);
          }
        }
        if (parsedData.tob) {
          setTob(parsedData.tob);
        }
        if (parsedData.place && parsedData.place.trim()) {
          setPlace(parsedData.place.trim());
        }

        // Set flag to auto-submit if all required fields are present
        if (
          parsedData.dob &&
          parsedData.tob &&
          parsedData.place &&
          parsedData.gender &&
          parsedData.name
        ) {
          shouldAutoSubmit.current = true;
        }

        // Clear the saved data so it doesn't auto-fill again next time
        localStorage.removeItem("tgs:aiPredictionForm");

        // Scroll to top to avoid scrolling through history cards
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      } else {
        // Normal load - show history immediately
        setShowHistory(true);
      }
    } catch (error) {
      console.error("Error loading saved form data:", error);
      // On error, still show history
      setShowHistory(true);
    }
  }, []);

  // Monitor form field changes to detect when form data changes
  // This ensures chat resets when user changes form inputs before submitting
  useEffect(() => {
    // Only check if form has some data (not empty)
    // This will detect changes as user types, but checkAndResetChatOnFormChange
    // only resets if the hash actually changed, so it's safe
    if (fullName || dob || tob || place) {
      checkAndResetChatOnFormChange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, gender, dob, tob, place]);

  // Auto-submit effect - runs after form fields are populated
  useEffect(() => {
    if (
      shouldAutoSubmit.current &&
      dob &&
      tob &&
      place &&
      gender &&
      fullName &&
      !submitting &&
      !result
    ) {
      shouldAutoSubmit.current = false; // Reset flag

      // Trigger form submission after a short delay to ensure all state is updated
      const timer = setTimeout(() => {
        const form = document.querySelector("form");
        if (form) {
          // Create and dispatch a submit event
          const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          form.dispatchEvent(submitEvent);
        }
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [dob, tob, place, gender, fullName, submitting, result]);

  useEffect(() => {
    const check = () => {
      const map = {};
      history.forEach((item) => {
        const el = addressRefs.current[item.id];
        if (el) {
          map[item.id] = el.scrollHeight > el.clientHeight;
        }
      });
      setIsOverflowing(map);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [history]);

  // ref to Planet Placements section & auto-scroll when results arrive =====
  const placementsSectionRef = useRef(null);
  const setPlacementsRef = (el) => {
    placementsSectionRef.current = el;
  };
  useEffect(() => {
    if (result && placements.length > 0 && placementsSectionRef.current) {
      const t = setTimeout(() => {
        placementsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [result]); // placements depends on result; recompute happens right after

  useEffect(() => {
    if (!formRef.current || !historyCardRef.current || !showHistory) return;

    const syncHeights = () => {
      // If results are already generated, lock the history card to its initial height
      if (result && initialHistoryHeightRef.current) {
        historyCardRef.current.style.height = `${initialHistoryHeightRef.current}px`;
        historyCardRef.current.style.maxHeight = `${initialHistoryHeightRef.current}px`;
        return;
      }

      // Otherwise, sync with form height
      const formHeight = formRef.current?.offsetHeight || 0;
      if (!formHeight) return;

      // Store the initial height before results are generated
      if (!initialHistoryHeightRef.current) {
        initialHistoryHeightRef.current = formHeight;
      }

      historyCardRef.current.style.height = `${formHeight}px`;
      historyCardRef.current.style.maxHeight = `${formHeight}px`;
    };

    syncHeights();
    window.addEventListener("resize", syncHeights);

    return () => {
      window.removeEventListener("resize", syncHeights);
    };
  }, [
    dob,
    tob,
    place,
    fullName,
    suggestions.length,
    history.length,
    showHistory,
    result,
  ]);

  const getZodiacSign = (signNumber) => {
    const signs = [
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
    return signs[(signNumber - 1) % 12];
  };
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
  async function useMyLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const label = await reverseGeocodeCoords(latitude, longitude);
      setPlace(label);
      setSelectedCoords({ latitude, longitude, label });
      setSuggestions([]);
    } catch (e) {
      setError(
        "Could not access your location. Please allow permission or type the city manually.",
      );
    } finally {
      setLocating(false);
    }
  }
  function validate() {
    if (!fullName || !fullName.trim())
      return { error: "Please enter your Name." };
    if (!gender) return { error: "Please select your Gender." };
    if (!dob) return { error: "Please enter your Date of Birth." };
    if (!tob) return { error: "Please enter your Time of Birth." };
    if (!place.trim()) return { error: "Please enter your Place of Birth." };

    const dobParts = dob.split("-").map((n) => parseInt(n, 10));
    let Y, M, D;
    if (dobParts.length === 3 && dobParts[0] > 1900) {
      [Y, M, D] = dobParts;
    } else if (dobParts.length === 3) {
      [D, M, Y] = dobParts;
    }
    if (
      !Y ||
      !M ||
      !D ||
      Number.isNaN(Y) ||
      Number.isNaN(M) ||
      Number.isNaN(D)
    ) {
      return { error: "Please enter a valid date (DD-MM-YYYY)." };
    }

    const tparts = tob.split(":").map((n) => parseInt(n, 10));
    const [H, Min, S = 0] = tparts;
    if ([H, Min, S].some((v) => Number.isNaN(v))) {
      return { error: "Please enter a valid time." };
    }

    if (
      selectedCoords &&
      (!Number.isFinite(selectedCoords.latitude) ||
        !Number.isFinite(selectedCoords.longitude))
    ) {
      return {
        error: "Saved location is incomplete. Please pick the place again.",
      };
    }

    return { parsed: { Y, M, D, H, Min, S } };
  }
  const fmtTime = (h, m, s = 0) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s,
    ).padStart(2, "0")}`;
  const safeParse = (v) => {
    try {
      return typeof v === "string" ? JSON.parse(v) : v;
    } catch {
      return v;
    }
  };
  const fetchSuggestions = (q) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        setSuggesting(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(
          q,
        )}`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "NiraLive Astro/1.0 (education)",
          },
        });
        const arr = await res.json();
        const opts = (arr || []).map((it) => ({
          label: it.display_name,
          latitude: parseFloat(it.lat),
          longitude: parseFloat(it.lon),
        }));
        setSuggestions(opts);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggesting(false);
      }
    }, 250);
  };
  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    // Check if form data has changed and reset chat if needed
    checkAndResetChatOnFormChange();

    // Mark that chat should reset on next result (new form submission)
    setShouldResetChat(true);

    const { error: validationError, parsed } = validate();
    if (validationError) {
      trackEvent("form_validation_failed", { form_name: "predictions" });
      setError(validationError);
      return;
    }

    // Track form submission
    trackActionStart("predictions_generation");
    trackEvent("form_submit", { form_name: "predictions" });

    // Hide history during submission to avoid visual clutter
    setShowHistory(false);
    setSubmitting(true);
    try {
      const geo = selectedCoords || (await geocodePlace(place));
      if (!geo)
        throw new Error(
          "Unable to find location. Try a more specific place name (e.g., City, Country).",
        );
      if (!Number.isFinite(geo.latitude) || !Number.isFinite(geo.longitude)) {
        throw new Error(
          "Location data is incomplete. Please pick the place again.",
        );
      }
      const { Y, M, D, H, Min, S } = parsed;
      // Automatically determine timezone based on location
      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude);
      if (!Number.isFinite(tz)) {
        setError(
          "Could not determine timezone for the selected place. Please try another location.",
        );
        setSubmitting(false);
        return;
      }
      saveToHistory({
        id: Date.now(),
        fullName,
        gender,
        dob,
        tob: fmtTime(H, Min, S),
        place: geo.label || place,
      });
      const payload = {
        year: Y,
        month: M,
        date: D,
        hours: H,
        minutes: Min,
        seconds: S,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: Number.isFinite(tz) ? tz : 0,
        language: "en",
        config: {
          observation_point: "topocentric",
          ayanamsha: "lahiri",
          house_system: "whole_sign",
        },
      };
      const { results, errors } = await astrologyAPI.getMultipleCalculations(
        [
          "shadbala/summary",
          "vimsottari/dasa-information",
          "vimsottari/maha-dasas",
          "planets",
          "western/natal-wheel-chart",
          "planets/extended",
        ],
        payload,
      );
      const vimsRaw = results?.["vimsottari/dasa-information"];
      const shadbalaRaw = results?.["shadbala/summary"];
      const mahaRaw = results?.["vimsottari/maha-dasas"];
      const planetsRaw = results?.["planets/extended"];
      const westernChartSvgRaw = results?.["western/natal-wheel-chart"];

      // Enhanced parsing for western chart - handle various response formats
      let westernChartSvg = null;
      if (westernChartSvgRaw) {
        // Try different response formats
        if (typeof westernChartSvgRaw === "string") {
          westernChartSvg = westernChartSvgRaw.trim();
        } else if (typeof westernChartSvgRaw.output === "string") {
          westernChartSvg = westernChartSvgRaw.output.trim();
        } else if (
          westernChartSvgRaw.data &&
          typeof westernChartSvgRaw.data === "string"
        ) {
          westernChartSvg = westernChartSvgRaw.data.trim();
        } else if (
          westernChartSvgRaw.svg &&
          typeof westernChartSvgRaw.svg === "string"
        ) {
          westernChartSvg = westernChartSvgRaw.svg.trim();
        } else if (typeof westernChartSvgRaw === "object") {
          // Try to find SVG string in the object
          const stringValue = Object.values(westernChartSvgRaw).find(
            (v) => typeof v === "string" && v.trim().startsWith("<svg"),
          );
          if (stringValue) {
            westernChartSvg = stringValue.trim();
          }
        }
      }

      // Log for debugging
      if (errors?.["western/natal-wheel-chart"]) {
        console.warn(
          "[Western Chart] Error:",
          errors["western/natal-wheel-chart"],
        );
      }
      if (!westernChartSvg && westernChartSvgRaw) {
        console.warn(
          "[Western Chart] Raw response format:",
          typeof westernChartSvgRaw,
          westernChartSvgRaw,
        );
      }
      const vimsParsed = vimsRaw
        ? safeParse(safeParse(vimsRaw.output ?? vimsRaw))
        : null;

      // Debug vimsottari parsing
      if (!vimsParsed) {
        console.warn("[Predictions] vimsRaw is null or empty:", vimsRaw);
      } else {
        console.log("[Predictions] vimsParsed structure:", {
          hasCurrent: !!vimsParsed.current,
          hasRunning: !!vimsParsed.running,
          hasNow: !!vimsParsed.now,
          hasMahadashaList: !!vimsParsed.mahadasha_list,
          hasMahadasha: !!vimsParsed.mahadasha,
          hasMd: !!vimsParsed.md,
          keys: Object.keys(vimsParsed),
        });
      }
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
      let finalShadbala = shadbalaParsed;
      const looksEmpty =
        !shadbalaParsed ||
        (typeof shadbalaParsed === "object" &&
          Object.keys(shadbalaParsed).length === 0);
      if (looksEmpty) {
        const altPayload = {
          ...payload,
          config: { ...payload.config, observation_point: "topocentric" },
        };
        try {
          const alt = await astrologyAPI.getSingleCalculation(
            "shadbala/summary",
            altPayload,
          );
          let altParsed = safeParse(safeParse(alt.output ?? alt));
          if (altParsed && typeof altParsed === "object" && altParsed.output)
            altParsed = safeParse(altParsed.output);
          if (altParsed && Object.keys(altParsed).length)
            finalShadbala = altParsed;
        } catch {}
      }
      let planetsParsed = planetsRaw
        ? safeParse(safeParse(planetsRaw.output ?? planetsRaw))
        : null;
      if (
        planetsParsed &&
        typeof planetsParsed === "object" &&
        planetsParsed.output
      ) {
        planetsParsed = safeParse(planetsParsed.output);
      }
      let finalPlanetParsed = planetsParsed;
      const looksEmptyPlanets =
        !planetsParsed ||
        (typeof planetsParsed === "object" &&
          Object.keys(planetsParsed).length === 0);
      if (looksEmptyPlanets) {
        const altPayload = {
          ...payload,
          config: { ...payload.config, observation_point: "topocentric" },
        };
        try {
          const alt = await astrologyAPI.getSingleCalculation(
            "planets/extended",
            altPayload,
          );
          let altParsed = safeParse(safeParse(alt.output ?? alt));
          if (altParsed && typeof altParsed === "object" && altParsed.output)
            altParsed = safeParse(altParsed.output);
          if (altParsed && Object.keys(altParsed).length)
            finalPlanetParsed = altParsed;
        } catch {}
      }
      // Track successful predictions generation
      trackActionComplete("predictions_generation", {
        success: true,
        has_coordinates: !!(geo.latitude && geo.longitude),
      });
      trackEvent("predictions_generated", { success: true });

      setResult({
        input: { dob, tob: fmtTime(H, Min, S), place: geo.label || place, tz },
        coords: { latitude: geo.latitude, longitude: geo.longitude },
        configUsed: { observation_point: "geocentric", ayanamsha: "lahiri" },
        vimsottari: vimsParsed,
        planets: finalPlanetParsed,
        maha: mahaParsed,
        shadbala: finalShadbala,
        westernChartSvg,
        apiErrors: { ...errors },
      });

      // Reset chat on new form submission (increment session ID to trigger reset)
      if (shouldResetChat) {
        setChatSessionId((prev) => prev + 1);
        setShouldResetChat(false);
      }

      // Lock history card height to prevent expansion after results are generated
      if (historyCardRef.current && initialHistoryHeightRef.current) {
        historyCardRef.current.style.height = `${initialHistoryHeightRef.current}px`;
        historyCardRef.current.style.maxHeight = `${initialHistoryHeightRef.current}px`;
      }
      // Lock history card height to prevent expansion after results are generated
      if (historyCardRef.current && initialHistoryHeightRef.current) {
        historyCardRef.current.style.height = `${initialHistoryHeightRef.current}px`;
        historyCardRef.current.style.maxHeight = `${initialHistoryHeightRef.current}px`;
      }
    } catch (err) {
      // Track predictions generation failure
      trackActionAbandon(
        "predictions_generation",
        err?.message || "unknown_error",
      );
      trackEvent("predictions_generation_failed", {
        error: err?.message || "unknown_error",
      });
      setError(err?.message || "Failed to compute predictions.");
    } finally {
      setSubmitting(false);
    }
  }
  const currentDashaChain = useMemo(() => {
    // PRIORITY 1: Try to extract from maha data first (since API call to vimsottari/dasa-information is failing)
    // Use mahaRows which is already computed and sorted
    console.log("[Predictions] Extracting Dasha. Result data:", {
      hasResult: !!result,
      hasMaha: !!result?.maha,
      hasVimsottari: !!result?.vimsottari,
      mahaType: typeof result?.maha,
      mahaSample: result?.maha
        ? typeof result.maha === "string"
          ? result.maha.substring(0, 100)
          : JSON.stringify(result.maha).substring(0, 100)
        : null,
    });

    const m = result?.maha;
    if (m) {
      const obj = typeof m === "string" ? safeParse(m) : m;
      if (obj && typeof obj === "object") {
        const entries = Object.entries(obj);
        if (entries.length > 0) {
          const now = new Date();
          let currentMaha = null;

          // Find the maha dasha that is currently active based on dates
          for (const [key, value] of entries) {
            const startDate = value.start_time || value.start;
            const endDate = value.end_time || value.end;

            if (startDate && endDate) {
              try {
                const start = new Date(startDate);
                const end = new Date(endDate);
                // Check if current date is within range
                if (now >= start && now <= end) {
                  currentMaha = value.Lord || value.lord || value.planet || key;
                  console.log(
                    "[Predictions] Found current maha dasha by date:",
                    currentMaha,
                    "from",
                    startDate,
                    "to",
                    endDate,
                  );
                  break;
                }
              } catch (e) {
                console.warn(
                  "[Predictions] Error parsing dates for maha dasha:",
                  key,
                  startDate,
                  endDate,
                  e,
                );
              }
            } else if (!currentMaha) {
              // If no dates available, use the first entry we find
              currentMaha = value.Lord || value.lord || value.planet || key;
              console.log(
                "[Predictions] Using maha dasha without date check:",
                currentMaha,
              );
            }
          }

          // If no current found by date, use the first one (earliest start)
          if (!currentMaha && entries.length > 0) {
            const sorted = entries.sort((a, b) => {
              try {
                const aStart = new Date(a[1].start_time || a[1].start || 0);
                const bStart = new Date(b[1].start_time || b[1].start || 0);
                return aStart - bStart;
              } catch {
                return 0;
              }
            });
            const first = sorted[0];
            currentMaha =
              first[1].Lord || first[1].lord || first[1].planet || first[0];
            console.log(
              "[Predictions] Using first maha dasha (sorted by start date):",
              currentMaha,
            );
          }

          // Final fallback: just use the first entry
          if (!currentMaha && entries.length > 0) {
            const first = entries[0];
            currentMaha =
              first[1].Lord || first[1].lord || first[1].planet || first[0];
            console.log(
              "[Predictions] Using first maha dasha (fallback):",
              currentMaha,
            );
          }

          if (currentMaha) {
            console.log(
              "[Predictions] Dasha extracted from maha data:",
              currentMaha,
            );
            return String(currentMaha).trim();
          }
        }
      }
    }

    // PRIORITY 2: Try vimsottari data (if API call succeeded)
    const v = result?.vimsottari;
    if (!v) {
      console.warn(
        "[Predictions] No vimsottari data found in result (API call may have failed)",
      );
      return null;
    }

    // Enhanced extraction logic - try multiple paths
    // First, try current/running/now structure
    const current = v.current || v.running || v.now || v?.mahadasha?.current;
    if (current && (current.md || current.mahadasha)) {
      const md = current.md || current.mahadasha;
      const ad = current.ad || current.antardasha;
      const pd = current.pd || current.pratyantar;
      const dashaChain = [md, ad, pd]
        .filter(Boolean)
        .map((x) => {
          if (typeof x === "string") return x.trim();
          return (x.name || x.planet || x).toString().trim();
        })
        .join(" > ");
      if (dashaChain) {
        console.log(
          "[Predictions] Dasha extracted from current/running structure:",
          dashaChain,
        );
        return dashaChain;
      }
    }

    // Try mahadasha_list structure
    const md = (v.mahadasha_list || v.mahadasha || v.md || [])[0];
    if (md) {
      const adList = v.antardasha_list || v.antardasha || v.ad || {};
      const firstMdKey = md?.key || md?.planet || md?.name;

      // Try to get antardasha
      let ad = null;
      if (firstMdKey && adList[firstMdKey]) {
        ad = Array.isArray(adList[firstMdKey])
          ? adList[firstMdKey][0]
          : adList[firstMdKey];
      } else if (Array.isArray(adList)) {
        ad = adList[0];
      } else if (typeof adList === "object" && Object.keys(adList).length > 0) {
        // Try first key in the object
        const firstKey = Object.keys(adList)[0];
        ad = Array.isArray(adList[firstKey])
          ? adList[firstKey][0]
          : adList[firstKey];
      }

      // Try to get pratyantar
      const pdList = v.pratyantar_list || v.pd || {};
      let pd = null;
      if (ad) {
        const firstAdKey = ad?.key || ad?.planet || ad?.name;
        if (firstAdKey && pdList[firstAdKey]) {
          pd = Array.isArray(pdList[firstAdKey])
            ? pdList[firstAdKey][0]
            : pdList[firstAdKey];
        } else if (Array.isArray(pdList)) {
          pd = pdList[0];
        } else if (
          typeof pdList === "object" &&
          Object.keys(pdList).length > 0
        ) {
          const firstKey = Object.keys(pdList)[0];
          pd = Array.isArray(pdList[firstKey])
            ? pdList[firstKey][0]
            : pdList[firstKey];
        }
      }

      const dashaChain = [
        md?.name || md?.planet || md?.key,
        ad?.name || ad?.planet || ad?.key,
        pd?.name || pd?.planet || pd?.key,
      ]
        .filter(Boolean)
        .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
        .join(" > ");

      if (dashaChain) {
        console.log(
          "[Predictions] Dasha extracted from mahadasha_list structure:",
          dashaChain,
        );
        return dashaChain;
      }

      // If we have at least mahadasha, return it
      const mdName = md?.name || md?.planet || md?.key;
      if (mdName) {
        console.log("[Predictions] Dasha extracted (Maha Dasha only):", mdName);
        return String(mdName).trim();
      }
    }

    // Fallback: Try to get from maha data if available
    const maha = result?.maha;
    if (maha) {
      let mahaData = maha;
      if (typeof maha === "string") {
        try {
          mahaData = JSON.parse(maha);
        } catch (e) {
          mahaData = maha;
        }
      }

      // If it's an object with entries, find the current one
      if (typeof mahaData === "object" && !Array.isArray(mahaData)) {
        const now = new Date();
        let currentMaha = null;

        // Find the maha dasha that is currently active based on dates
        Object.entries(mahaData).forEach(([key, value]) => {
          const startDate = value.start_time || value.start;
          const endDate = value.end_time || value.end;

          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (now >= start && now <= end) {
              currentMaha = value.Lord || value.lord || value.planet || key;
            }
          }
        });

        // If no current found by date, use the first one (earliest start)
        if (!currentMaha) {
          const entries = Object.entries(mahaData);
          if (entries.length > 0) {
            const sorted = entries.sort((a, b) => {
              const aStart = new Date(a[1].start_time || a[1].start || 0);
              const bStart = new Date(b[1].start_time || b[1].start || 0);
              return aStart - bStart;
            });
            const first = sorted[0][1];
            currentMaha =
              first.Lord || first.lord || first.planet || sorted[0][0];
          }
        }

        if (currentMaha) {
          console.log(
            "[Predictions] Dasha extracted from maha data (fallback):",
            currentMaha,
          );
          return String(currentMaha).trim();
        }
      } else if (Array.isArray(mahaData) && mahaData.length > 0) {
        // If it's an array, find current or use first
        const currentMaha =
          mahaData.find((m) => m.isCurrent || m.active || m.current) ||
          mahaData[0];
        if (
          currentMaha &&
          (currentMaha.lord || currentMaha.Lord || currentMaha.planet)
        ) {
          const lord =
            currentMaha.lord || currentMaha.Lord || currentMaha.planet;
          console.log(
            "[Predictions] Dasha extracted from maha array (fallback):",
            lord,
          );
          return String(lord).trim();
        }
      }
    }

    // Log the structure for debugging
    console.warn(
      "[Predictions] Could not extract Dasha. Vimsottari structure:",
      {
        hasCurrent: !!v.current,
        hasRunning: !!v.running,
        hasNow: !!v.now,
        hasMahadashaList: !!v.mahadasha_list,
        hasMahadasha: !!v.mahadasha,
        hasMd: !!v.md,
        hasMaha: !!result?.maha,
        keys: Object.keys(v),
        sample: JSON.stringify(v).substring(0, 200),
      },
    );

    return null;
  }, [result]);

  function buildPayloadForApi() {
    const inp = result?.input;
    const coords = result?.coords;
    if (!inp || !coords) return null;

    // Parse DOB - handle both YYYY-MM-DD (from date input) and DD-MM-YYYY (from text input) formats
    const dobStr = String(inp.dob || "");
    const dobParts = dobStr.split("-").map((n) => parseInt(n, 10));
    let Y, M, D;

    if (dobParts.length === 3) {
      if (dobParts[0] > 1900) {
        // YYYY-MM-DD format (standard for HTML5 date inputs)
        [Y, M, D] = dobParts;
      } else {
        // DD-MM-YYYY format (fallback for manual text entry)
        [D, M, Y] = dobParts;
      }
    } else {
      throw new Error(
        `Invalid date format: ${dobStr}. Expected YYYY-MM-DD or DD-MM-YYYY`,
      );
    }

    // Validate parsed values
    if (
      !Y ||
      !M ||
      !D ||
      Number.isNaN(Y) ||
      Number.isNaN(M) ||
      Number.isNaN(D)
    ) {
      throw new Error(`Invalid date values from: ${dobStr}`);
    }
    if (Y < 1900 || Y > 2100)
      throw new Error(`Year must be between 1900 and 2100: ${Y}`);
    if (M < 1 || M > 12)
      throw new Error(`Month must be between 1 and 12: ${M}`);
    if (D < 1 || D > 31) throw new Error(`Date must be between 1 and 31: ${D}`);

    // Parse time
    const tobStr = String(inp.tob || "");
    const timeParts = tobStr.split(":").map((n) => parseInt(n, 10));
    const [H, Min, S = 0] = timeParts;

    if (Number.isNaN(H) || Number.isNaN(Min) || Number.isNaN(S)) {
      throw new Error(
        `Invalid time format: ${tobStr}. Expected HH:MM or HH:MM:SS`,
      );
    }
    if (H < 0 || H > 23)
      throw new Error(`Hours must be between 0 and 23: ${H}`);
    if (Min < 0 || Min > 59)
      throw new Error(`Minutes must be between 0 and 59: ${Min}`);
    if (S < 0 || S > 59)
      throw new Error(`Seconds must be between 0 and 59: ${S}`);

    return {
      year: Y,
      month: M,
      date: D,
      hours: H,
      minutes: Min,
      seconds: S,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: inp.tz,
      config: {
        observation_point:
          result?.configUsed?.observation_point || "geocentric",
        ayanamsha: result?.configUsed?.ayanamsha || "lahiri",
      },
    };
  }
  async function openAntarInlineFor(mahaLord) {
    if (openAntarFor === mahaLord) {
      setOpenAntarFor(null); // toggle off
      return;
    }

    setOpenAntarFor(mahaLord);
    setAntarLoadingFor(mahaLord);
    setAntarRows([]);

    try {
      const payload = buildPayloadForApi();
      if (!payload) throw new Error("Missing input.");

      const res = await astrologyAPI.getSingleCalculation(
        "vimsottari/maha-dasas-and-antar-dasas",
        payload,
      );

      const out =
        typeof res?.output === "string" ? JSON.parse(res.output) : res;
      const sub = out?.[mahaLord] || {};

      const rows = Object.entries(sub).map(([k, v]) => ({
        lord: k,
        start: v.start_time || v.start,
        end: v.end_time || v.end,
      }));

      rows.sort((a, b) => new Date(a.start) - new Date(b.start));
      setAntarRows(rows);
    } catch (e) {
      setAntarRows([{ error: e.message }]);
    } finally {
      setAntarLoadingFor(null);
    }
  }

  async function openAiPredictionsFor(planetLord) {
    setSelectedPlanetForPredictions(planetLord);
    setPredictionsOpen(true);
    setPredictionsLoading(true);
    setPredictionsError("");
    setAiPredictions("");
    try {
      const inp = result?.input;
      if (!inp) throw new Error("Missing birth details for predictions.");
      const mahaPeriod = mahaRows.find((row) => row.lord === planetLord);
      if (!mahaPeriod) throw new Error("Maha Dasha period not found.");
      const predictions = await generateAiPredictions(
        planetLord,
        mahaPeriod,
        inp,
      );
      setAiPredictions(predictions);
    } catch (e) {
      setPredictionsError(
        e?.message ||
          "Failed to generate personalized astrological predictions.",
      );
    } finally {
      setPredictionsLoading(false);
    }
  }
  async function generateAiPredictions(planet, mahaPeriod) {
    return `Predictions for ${planet} during the period from ${mahaPeriod.start} to ${mahaPeriod.end} based on your data.`;
  }
  const mahaRows = useMemo(() => {
    const m = result?.maha;
    if (!m) return [];
    const obj = typeof m === "string" ? safeParse(m) : m;
    const entries = Object.entries(obj || {});
    return entries
      .map(([k, v]) => ({
        key: k,
        lord: v.Lord || v.lord || v.planet || k,
        start: v.start_time || v.start,
        end: v.end_time || v.end,
      }))
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [result]);
  const shadbalaRows = useMemo(() => {
    let sb = result?.shadbala;
    if (!sb) return [];
    if (sb && typeof sb === "object") {
      const out = sb.output ?? sb.Output ?? sb.data;
      if (out) sb = typeof out === "string" ? safeParse(out) : out;
    }
    if (Array.isArray(sb)) {
      const merged = sb.reduce(
        (acc, it) => (typeof it === "object" ? { ...acc, ...it } : acc),
        {},
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

// -----------------------------
// Ashtakavarga (BAV + SAV)
// -----------------------------
const ashtakavarga = useMemo(() => {
  if (!result?.planets) return null;

  try {
    return computeAshtakavarga(result.planets);
  } catch (e) {
    console.warn("[Ashtakavarga] Failed to compute:", e);
    return null;
  }
}, [result]);



const insights = useMemo(() => {
  if (!result) return null;

  const lifeScores = calculateLifeScores({
    placements,
    shadbalaRows,
    currentDashaChain,
  });

  return {
    accuracy: {
      level: selectedCoords ? "HIGH" : "MEDIUM",
    },

    next30Days: {
      career: { level: "Medium-High", probability: 78, locked: true },
      money: { level: "Mixed", probability: 61, locked: true },
      relationship: { level: "Caution", probability: 48, locked: true },
    },

    scores: lifeScores,

    strongHits: [
      "Authority figures strongly influence your career decisions",
      "Money comes in cycles, not steady flow",
      "You delay commitment until certainty is achieved",
    ],

    blockers: [
      {
        area: "Career Growth",
        reason: "Saturn transit over the 10th lord",
        fixable: true,
      },
      {
        area: "Money Flow",
        reason: "Family karma influencing wealth",
        fixable: true,
      },
    ],

     timeline: {
      past: [
        {
          label: "8 months ago",
          description: "Career opportunity missed",
          confidence: 82,
        },
      ],
      future: [
        {
          label: "Next 3 months",
          description: "New responsibility window",
          confidence: 68,
          locked: true,
        },
      ],
    },
  };
}, [
  result,
  selectedCoords,
  placements,
  shadbalaRows,
  currentDashaChain,
]);


  const challengeAnalysis = useMemo(() => {
    if (!result) return null;

    return analyzeChartChallenges({
      shadbalaRows,
      placements,
      mahaRows,
      currentDashaChain,
      insights,
    });
  }, [result, shadbalaRows, placements, mahaRows, currentDashaChain, insights]);

  const chatData = result
    ? {
        birth: {
          ...result.input,
          fullName: fullName, // Include fullName in birth data
          name: fullName, // Also include as 'name' for compatibility
        },
        coords: result.coords,
        gender,

        // Raw data (in case needed)
        raw: {
          planets: result.planets,
          vimsottari: result.vimsottari,
          maha: result.maha,
          shadbala: result.shadbala,
        },

        // Clean & simplified data for the AI (MUCH easier to reason with)
        placements,
        shadbalaRows,
        mahaRows,
        currentDashaChain,
      }
    : null;

  function computeStrongObservations({
    placements,
    shadbalaRows,
    mahaRows,
    currentDashaChain,
    scores,
  }) {
    const observations = [];
    const potential = [];

    // --- Strong Observations (confidence-driven) ---

    // 1. Strong planets (Shadbala > 70)
    const strongPlanets = shadbalaRows.filter(
      (p) => typeof p.percent === "number" && p.percent >= 70,
    );

    strongPlanets.slice(0, 2).forEach((p) => {
      observations.push(
        `${p.name} is strongly placed, giving consistent results in its domains`,
      );
    });

    // 2. Retrograde influence
    const retro = placements.filter((p) => p.retro);
    if (retro.length > 0) {
      observations.push(
        `Retrograde ${retro[0].name} indicates internalized growth and delayed clarity`,
      );
    }

    // 3. Current Dasha pressure
    if (/Saturn|Rahu|Ketu/.test(currentDashaChain || "")) {
      observations.push(
        `Current dasha phase emphasizes karmic lessons and long-term restructuring`,
      );
    }

    // 4. High life score
    const highScoreArea = Object.entries(scores || {}).find(
      ([_, v]) => v >= 75,
    );
    if (highScoreArea) {
      observations.push(
        `${highScoreArea[0]} matters are a natural strength in this phase of life`,
      );
    }

    // 5. House clustering
    const houseCounts = placements.reduce((acc, p) => {
      acc[p.house] = (acc[p.house] || 0) + 1;
      return acc;
    }, {});
    const crowdedHouse = Object.entries(houseCounts).find(([_, c]) => c >= 3);
    if (crowdedHouse) {
      observations.push(
        `Multiple planets in house ${crowdedHouse[0]} show strong focus in that life area`,
      );
    }

    // --- Potential in Chart (unlockable) ---

    Object.entries(scores || {}).forEach(([area, v]) => {
      if (v >= 55 && v < 70) {
        potential.push(
          `${area} improves significantly with correct timing and guidance`,
        );
      }
    });

    const upcomingMaha = mahaRows.find((m) => new Date(m.start) > new Date());
    if (upcomingMaha) {
      potential.push(
        `${upcomingMaha.lord} Maha Dasha brings new opportunities if prepared early`,
      );
    }

    return {
      strongObservations: observations.slice(0, 5),
      potential: potential.slice(0, 4),
    };
  }

  const observationData = useMemo(() => {
    if (!result) return null;

    return computeStrongObservations({
      placements,
      shadbalaRows,
      mahaRows,
      currentDashaChain,
      scores: insights?.scores,
    });
  }, [result, placements, shadbalaRows, mahaRows, currentDashaChain, insights]);

  function calculateDashaIQ({
    currentDashaChain,
    shadbalaRows,
    placements,
    scores,
  }) {
    if (!currentDashaChain) {
      return { iq: 50, reasoning: ["Dasha data unavailable"] };
    }

    const mahaLord = currentDashaChain.split(">")[0].trim();

    let iq = 50; // neutral baseline
    const reasoning = [];

    /* ---------------------------
     1. Shadbala strength
  ---------------------------- */
    const planetStrength = shadbalaRows.find(
      (p) => p.name?.toLowerCase() === mahaLord.toLowerCase(),
    );

    if (planetStrength?.percent != null) {
      if (planetStrength.percent >= 70) {
        iq += 15;
        reasoning.push(`${mahaLord} is strong in Shadbala`);
      } else if (planetStrength.percent >= 55) {
        iq += 8;
        reasoning.push(`${mahaLord} has moderate strength`);
      } else {
        iq -= 12;
        reasoning.push(`${mahaLord} is weak, causing delays`);
      }
    }

    /* ---------------------------
     2. Malefic / Benefic nature
  ---------------------------- */
    const malefics = ["Saturn", "Rahu", "Ketu", "Mars"];
    const benefics = ["Jupiter", "Venus", "Mercury", "Moon"];

    if (malefics.includes(mahaLord)) {
      iq -= 6;
      reasoning.push(`${mahaLord} Dasha demands patience and discipline`);
    }

    if (benefics.includes(mahaLord)) {
      iq += 6;
      reasoning.push(`${mahaLord} Dasha supports growth and ease`);
    }

    /* ---------------------------
     3. Retrograde penalty
  ---------------------------- */
    const placement = placements.find(
      (p) => p.name?.toLowerCase() === mahaLord.toLowerCase(),
    );

    if (placement?.retro) {
      iq -= 6;
      reasoning.push(`${mahaLord} retrograde causes internalized results`);
    }

    /* ---------------------------
     4. Life-area stress impact
  ---------------------------- */
    const stressedAreas = Object.values(scores || {}).filter(
      (v) => v < 60,
    ).length;

    if (stressedAreas >= 3) {
      iq -= 10;
      reasoning.push("Multiple life areas under stress");
    } else if (stressedAreas === 2) {
      iq -= 5;
      reasoning.push("Some life areas require caution");
    }

    /* ---------------------------
     5. Clamp result
  ---------------------------- */
    iq = Math.max(25, Math.min(95, Math.round(iq)));

    return {
      iq,
      mahaLord,
      reasoning,
    };
  }

  const dashaIQ = useMemo(() => {
    if (!result || !currentDashaChain) return null;

    return calculateDashaIQ({
      currentDashaChain,
      shadbalaRows,
      placements,
      scores: insights?.scores,
    });
  }, [result, currentDashaChain, shadbalaRows, placements, insights]);

  const activeMahaLord = useMemo(() => {
    if (!mahaRows || mahaRows.length === 0) return null;

    const today = new Date();

    const active = mahaRows.find((row) => {
      const start = new Date(row.start);
      const end = new Date(row.end);
      return today >= start && today <= end;
    });

    return active?.lord || null;
  }, [mahaRows]);

  

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

  const astrologerAssistantData = result
  ? {
      person: {
        input: {
          name: fullName,
          dob: result.input.dob,
          tob: result.input.tob,
          place: result.input.place,
          coords: result.coords,
        },
        gender,
      },

      chart: {
        placements,
        shadbalaRows,
        mahaRows,
        currentDashaChain,
      },

      meta: {
        page: "predictions",
      },
    }
  : null;



  // Show full-page loading when submitting and no result yet
  if (submitting && !result) {
    return (
      <PageLoading
        type="predictions"
        message="Consulting the stars for your predictions..."
      />
    );
  }

  return (
    <div
      className="app"
      style={{
        background: undefined,
        minHeight: "100vh",
      }}
    >
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

      {/* Header */}
      <header
        className="header"
        style={{ paddingTop: "0.01rem", marginTop: "0.01rem" }}
      >
        <Sparkles
          className="headerIcon"
          style={{ color: "#ffff", padding: "0.4rem", width: 36, height: 36 }}
        />
        <h1
          className="title"
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
          }}
        >
          {t.predictions.title}
        </h1>
        <p
          className="subtitle"
          style={{ fontSize: "1rem", color: "#6b7280", marginTop: "0.5rem" }}
        >
          {t.predictions.subtitle}
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

      <div className=" py-8">
        {error && (
          <div
            className="mb-6 p-4 rounded-lg border text-sm flex items-center gap-2"
            style={{
              background: "#fef2f2",
              borderColor: "#fecaca",
              color: "#b91c1c",
            }}
          >
            <span>Warning</span> {error}
          </div>
        )}

        {/* === Birth form + History side-by-side === */}
        <div className="birth-history-layout" style={{ width: "100%" }}>
          {/* ==== FORM ==== */}
<form
  ref={formRef}
  onSubmit={onSubmit}
  className="card backdrop-blur-xl rounded-3xl shadow-xl border max-w-4xl bg-white border-gray-200"
>
  {/* Header */}
  <div className="flex items-center gap-3 mb-6">
    <Moon className="w-6 h-6 text-gold" />
    <div>
      <h3 className="form-title">
        {t.predictions.enterDetails}
      </h3>
      <p className="form-subtitle">
        {t.predictions.enterCosmicCoordinates}
      </p>
    </div>
  </div>

  {/* === GRID WRAPPER === */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

    {/* Name */}
    <div className="flex flex-col">
      <label className="form-field-label mb-2">
        Name
      </label>
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Neha (as per records)"
        className="form-field-input"
        required
      />
      <p className="form-field-helper">
        Only letters and spaces
      </p>
    </div>

    {/* Date */}
    <div className="flex flex-col">
      <label className="form-field-label mb-2">
        Date of Birth
      </label>
      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        className="form-field-input"
        required
      />
      <p className="form-field-helper">
        Format: DD-MM-YYYY
      </p>
    </div>

    {/* Time */}
    <div className="flex flex-col">
      <label className="form-field-label mb-2">
        Time of Birth
      </label>
      <input
        type="time"
        value={tob}
        onChange={(e) => setTob(e.target.value)}
        className="form-field-input"
        required
      />
      <p className="form-field-helper">
        24-hour format
      </p>
    </div>

    {/* === ROW 2 (same grid, no span) === */}

    {/* Gender */}
    <div className="flex flex-col">
      <label className="form-field-label mb-2">
        Gender
      </label>

      <div className="gender-segmented">
        <button
          type="button"
          onClick={() => setGender("Male")}
          className={`gender-segment ${gender === "Male" ? "active" : ""}`}
        >
          Male
        </button>

        <button
          type="button"
          onClick={() => setGender("Female")}
          className={`gender-segment ${gender === "Female" ? "active" : ""}`}
        >
          Female
        </button>
      </div>

      <p className="form-field-helper">
        Personalize chart reading
      </p>
    </div>

    {/* Place */}
    <div className="flex flex-col">
      <label className="form-field-label mb-2">
        Place
      </label>

      <div className="relative">
        <input
          placeholder="e.g., Mumbai, India"
          value={place}
          onChange={(e) => {
            const q = e.target.value;
            setPlace(q);
            fetchSuggestions(q);
          }}
          className="form-field-input pr-10"
          required
        />

        <button
          type="button"
          onClick={useMyLocation}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5"
        >
          <MapPin className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <p className="form-field-helper">
        Choose the nearest city
      </p>
    </div>

    {/* Button */}
    <div className="flex flex-col">
      <label className="invisible mb-2">
        Hidden
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary h-[52px] w-full"
      >
        {submitting ? "Calculating..." : "Get Predictions"}
      </button>

      <p className="cta-helper text-center">
        No signup required • Takes ~10 seconds
      </p>
    </div>

  </div>
</form>


          {/* Prediction History to the RIGHT of the form */}
          {showHistory && (
            <div className="history-side">
              <div className="card history-card mx-auto" ref={historyCardRef}>
                <div className="results-header">
                  <History style={{ color: "#ca8a04" }} />
                  <h3 className="results-title flex items-center gap-2">
                    Saved Profiles
                  </h3>

                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="btn btn-ghost text-sm ml-auto flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" /> Clear
                    </button>
                  )}
                </div>

                {/* Search input */}
                {history.length > 0 && (
                  <input
                    type="text"
                    placeholder="Search by name, place, or date..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="history-search"
                  />
                )}

                {history.length === 0 ? (
                  <div className="empty-state">No saved profiles yet.</div>
                ) : filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    No profiles match your search.
                  </div>
                ) : (
                  <div className="history-list">
                    {filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className="history-card-row"
                        onClick={() => loadFromHistory(item)}
                      >
                        <div className="history-row-text">
                          <div className="h-name">
                            {item.fullName}{" "}
                            {item.gender
                              ? `(${item.gender.toLowerCase()})`
                              : ""}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              flexWrap: "wrap",
                              marginTop: "0.25rem",
                            }}
                          >
                            <div
                              className="h-date"
                              style={{
                                fontSize: "0.8125rem",
                                color: "#6b7280",
                              }}
                            >
                              <strong style={{ color: "#374151" }}>DOB:</strong>{" "}
                              {item.dob}
                            </div>
                            <div
                              className="h-time"
                              style={{
                                fontSize: "0.8125rem",
                                color: "#6b7280",
                              }}
                            >
                              <strong style={{ color: "#374151" }}>
                                Time:
                              </strong>{" "}
                              {item.tob}
                            </div>
                          </div>

                          {/* Address */}
                          <div
                            className="h-place"
                            style={{ marginTop: "0.25rem" }}
                          >
                            <div
                              ref={(el) => (addressRefs.current[item.id] = el)}
                              className={`address ${
                                isAddressExpanded[item.id] ? "show-full" : ""
                              }`}
                              title={item.place}
                              style={{
                                fontSize: "0.8125rem",
                                color: "#6b7280",
                              }}
                            >
                              <strong style={{ color: "#374151" }}>
                                Place:
                              </strong>{" "}
                              {item.place}
                            </div>

                            {isOverflowing[item.id] && (
                              <button
                                className="show-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAddressVisibility(item.id);
                                }}
                              >
                                {isAddressExpanded[item.id]
                                  ? "Show Less"
                                  : "..."}
                              </button>
                            )}
                          </div>

                          {/* Last generated timestamp */}
                          {item.lastGenerated && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#9ca3af",
                                marginTop: "0.375rem",
                              }}
                            >
                              Last generated:{" "}
                              {(() => {
                                const date = new Date(item.lastGenerated);
                                const now = new Date();
                                const diffMs = now - date;
                                const diffDays = Math.floor(
                                  diffMs / (1000 * 60 * 60 * 24),
                                );
                                if (diffDays === 0) return "Today";
                                if (diffDays === 1) return "1 day ago";
                                if (diffDays < 7) return `${diffDays} days ago`;
                                return date.toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                });
                              })()}
                            </div>
                          )}
                        </div>

                        <div className="history-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadFromHistory(item);
                            }}
                            className="use-btn"
                          >
                            Load
                          </button>

                          {showDeleteConfirm === item.id ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#6b7280",
                                }}
                              >
                                Delete?
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteHistoryItem(item.id);
                                }}
                                className="delete-btn"
                                style={{
                                  background: "#dc2626",
                                  color: "#fff",
                                  padding: "0.25rem 0.5rem",
                                }}
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(null);
                                }}
                                style={{
                                  background: "#f3f4f6",
                                  color: "#374151",
                                  padding: "0.25rem 0.5rem",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteHistoryItem(item.id);
                              }}
                              className="delete-btn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div
            style={{
              marginTop: "3rem",
              maxWidth: "90rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {/* Birth Info */}
<div
  ref={birthInfoRef}
  id="birth-info"
  className="card"
  style={{ scrollMarginTop: "96px" }}
>
              <div className="results-header">
                <Sun style={{ color: "#ca8a04" }} />
                <h3 className="results-title">Birth Information</h3>
              </div>
              <div className="birth-info-grid">
                <div className="info-card">
                  <div className="info-label">
                    <Calendar />
                    {t.predictions.enterDetails}
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
                          mins,
                        ).padStart(2, "0")}`;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="info-card">
                  <div className="info-label">
                    <MapPin />
                    {t.predictions.place}
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

<ChartHighlights
  strongObservations={observationData?.strongObservations || []}
  potential={observationData?.potential || []}
/>

            {challengeAnalysis?.hasChallenges && (
              <div className="mt-6 rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.2)] relative overflow-hidden">
                {/* Decorative Glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-200/40 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-48 h-48 bg-yellow-100/60 rounded-full blur-2xl" />
                </div>

                {/* Content Grid */}
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* LEFT: Text Content */}
                  <div className="max-w-2xl">
                    <div
                      className="results-header"
                      // style={{ marginBottom: "1rem" }}
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
                      Feeling uncertain about what lies ahead?
                    </h3>

                    <p className="text-sm text-gray-70 max-w-xl">
                      Your chart indicates phases where clarity and direction
                      matter most. A seasoned astrologer can help translate
                      these patterns into confident, grounded decisions.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      {challengeAnalysis.reasons.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => {
                        setChatSessionId((prev) => prev + 1);
                        setInlineChatOpen(true);
                      }}
                      className="relative inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-indigo-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_25px_rgba(250,204,21,0.5)] hover:shadow-[0_0_35px_rgba(250,204,21,0.8)] transition-all duration-200 border border-amber-200/80 group overflow-hidden mt-6"
                    >
                      <span className="absolute text-[#1e1b0c] inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_top,_white,transparent_60%)] transition-opacity duration-200" />
                      Talk to Astrologer
                    </button>
                  </div>

                  {/* RIGHT: Sage Illustration */}
                  <div className="relative hidden lg:flex justify-end">
                    <img
                      src="/images/cosmic.png"
                      alt="Astrologer sage illustration"
                      className="w-[360px] xl:w-[400px] opacity-90 drop-shadow-[0_15px_25px_rgba(251,191,36,0.35)]"
                    />
                  </div>
                </div>
              </div>
            )}

            <DashaIQ
  dashaIQ={dashaIQ}
  onTalkToAstrologer={handleTalkToAstrologer}
/>

      <VimshottariMahaDasha
        mahaRows={mahaRows}
        antarRows={antarRows}
        openAntarFor={openAntarFor}
        antarLoadingFor={antarLoadingFor}
        openAntarInlineFor={openAntarInlineFor}
        activeMahaLord={activeMahaLord}
      />

      <WhatsBlocking
  blockers={insights?.blockers || []}
  onTalkToAstrologer={handleTalkToAstrologer}
/>




            {/* Expert Astrologer CTA / Chat Window */}
            <div
              className="card ai-astrologer-section mt-6"
              style={{
                position: "relative",
                zIndex: inlineChatOpen ? 200 : 1,
                marginBottom: "2rem",
                background: "linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                boxShadow:
                  "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 20px rgba(212, 175, 55, 0.15)",
                padding: "1.5rem",
              }}
            >
              {!inlineChatOpen ? (
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
                      Get Expert Astrological Guidance
                    </h3>
                    <p className="text-sm text-gray-70 max-w-xl">
                      Consult with our experienced Vedic astrologer who will
                      interpret your birth chart, dashas, and planetary
                      strengths using time-tested traditional methods. Receive
                      clear, practical insights based on authentic Vedic
                      astrology principles, personalized to your unique birth
                      details.
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setChatSessionId((prev) => prev + 1);
                        setInlineChatOpen(true);
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
                    key={`predictions-chat-${chatSessionId}-${currentFormDataHash || "new"}`}
                    pageTitle="Predictions"
                    initialData={chatData}
                    onClose={() => setInlineChatOpen(false)}
                    chatType="prediction"
                    shouldReset={shouldResetChat}
                    formDataHash={currentFormDataHash}
                  />
                </div>
              )}
            </div>

    
    {ashtakavarga && (
  <div>
    {/* Header */}
    <div className="">
      {/* <Orbit style={{ color: "#ca8a04" }} /> */}
      <div>
        <h3 className="section-title flex justify-center align-center">Ashtakavarga</h3>
        
      </div>
    </div>
  <div className="card mt-6">
    {/* Legend */}
    <div
      className="flex flex-wrap gap-4 text-xs mb-4"
      style={{ color: "#374151" }}
    >
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        Strong support (30+)
      </div>
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        Moderate (23–29)
      </div>
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        Low support (≤22)
      </div>
    </div>

    {/* SAV Grid */}
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {ashtakavarga.SAV.map((v, i) => {
        const strength =
          v >= 30 ? "strong" : v <= 22 ? "weak" : "medium";

        return (
          <div
            key={i}
            className="rounded-xl border text-center py-3 px-2 transition"
            style={{
              borderColor:
                strength === "strong"
                  ? "rgba(34,197,94,0.4)"
                  : strength === "weak"
                  ? "rgba(239,68,68,0.4)"
                  : "rgba(156,163,175,0.4)",
              background:
                strength === "strong"
                  ? "rgba(34,197,94,0.06)"
                  : strength === "weak"
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(107,114,128,0.04)",
            }}
          >
            <div
  style={{
    fontSize: "0.75rem",
    color: "#6b7280",
    marginBottom: "0.15rem",
  }}
>
  {SIGNS[i]}
</div>


            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color:
                  strength === "strong"
                    ? "#15803d"
                    : strength === "weak"
                    ? "#b91c1c"
                    : "#374151",
              }}
            >
              {v}
            </div>
          </div>
        );
      })}
    </div>
  </div>
  </div>
)}






            {result && insights && (
              <section className="converting-card">
                <HighConvertingInsights
                  insights={insights}
                  observations={observationData}
                  dashaIQ={dashaIQ}
                  shadbalaRows={shadbalaRows}
                  mahaRows={mahaRows}
                  antarRows={antarRows}
                  openAntarFor={openAntarFor}
                  antarLoadingFor={antarLoadingFor}
                  openAntarInlineFor={openAntarInlineFor}
                  activeMahaLord={activeMahaLord}
                  onTalkToAstrologer={handleTalkToAstrologer}
                  currentDashaChain = {currentDashaChain}
                />
              </section>
            )}

            {/* Planet Placements */}
            {placements.length > 0 ? (
              <div
                ref={setPlacementsRef}
                id="planet-placements"
                className="card mt-6 mb-6"
                style={{ scrollMarginTop: "96px" }} // keeps it nicely below your fixed header when scrolled
              >
                <div className="results-header">
                  <Orbit style={{ color: "#ca8a04" }} />
                  <h3 className="results-title">Planet Placements (D1)</h3>
                </div>
                <div className="table-scroll-container">
                  <table className="planet-table">
                    <colgroup>
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                    </colgroup>
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
                          (r) => (r.name || "").toLowerCase() === lname,
                        );
                        if (!row)
                          row = shadbalaRows.find((r) =>
                            (r.name || "").toLowerCase().startsWith(lname),
                          );
                        if (!row)
                          row = shadbalaRows.find((r) =>
                            (r.name || "").toLowerCase().includes(lname),
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
                                row.strength_percent,
                            )
                          : null;
                        const ishtaVal = row
                          ? parsePct(
                              row.ishta ??
                                row.ishta_phala ??
                                row.ishta_bala ??
                                row.ishta_percent,
                            )
                          : null;
                        const kashtaVal = row
                          ? parsePct(
                              row.kashta ??
                                row.kashta_phala ??
                                row.kashta_bala ??
                                row.kashta_percent,
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
                            <td>
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
                            <td>
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
                  No planet data found. Submit the form or try a different
                  timezone.
                </div>
              </div>
            )}
          </div>
        )}
        {/* Antar Dasha Modal */}
        <Modal
          open={antarOpen}
          onClose={() => setAntarOpen(false)}
          title={
            selectedMaha
              ? `${selectedMaha} Maha Dasha - Antar Periods`
              : "Antar Dasha"
          }
          position="center"
        >
          {antarLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-4" />
              <div className="text-base text-gray-600 font-medium">
                Loading Antar Dasha periods...
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Calculating planetary sub-periods
              </div>
            </div>
          ) : antarError ? (
            <div className="py-6 px-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Unable to Load Data
              </h3>
              <p
                className="text-sm border rounded-lg px-4 py-3"
                style={{
                  background: "#fef2f2",
                  borderColor: "#fecaca",
                  color: "#b91c1c",
                }}
              >
                {antarError}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {antarRows.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Moon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3
                    className="text-lg font-medium mb-2"
                    style={{
                      color: "#1f2937",
                    }}
                  >
                    No Antar Dasha Data
                  </h3>
                  <p
                    className="text-sm"
                    style={{
                      color: "#6b7280",
                    }}
                  >
                    No sub-periods found for this Maha Dasha. Please submit the
                    form above to generate data.
                  </p>
                </div>
              ) : (
                <div className="table-scroll-container">
                  <table className="planet-table">
                    <thead>
                      <tr>
                        <th>Antar Dasha Lord</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {antarRows.map((ad, i) => {
                        const startDate = ad.start
                          ? new Date(ad.start).toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-";
                        const endDate = ad.end
                          ? new Date(ad.end).toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-";
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500, color: "#1f2937" }}>
                              {ad.lord || "-"}
                            </td>
                            <td>{startDate}</td>
                            <td>{endDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>
        {/* Astrological Predictions Modal */}
        <Modal
          open={predictionsOpen}
          onClose={() => setPredictionsOpen(false)}
          title={
            selectedPlanetForPredictions
              ? `Predictions - ${selectedPlanetForPredictions} Maha Dasha`
              : "Predictions"
          }
          position="center"
        >
          {predictionsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
              <div className="text-sm text-gray-600">
                Analyzing your birth chart and generating personalized
                predictions...
              </div>
            </div>
          ) : predictionsError ? (
            <div
              className="py-4 text-sm border rounded-lg px-4"
              style={{
                background: "#fef2f2",
                borderColor: "#fecaca",
                color: "#b91c1c",
              }}
            >
              {predictionsError}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {aiPredictions ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {aiPredictions}
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm rounded-lg p-4 border"
                  style={{
                    background: "#f9fafb",
                    borderColor: "#d1d5db",
                    color: "#6b7280",
                  }}
                >
                  No predictions available.
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setPredictionsOpen(false)}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>

      {/* PREDICTION EXPLANATION – ACCORDION CARD */}
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
              AI-Powered Vedic Astrology Predictions Explained
            </h1>

            <p className="text-sm mt-1 text-slate-600">
              Understand how we generate your personalized astrological insights
              using traditional Vedic principles enhanced by AI analysis.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 w-full">
              <button
                className="btn-primary w-full sm:w-auto px-6 py-3"
                onClick={handleTalkToAstrologer}
              >
                Talk to an Astrologer
              </button>

              <button
                className="btn btn-secondary w-full sm:w-auto px-6 py-3"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Get Your Predictions
              </button>
            </div>
          </div>

          {/* ACCORDIONS GO HERE */}
          
          {/* EXPLANATION ACCORDIONS */}
          <Section
            title="How Your Birth Chart Is Calculated"
            content={[
              "Exact planetary longitudes at birth",
              "House placements using Vedic systems",
              "Ayanamsha and observational corrections",
              "Timezone and location-based accuracy",
            ]}
          >
            Your birth chart is calculated using precise astronomical data based
            on your
            <strong> date, time, and place of birth</strong>. Even a difference
            of a few minutes or kilometers can shift planetary house placements,
            which is why accurate location and timezone detection is critical.
            We use Vedic astrology calculation methods with modern astronomical
            precision to determine the exact positions of all planets,
            ascendant, and house cusps at the moment of your birth.
          </Section>

          <Section
            title="What Planetary Positions Reveal"
            content={[
              "Where life energy is focused",
              "How different life areas interact",
              "Natural tendencies and behavioral patterns",
              "Strengths, weaknesses, and karmic themes",
            ]}
          >
            Planetary placements show <strong>where</strong> and{" "}
            <strong>how</strong>
            different energies operate in your life. The sign shows the nature
            of the energy, the house shows the life area affected, and aspects
            reveal how planets influence each other. Together, these placements
            explain why certain life themes repeat, why some areas feel
            effortless, and why others require conscious effort.
          </Section>

          <Section
            title="Understanding Shadbala (Planetary Strength)"
            content={[
              "Physical and positional strength of planets",
              "Ability to give results",
              "Why some planets dominate outcomes",
              "Why weak planets cause delays",
            ]}
          >
            Shadbala measures how capable each planet is to deliver results. A
            planet may be well placed but weak in strength, or strong but placed
            in a challenging house. Strong planets produce clearer, more
            consistent results. Weak planets often indicate delays, internal
            struggles, or the need for remedies and conscious effort.
          </Section>

          <Section
            title="What Dasha Periods Tell You About Timing"
            content={[
              "Major life phases and transitions",
              "Why events happen at specific times",
              "Why effort succeeds in some periods",
              "Why patience is required in others",
            ]}
          >
            Dasha systems reveal <strong>when</strong> planetary energies become
            active. While your birth chart shows potential, dashas activate that
            potential over time. This is why two people with similar charts
            experience life very differently. Dashas explain why opportunities
            open in certain years and close in others.
          </Section>

          <Section
            title="Why Current Dasha Matters Most"
            content={[
              "Defines present life focus",
              "Explains emotional and mental state",
              "Shows immediate challenges and support",
              "Guides short and mid-term decisions",
            ]}
          >
            Your current Maha and Antar Dasha describe the dominant planetary
            influence shaping your present experiences. Understanding this phase
            allows you to work *with* time instead of against it. Awareness of
            your running dasha helps reduce confusion, improve decision timing,
            and manage expectations realistically.
          </Section>

          <Section
            title="AI Insights vs Traditional Interpretation"
            content={[
              "Pattern recognition across chart layers",
              "Cross-checking planetary data",
              "Consistency validation",
              "Human astrologer interpretation support",
            ]}
          >
            AI helps analyze large combinations quickly and consistently,
            identifying patterns that may be overlooked manually. However,
            interpretation still follows traditional Vedic astrology principles.
            AI enhances accuracy and speed, while astrologers add contextual
            judgment, remedies, and practical guidance.
          </Section>

          <div className="text-sm mt-6 text-gray-500 text-center mx-auto max-w-2xl">
            Astrology highlights tendencies, timings, and probabilities so you
            can make informed decisions. These predictions help you prepare
            mentally and practically for upcoming phases.
          </div>
        </div>
      </div>

      <a
        href="/talk-to-astrologer"
        className="global-floater global-floater--astrologer"
        aria-label="Talk to Astrologer"
        style={{
          bottom: "20px",
          right: "100px",
          transition: "right 0.3s ease",
          display: "none", // Hiding it as per request to replace floating button, or we can keep it if user wants backup. User said "Replace this floating button".
        }}
      >
        <PhoneCallIcon className="global-floater-icon" />
        <span className="global-floater-text">Talk to Astrologer</span>
      </a>

      <AstrologerAssistant
  pageTitle="Predictions"
  initialData={astrologerAssistantData}
  chatType="prediction"
  shouldReset={shouldResetChat}
  formDataHash={currentFormDataHash}
  chatSessionId={chatSessionId}
  show={true}
  hasData={!!result}
  tabLabel={fullName || "Astrologer"} // 👈 NAME ON TAB
 />

    </div>
  );
}
