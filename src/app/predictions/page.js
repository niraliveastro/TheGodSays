"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import Modal from "@/components/Modal";
import Chat from "@/components/Chat";
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
} from "lucide-react";
import "./predictions.css";
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api";
import { trackEvent, trackActionStart, trackActionComplete, trackActionAbandon, trackPageView } from "@/lib/analytics";
import { PageLoading } from "@/components/LoadingStates";
export default function PredictionsPage() {
  const { t } = useTranslation();
      // Track page view on mount
  useEffect(() => {
    trackPageView('/predictions', 'AI Predictions');
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

  // Automatically show full assistant card when results are generated
  useEffect(() => {
    if (result) {
      setIsAssistantMinimized(false);
    } else {
      setIsAssistantMinimized(true);
    }
  }, [result]);
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(0);
  const [shouldResetChat, setShouldResetChat] = useState(false);
  const lastResultRef = useRef(null); // Track last result to detect new submissions
  const [showNotification, setShowNotification] = useState(false);
  const [isAssistantMinimized, setIsAssistantMinimized] = useState(true);
  const addressRefs = useRef({});
  const [isOverflowing, setIsOverflowing] = useState({});
  const [gender, setGender] = useState("");
  
  // Form data hash for chat conversation management
  const [currentFormDataHash, setCurrentFormDataHash] = useState(null);
  const previousFormDataHashRef = useRef(null);

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
      fullName: (fullName || '').trim().toUpperCase(),
      gender: (gender || '').trim().toUpperCase(),
      dob: (dob || '').trim(),
      tob: (tob || '').trim(),
      place: (place || '').trim().toUpperCase(),
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
    if (!fullName && !dob && !tob && !place) {
      return;
    }
    
    // If hash changed, reset chat
    if (previousFormDataHashRef.current !== null && previousFormDataHashRef.current !== newHash) {
      console.log('[Predictions] Form data changed, resetting chat:', {
        previousHash: previousFormDataHashRef.current,
        newHash: newHash,
      });
      // Reset chat by incrementing session ID
      setChatSessionId(prev => prev + 1);
      setShouldResetChat(true);
    }
    
    // Update the hash
    previousFormDataHashRef.current = newHash;
    setCurrentFormDataHash(newHash);
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
      (it) => `${it.fullName.toUpperCase()}-${it.dob}-${it.tob}` !== key
    );
    current.unshift(entry);
    if (current.length > 10) current = current.slice(0, 10);
    localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(current));
    setHistory(current);
    // Show history after saving
    setShowHistory(true);
  };

  const deleteHistoryItem = (id) => {
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

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
        fullName: (item.fullName || '').trim().toUpperCase(),
        gender: (item.gender || '').trim().toUpperCase(),
        dob: (item.dob || '').trim(),
        tob: (item.tob || '').trim(),
        place: (item.place || '').trim().toUpperCase(),
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
    }
    
    // Update hash reference
    previousFormDataHashRef.current = loadedHash;
    setCurrentFormDataHash(loadedHash);
  };


  // Track if we should auto-submit
  const shouldAutoSubmit = useRef(false);

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
              setDob(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
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
        if (parsedData.dob && parsedData.tob && parsedData.place && parsedData.gender && parsedData.name) {
          shouldAutoSubmit.current = true;
        }

        // Clear the saved data so it doesn't auto-fill again next time
        localStorage.removeItem("tgs:aiPredictionForm");
        
        // Scroll to top to avoid scrolling through history cards
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (shouldAutoSubmit.current && dob && tob && place && gender && fullName && !submitting && !result) {
      shouldAutoSubmit.current = false; // Reset flag
      
      // Trigger form submission after a short delay to ensure all state is updated
      const timer = setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          // Create and dispatch a submit event
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
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
  }, [dob, tob, place, fullName, suggestions.length, history.length, showHistory, result]);

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
        "Could not access your location. Please allow permission or type the city manually."
      );
    } finally {
      setLocating(false);
    }
  }
  function validate() {
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
    if (!Y || !M || !D || Number.isNaN(Y) || Number.isNaN(M) || Number.isNaN(D)) {
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
      s
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
          q
        )}`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "RahuNow/1.0 (education)",
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
      trackEvent('form_validation_failed', { form_name: 'predictions' });
      setError(validationError);
      return;
    }
    
    // Track form submission
    trackActionStart('predictions_generation');
    trackEvent('form_submit', { form_name: 'predictions' });
    
    // Hide history during submission to avoid visual clutter
    setShowHistory(false);
    setSubmitting(true);
    try {
      const geo = selectedCoords || (await geocodePlace(place));
      if (!geo)
        throw new Error(
          "Unable to find location. Try a more specific place name (e.g., City, Country)."
        );
      if (
        !Number.isFinite(geo.latitude) ||
        !Number.isFinite(geo.longitude)
      ) {
        throw new Error("Location data is incomplete. Please pick the place again.");
      }
      const { Y, M, D, H, Min, S } = parsed;
      // Automatically determine timezone based on location
      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude);
      if (!Number.isFinite(tz)) {
        setError("Could not determine timezone for the selected place. Please try another location.");
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
          house_system: "Placidus",
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
        payload
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
        } else if (westernChartSvgRaw.data && typeof westernChartSvgRaw.data === "string") {
          westernChartSvg = westernChartSvgRaw.data.trim();
        } else if (westernChartSvgRaw.svg && typeof westernChartSvgRaw.svg === "string") {
          westernChartSvg = westernChartSvgRaw.svg.trim();
        } else if (typeof westernChartSvgRaw === "object") {
          // Try to find SVG string in the object
          const stringValue = Object.values(westernChartSvgRaw).find(v => typeof v === "string" && v.trim().startsWith("<svg"));
          if (stringValue) {
            westernChartSvg = stringValue.trim();
          }
        }
      }
      
      // Log for debugging
      if (errors?.["western/natal-wheel-chart"]) {
        console.warn("[Western Chart] Error:", errors["western/natal-wheel-chart"]);
      }
      if (!westernChartSvg && westernChartSvgRaw) {
        console.warn("[Western Chart] Raw response format:", typeof westernChartSvgRaw, westernChartSvgRaw);
      }
      const vimsParsed = vimsRaw
        ? safeParse(safeParse(vimsRaw.output ?? vimsRaw))
        : null;
      
      // Debug vimsottari parsing
      if (!vimsParsed) {
        console.warn('[Predictions] vimsRaw is null or empty:', vimsRaw);
      } else {
        console.log('[Predictions] vimsParsed structure:', {
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
            altPayload
          );
          let altParsed = safeParse(safeParse(alt.output ?? alt));
          if (altParsed && typeof altParsed === "object" && altParsed.output)
            altParsed = safeParse(altParsed.output);
          if (altParsed && Object.keys(altParsed).length)
            finalShadbala = altParsed;
        } catch { }
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
            altPayload
          );
          let altParsed = safeParse(safeParse(alt.output ?? alt));
          if (altParsed && typeof altParsed === "object" && altParsed.output)
            altParsed = safeParse(altParsed.output);
          if (altParsed && Object.keys(altParsed).length)
            finalPlanetParsed = altParsed;
        } catch { }
      }
      // Track successful predictions generation
      trackActionComplete('predictions_generation', {
        success: true,
        has_coordinates: !!(geo.latitude && geo.longitude)
      });
      trackEvent('predictions_generated', { success: true });
      
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
        setChatSessionId(prev => prev + 1);
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
      trackActionAbandon('predictions_generation', err?.message || 'unknown_error');
      trackEvent('predictions_generation_failed', { error: err?.message || 'unknown_error' });
      setError(err?.message || "Failed to compute predictions.");
    } finally {
      setSubmitting(false);
    }
  }
  const currentDashaChain = useMemo(() => {
    // PRIORITY 1: Try to extract from maha data first (since API call to vimsottari/dasa-information is failing)
    // Use mahaRows which is already computed and sorted
    console.log('[Predictions] Extracting Dasha. Result data:', {
      hasResult: !!result,
      hasMaha: !!result?.maha,
      hasVimsottari: !!result?.vimsottari,
      mahaType: typeof result?.maha,
      mahaSample: result?.maha ? (typeof result.maha === 'string' ? result.maha.substring(0, 100) : JSON.stringify(result.maha).substring(0, 100)) : null
    });
    
    const m = result?.maha;
    if (m) {
      const obj = typeof m === "string" ? safeParse(m) : m;
      if (obj && typeof obj === 'object') {
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
                  console.log('[Predictions] Found current maha dasha by date:', currentMaha, 'from', startDate, 'to', endDate);
                  break;
                }
              } catch (e) {
                console.warn('[Predictions] Error parsing dates for maha dasha:', key, startDate, endDate, e);
              }
            } else if (!currentMaha) {
              // If no dates available, use the first entry we find
              currentMaha = value.Lord || value.lord || value.planet || key;
              console.log('[Predictions] Using maha dasha without date check:', currentMaha);
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
            currentMaha = first[1].Lord || first[1].lord || first[1].planet || first[0];
            console.log('[Predictions] Using first maha dasha (sorted by start date):', currentMaha);
          }
          
          // Final fallback: just use the first entry
          if (!currentMaha && entries.length > 0) {
            const first = entries[0];
            currentMaha = first[1].Lord || first[1].lord || first[1].planet || first[0];
            console.log('[Predictions] Using first maha dasha (fallback):', currentMaha);
          }
          
          if (currentMaha) {
            console.log('[Predictions] Dasha extracted from maha data:', currentMaha);
            return String(currentMaha).trim();
          }
        }
      }
    }
    
    // PRIORITY 2: Try vimsottari data (if API call succeeded)
    const v = result?.vimsottari;
    if (!v) {
      console.warn('[Predictions] No vimsottari data found in result (API call may have failed)');
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
          if (typeof x === 'string') return x.trim();
          return (x.name || x.planet || x).toString().trim();
        })
        .join(" > ");
      if (dashaChain) {
        console.log('[Predictions] Dasha extracted from current/running structure:', dashaChain);
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
        ad = Array.isArray(adList[firstMdKey]) ? adList[firstMdKey][0] : adList[firstMdKey];
      } else if (Array.isArray(adList)) {
        ad = adList[0];
      } else if (typeof adList === 'object' && Object.keys(adList).length > 0) {
        // Try first key in the object
        const firstKey = Object.keys(adList)[0];
        ad = Array.isArray(adList[firstKey]) ? adList[firstKey][0] : adList[firstKey];
      }
      
      // Try to get pratyantar
      const pdList = v.pratyantar_list || v.pd || {};
      let pd = null;
      if (ad) {
        const firstAdKey = ad?.key || ad?.planet || ad?.name;
        if (firstAdKey && pdList[firstAdKey]) {
          pd = Array.isArray(pdList[firstAdKey]) ? pdList[firstAdKey][0] : pdList[firstAdKey];
        } else if (Array.isArray(pdList)) {
          pd = pdList[0];
        } else if (typeof pdList === 'object' && Object.keys(pdList).length > 0) {
          const firstKey = Object.keys(pdList)[0];
          pd = Array.isArray(pdList[firstKey]) ? pdList[firstKey][0] : pdList[firstKey];
        }
      }
      
      const dashaChain = [
        md?.name || md?.planet || md?.key,
        ad?.name || ad?.planet || ad?.key,
        pd?.name || pd?.planet || pd?.key,
      ]
        .filter(Boolean)
        .map(x => typeof x === 'string' ? x.trim() : String(x).trim())
        .join(" > ");
      
      if (dashaChain) {
        console.log('[Predictions] Dasha extracted from mahadasha_list structure:', dashaChain);
        return dashaChain;
      }
      
      // If we have at least mahadasha, return it
      const mdName = md?.name || md?.planet || md?.key;
      if (mdName) {
        console.log('[Predictions] Dasha extracted (Maha Dasha only):', mdName);
        return String(mdName).trim();
      }
    }
    
    // Fallback: Try to get from maha data if available
    const maha = result?.maha;
    if (maha) {
      let mahaData = maha;
      if (typeof maha === 'string') {
        try {
          mahaData = JSON.parse(maha);
        } catch (e) {
          mahaData = maha;
        }
      }
      
      // If it's an object with entries, find the current one
      if (typeof mahaData === 'object' && !Array.isArray(mahaData)) {
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
            currentMaha = first.Lord || first.lord || first.planet || sorted[0][0];
          }
        }
        
        if (currentMaha) {
          console.log('[Predictions] Dasha extracted from maha data (fallback):', currentMaha);
          return String(currentMaha).trim();
        }
      } else if (Array.isArray(mahaData) && mahaData.length > 0) {
        // If it's an array, find current or use first
        const currentMaha = mahaData.find(m => m.isCurrent || m.active || m.current) || mahaData[0];
        if (currentMaha && (currentMaha.lord || currentMaha.Lord || currentMaha.planet)) {
          const lord = currentMaha.lord || currentMaha.Lord || currentMaha.planet;
          console.log('[Predictions] Dasha extracted from maha array (fallback):', lord);
          return String(lord).trim();
        }
      }
    }
    
    // Log the structure for debugging
    console.warn('[Predictions] Could not extract Dasha. Vimsottari structure:', {
      hasCurrent: !!v.current,
      hasRunning: !!v.running,
      hasNow: !!v.now,
      hasMahadashaList: !!v.mahadasha_list,
      hasMahadasha: !!v.mahadasha,
      hasMd: !!v.md,
      hasMaha: !!result?.maha,
      keys: Object.keys(v),
      sample: JSON.stringify(v).substring(0, 200)
    });
    
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
      throw new Error(`Invalid date format: ${dobStr}. Expected YYYY-MM-DD or DD-MM-YYYY`);
    }
    
    // Validate parsed values
    if (!Y || !M || !D || Number.isNaN(Y) || Number.isNaN(M) || Number.isNaN(D)) {
      throw new Error(`Invalid date values from: ${dobStr}`);
    }
    if (Y < 1900 || Y > 2100) throw new Error(`Year must be between 1900 and 2100: ${Y}`);
    if (M < 1 || M > 12) throw new Error(`Month must be between 1 and 12: ${M}`);
    if (D < 1 || D > 31) throw new Error(`Date must be between 1 and 31: ${D}`);
    
    // Parse time
    const tobStr = String(inp.tob || "");
    const timeParts = tobStr.split(":").map((n) => parseInt(n, 10));
    const [H, Min, S = 0] = timeParts;
    
    if (Number.isNaN(H) || Number.isNaN(Min) || Number.isNaN(S)) {
      throw new Error(`Invalid time format: ${tobStr}. Expected HH:MM or HH:MM:SS`);
    }
    if (H < 0 || H > 23) throw new Error(`Hours must be between 0 and 23: ${H}`);
    if (Min < 0 || Min > 59) throw new Error(`Minutes must be between 0 and 59: ${Min}`);
    if (S < 0 || S > 59) throw new Error(`Seconds must be between 0 and 59: ${S}`);
    
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
        payload
      );

      const out = typeof res?.output === "string" ? JSON.parse(res.output) : res;
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
        inp
      );
      setAiPredictions(predictions);
    } catch (e) {
      setPredictionsError(e?.message || "Failed to generate AI predictions.");
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

  const chatData = result ? {
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

  } : null;

  // Show full-page loading when submitting and no result yet
  if (submitting && !result) {
    return <PageLoading type="predictions" message="Consulting the stars for your predictions..." />;
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
      <header className="header">
        <Sparkles
          className="headerIcon"
          style={{ color: "#ffff", padding: "0.4rem", width: 36, height: 36 }}
        />
        <h1 className="title">{t.predictions.title}</h1>
        <p className="subtitle">{t.predictions.subtitle}</p>
      </header>

      <div className="container mx-auto px-4 py-8">
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
        <div className="birth-history-layout">
          {/* ==== FORM ==== */}
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="card backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-xl border max-w-4xl mx-auto"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              borderColor: "rgba(212, 175, 55, 0.2)",
            }}
          >
            <div className="form-header" style={{ alignItems: "center" }}>
              <div className="form-header-icon">
                <Moon className="w-6 h-6 text-gold" />
              </div>
              <div className="form-header-text" style={{ flex: 1 }}>
                <h3 className="form-title">{t.predictions.enterDetails}</h3>
                <p className="form-subtitle">{t.predictions.enterCosmicCoordinates}</p>
              </div>
            </div>
            {/* ---- Birth Details Section ---- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Full Name */}
              <div>
                <label className="form-field-label flex items-center gap-2 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Priya Sharma"
                  className="form-field-input form-input-field"
                  required
                />
                <p className="form-field-helper">
                  Your full name as per records
                </p>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="form-field-label flex items-center gap-2 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="form-field-input form-input-field"
                  placeholder="YYYY-MM-DD"
                  required
                />
                <p className="form-field-helper">Format: DD-MM-YYYY</p>
              </div>

              {/* Time of Birth */}
              <div>
                <label className="form-field-label flex items-center gap-2">
                  Time of Birth
                </label>
                <input
                  type="time"
                  value={tob}
                  onChange={(e) => setTob(e.target.value)}
                  step="60"
                  className="form-field-input form-input-field"
                  placeholder="14:30"
                  required
                />
                <p className="form-field-helper">24-hour format</p>
              </div>

              {/* Gender + Place + Get Predictions in one row */}
              <div className="md:col-span-3">
                <div className="place-row">
                  {/* Gender Field */}
                  <div className="w-full md:w-48">
                    <label className="form-field-label flex items-center gap-2 mb-2">
                      Gender
                    </label>

                    <div className="relative">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="form-field-input form-input-field pr-10"
                        required
                      >
                        <option value="" disabled>
                          Select gender
                        </option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <p className="form-field-helper">
                      Personalize chart reading
                    </p>
                  </div>

                  {/* Place of Birth */}
                  <div className="flex-1 place-wrapper">
                    <label className="form-field-label flex items-center gap-2 mb-2">
                      Place
                    </label>

                    <div className="relative">
                      <div className="place-input-wrapper">
                        <input
                          placeholder="e.g., Mumbai, India"
                          value={place}
                          onChange={(e) => {
                            const q = e.target.value;
                            setPlace(q);
                            setSelectedCoords(null);
                            fetchSuggestions(q);
                          }}
                          className="form-field-input form-input-field place-input"
                          autoComplete="off"
                          required
                        />

                        <button
                          type="button"
                          onClick={useMyLocation}
                          disabled={locating}
                          className="place-btn"
                        >
                          {locating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {suggestions.length > 0 && (
                        <div className="suggest-list">
                          {suggestions.map((s, i) => (
                            <div
                              key={i}
                              className="suggest-item"
                              onClick={() => {
                                setPlace(s.label);
                                setSelectedCoords(s);
                                setSuggestions([]);
                              }}
                            >
                              {s.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* helper, absolutely positioned -> doesn't affect column height */}
                    <p className="form-field-helper place-helper">
                      e.g., Mumbai, India
                    </p>
                  </div>

                  {/* Get Predictions button - fixed width, not shrinking */}
                  <div className="w-full md:w-48">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary btn-gold w-full h-[52px]"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Calculating...
                        </>
                      ) : (
                        <>Get Predictions</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Prediction History to the RIGHT of the form */}
          {showHistory && (
            <section
              className="results-section history-side"
              style={{ marginTop: 0 }}
            >
            <div className="card" ref={historyCardRef}>
              <div className="results-header">
                <History style={{ color: "#ca8a04" }} />
                <h3 className="results-title flex items-center gap-2">
                  {t.predictions.predictionHistory}
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

              {history.length === 0 ? (
                <div className="empty-state">No prediction history yet.</div>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="history-card-row"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="history-row-text">
                        <div className="h-name">
                          {item.fullName}{" "}
                          {item.gender ? `(${item.gender})` : ""}
                        </div>
                        <div className="h-date">{item.dob}</div>
                        <div className="h-time">{item.tob}</div>

                        {/* Address */}
                        <div className="h-place">
                          <div
                            ref={(el) => (addressRefs.current[item.id] = el)}
                            className={`address ${isAddressExpanded[item.id] ? "show-full" : ""
                              }`}
                            title={item.place}
                          >
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
                              {isAddressExpanded[item.id] ? "Show Less" : "..."}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="history-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadFromHistory(item);
                          }}
                          className="use-btn"
                        >
                          Use
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                          className="delete-btn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
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
            <div className="card">
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
                          mins
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
            {/* Western Natal Wheel Chart */}
            {result?.westernChartSvg &&
              result.westernChartSvg.trim().startsWith("<svg") ? (
              <div
                className="chart-container rounded-xl overflow-hidden shadow-lg"
                style={{
                  background: "#111827",
                  maxWidth: "640px",
                  margin: "0 auto",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: result.westernChartSvg }}
                  className="w-full"
                  style={{ aspectRatio: "1 / 1" }}
                />
              </div>
            ) : result && !result.westernChartSvg ? (
              <div 
                className="card mt-8 p-6 border rounded-lg"
                style={{
                  background: "#fef9c3",
                  borderColor: "#fde047",
                }}
              >
                <p 
                  className="text-sm font-medium"
                  style={{
                    color: "#854d0e",
                  }}
                >
                  Western chart not available.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Check: API key, internet, or try different birth details.
                </p>
              </div>
            ) : null}

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
                        setChatSessionId(prev => prev + 1);
                        setChatOpen(true);
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
                    key={`predictions-chat-${chatSessionId}-${currentFormDataHash || 'new'}`} 
                    pageTitle="Predictions" 
                    initialData={chatData}
                    onClose={() => setChatOpen(false)}
                    chatType="prediction"
                    shouldReset={shouldResetChat}
                    formDataHash={currentFormDataHash}
                  />
                </div>
              )}
            </div>

            {/* Planet Placements */}
            {placements.length > 0 ? (
              <div
                ref={setPlacementsRef}
                id="planet-placements"
                className="card"
                style={{ scrollMarginTop: "96px" }} // keeps it nicely below your fixed header when scrolled
              >
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
                        const nakshatraDisplay = `${p.nakshatra ?? "-"} (${p.pada ?? "-"
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
            {/* Vimshottari Maha Dasha */}
            <div className="card">
              <div className="results-header">
                <Moon style={{ color: "#ca8a04" }} />
                <h3 className="results-title">Vimshottari Maha Dasha</h3>
              </div>

              {mahaRows.length > 0 ? (
                <>
                  {/* ==== Horizontal Railway Style Maha Dasha Timeline ==== */}
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

                            {/* === INLINE ANTAR PERIODS === */}
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
                                            {new Date(
                                              ad.end
                                            ).toLocaleDateString("en-GB", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            })}
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
                </>
              ) : (
                <div className="empty-state">
                  No Maha Dasha data. Submit the form above.
                </div>
              )}
            </div>
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
        {/* AI Predictions Modal */}
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
                Generating predictions...
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
            const isFormFilled = fullName && dob && tob && place;
            if (!isFormFilled) {
              setError(
                "Please complete all birth details before using the chat."
              );
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            if (!result) {
              document.querySelector("form").requestSubmit();
              setTimeout(() => {
                setChatSessionId(prev => prev + 1);
                setChatOpen(true);
                setTimeout(() => {
                  document
                    .querySelector(".ai-astrologer-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }, 2000);
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
    </div>
  );
}
