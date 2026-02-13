"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import Chat from "@/components/Chat";
import {
  MapPin,
  Moon,
  Loader2,
  Pencil,
  Wallet,
  Sparkles,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react";
import "./../new-predictions/prediction.css";
import {
  astrologyAPI,
  geocodePlace,
  getTimezoneOffsetHours,
} from "@/lib/api";
import {
  trackEvent,
  trackActionStart,
  trackActionComplete,
  trackActionAbandon,
  trackPageView,
} from "@/lib/analytics";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

export default function TalkToAIAstrologerPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getUserId } = useAuth();
  const userId = getUserId();
  const googleLoaded = useGoogleMaps();

  useEffect(() => {
    trackPageView(
      "/talk-to-ai-astrologer",
      "Talk to AI Astrologer - Chat",
    );
  }, []);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [locating, setLocating] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // After form submit we navigate to /talk-to-ai-astrologer/chat (no fullscreen on this page)
  const navigateToChatAfterResultRef = useRef(false);

  // Wallet & pricing for header (real-time updates)
  const [walletBalance, setWalletBalance] = useState(null);
  const [pricing, setPricing] = useState({ creditsPerQuestion: 10, maxFreeQuestionsForGuests: 2 });

  // Chat session + form hash (reuse logic from new-predictions)
  const [chatSessionId, setChatSessionId] = useState(0);
  const [shouldResetChat, setShouldResetChat] = useState(false);
  const [currentFormDataHash, setCurrentFormDataHash] = useState(null);
  const previousFormDataHashRef = useRef(null);

  const formRef = useRef(null);
  const suggestTimer = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const historyCardRef = useRef(null);
  const initialHistoryHeightRef = useRef(null);
  const addressRefs = useRef({});

  // Saved profiles history (same pattern as new-predictions, separate key)
  const AI_ASTROLOGER_HISTORY_KEY = "ai_astrologer_history_v1";
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isAddressExpanded, setIsAddressExpanded] = useState({});
  const [isOverflowing, setIsOverflowing] = useState({});

  // Initialize Google Maps Places services
  useEffect(() => {
    if (googleLoaded && typeof window !== "undefined" && window.google?.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      const dummyMap = document.createElement("div");
      placesService.current = new window.google.maps.places.PlacesService(dummyMap);
    }
  }, [googleLoaded]);

  // Fetch wallet balance (used for header + real-time after chat)
  const fetchWalletBalance = useCallback(async () => {
    if (!userId) {
      setWalletBalance(null);
      return;
    }
    try {
      const res = await fetch("/api/payments/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-balance", userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.wallet) {
          setWalletBalance(data.wallet.balance ?? 0);
        }
      }
    } catch (e) {
      console.warn("[AI Astrologer] Wallet fetch error:", e);
    }
  }, [userId]);

  // Fetch public pricing (credits per question)
  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch("/api/pricing/public");
      if (res.ok) {
        const data = await res.json();
        if (data?.pricing) {
          setPricing((prev) => ({ ...prev, ...data.pricing }));
        }
      }
    } catch (e) {
      console.warn("[AI Astrologer] Pricing fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  // Real-time wallet updates: on chat message sent + short polling when in full-screen chat
  useEffect(() => {
    const onMessageSent = () => {
      fetchWalletBalance();
    };
    window.addEventListener("chatMessageSent", onMessageSent);
    return () => window.removeEventListener("chatMessageSent", onMessageSent);
  }, [fetchWalletBalance]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchWalletBalance, 12000);
    return () => clearInterval(interval);
  }, [userId, fetchWalletBalance]);

  const getHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(AI_ASTROLOGER_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }, []);

  useEffect(() => {
    setHistory(getHistory());
  }, [getHistory]);

  const saveToHistory = useCallback((entry) => {
    const key = `${(entry.fullName || "").toUpperCase()}-${entry.dob}-${entry.tob}`;
    let current = getHistory().filter(
      (it) => `${(it.fullName || "").toUpperCase()}-${it.dob}-${it.tob}` !== key,
    );
    const entryWithTimestamp = {
      ...entry,
      id: entry.id != null ? entry.id : Date.now(),
      lastGenerated: new Date().toISOString(),
    };
    current.unshift(entryWithTimestamp);
    if (current.length > 10) current = current.slice(0, 10);
    localStorage.setItem(AI_ASTROLOGER_HISTORY_KEY, JSON.stringify(current));
    setHistory(current);
  }, [getHistory]);

  const deleteHistoryItem = (id) => {
    if (showDeleteConfirm !== id) {
      setShowDeleteConfirm(id);
      return;
    }
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(AI_ASTROLOGER_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
    setShowDeleteConfirm(null);
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(
      (item) =>
        (item.fullName || "").toLowerCase().includes(q) ||
        (item.place || "").toLowerCase().includes(q) ||
        (item.dob || "").includes(q),
    );
  }, [history, historySearch]);

  const clearHistory = () => {
    localStorage.removeItem(AI_ASTROLOGER_HISTORY_KEY);
    setHistory([]);
  };

  const toggleAddressVisibility = (id) => {
    setIsAddressExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadFromHistory = (item) => {
    setFullName(item.fullName || "");
    setGender(item.gender || "");
    setDob(item.dob || "");
    setTob(item.tob || "");
    setPlace(item.place || "");
    if (item.latitude != null && item.longitude != null) {
      setSelectedCoords({
        latitude: item.latitude,
        longitude: item.longitude,
        label: item.place || "",
      });
    } else {
      setSelectedCoords(null);
    }
    setSuggestions([]);
    setError("");
    setResult(null);
    setShowDeleteConfirm(null);
    const loadedHash = (() => {
      const str = JSON.stringify({
        fullName: (item.fullName || "").trim().toUpperCase(),
        gender: (item.gender || "").trim().toUpperCase(),
        dob: (item.dob || "").trim(),
        tob: (item.tob || "").trim(),
        place: (item.place || "").trim().toUpperCase(),
      });
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash = hash & hash;
      }
      return hash.toString();
    })();
    if (previousFormDataHashRef.current !== null && previousFormDataHashRef.current !== loadedHash) {
      setChatSessionId((prev) => prev + 1);
      setShouldResetChat(true);
    }
    previousFormDataHashRef.current = loadedHash;
  };

  // Place autocomplete
  const fetchSuggestions = (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      if (!googleLoaded || !autocompleteService.current) {
        setSuggestions([]);
        return;
      }
      setSuggesting(true);
      autocompleteService.current.getPlacePredictions(
        { input: query, types: ["(cities)"] },
        (predictions, status) => {
          setSuggesting(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(
              predictions.map((p) => ({ label: p.description, placeId: p.place_id }))
            );
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    if (!placesService.current) {
      setPlace(suggestion.label);
      setSuggestions([]);
      return;
    }
    setPlace(suggestion.label);
    setSuggestions([]);
    setSuggesting(true);
    placesService.current.getDetails(
      { placeId: suggestion.placeId, fields: ["geometry", "formatted_address", "name"] },
      (placeObj, status) => {
        setSuggesting(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && placeObj) {
          const lat = placeObj.geometry.location.lat();
          const lng = placeObj.geometry.location.lng();
          const label = placeObj.formatted_address || placeObj.name;
          setSelectedCoords({ latitude: lat, longitude: lng, label });
          setPlace(label);
        } else {
          setSelectedCoords(null);
        }
      }
    );
  };

  async function useMyLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
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
      if (googleLoaded && window.google?.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          setLocating(false);
          if (status === "OK" && results[0]) {
            const label = results[0].formatted_address;
            setPlace(label);
            setSelectedCoords({ latitude, longitude, label });
            setSuggestions([]);
          } else {
            setPlace(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
            setSelectedCoords({ latitude, longitude, label: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}` });
            setSuggestions([]);
          }
        });
      } else {
        setLocating(false);
        const label = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
        setPlace(label);
        setSelectedCoords({ latitude, longitude, label });
        setSuggestions([]);
      }
    } catch (e) {
      setLocating(false);
      setError("Could not access your location. Please allow permission or type the city manually.");
    }
  }

  const generateFormDataHash = () => {
    const formData = {
      fullName: (fullName || "").trim().toUpperCase(),
      gender: (gender || "").trim().toUpperCase(),
      dob: (dob || "").trim(),
      tob: (tob || "").trim(),
      place: (place || "").trim().toUpperCase(),
    };
    const hashString = JSON.stringify(formData);
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const checkAndResetChatOnFormChange = () => {
    const newHash = generateFormDataHash();

    if (!fullName && !dob && !tob && !place) {
      return;
    }

    if (
      previousFormDataHashRef.current !== null &&
      previousFormDataHashRef.current !== newHash
    ) {
      setChatSessionId((prev) => prev + 1);
      setShouldResetChat(true);
    }

    previousFormDataHashRef.current = newHash;
    setCurrentFormDataHash(newHash);
  };

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

  function normalizeSvg(svg) {
    if (!svg || typeof svg !== "string") return svg;
    if (svg.includes("viewBox")) return svg;

    return svg.replace(
      "<svg",
      '<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet"',
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    checkAndResetChatOnFormChange();
    setShouldResetChat(true);

    const { error: validationError, parsed } = validate();
    if (validationError) {
      trackEvent("form_validation_failed", { form_name: "ai_chat_predictions" });
      setError(validationError);
      return;
    }

    trackActionStart("ai_chat_predictions_generation");
    trackEvent("form_submit", { form_name: "ai_chat_predictions" });

    setSubmitting(true);

    try {
      // Use selectedCoords if available, otherwise geocode the place
      let geo = selectedCoords;

      if (
        !geo ||
        !Number.isFinite(geo.latitude) ||
        !Number.isFinite(geo.longitude)
      ) {
        geo = await geocodePlace(place);
      }

      if (!geo) {
        throw new Error(
          "Unable to find location. Try a more specific place name (e.g., City, Country).",
        );
      }

      if (!Number.isFinite(geo.latitude) || !Number.isFinite(geo.longitude)) {
        throw new Error(
          "Location data is incomplete. Please pick the place again.",
        );
      }

      const { Y, M, D, H, Min, S } = parsed;
      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude);

      if (!Number.isFinite(tz)) {
        setError(
          "Could not determine timezone for the selected place. Please try another location.",
        );
        setSubmitting(false);
        return;
      }

      // Save unique form entry to history (same logic as predictions page) – before API calls
      saveToHistory({
        id: Date.now(),
        fullName,
        gender,
        dob,
        tob: fmtTime(H, Min, S),
        place: geo.label || place,
        latitude: geo.latitude,
        longitude: geo.longitude,
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

      const navamsaPayload = {
        year: Y,
        month: M,
        date: D,
        hours: H,
        minutes: Min,
        seconds: S,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: tz,
        config: {
          observation_point: "geocentric",
          ayanamsha: "lahiri",
        },
      };

      let navamsaRaw = null;
      let d1ChartSvg = null;
      let d9ChartSvg = null;

      try {
        navamsaRaw = await astrologyAPI.getSingleCalculation(
          "navamsa-chart-info",
          navamsaPayload,
        );
      } catch (e) {
        console.warn("[Navamsa] Failed:", e.message);
      }

      try {
        const d1Raw = await astrologyAPI.getSingleCalculation(
          "horoscope-chart-svg-code",
          payload,
        );

        const d9Raw = await astrologyAPI.getSingleCalculation(
          "navamsa-chart-svg-code",
          {
            year: payload.year,
            month: payload.month,
            date: payload.date,
            hours: payload.hours,
            minutes: payload.minutes,
            seconds: payload.seconds,
            latitude: payload.latitude,
            longitude: payload.longitude,
            timezone: payload.timezone,
            config: {
              observation_point: "topocentric",
              ayanamsha: "lahiri",
            },
          },
        );

        d1ChartSvg = normalizeSvg(
          typeof d1Raw === "string"
            ? d1Raw
            : d1Raw?.output || d1Raw?.svg || null,
        );

        d9ChartSvg = normalizeSvg(
          typeof d9Raw === "string"
            ? d9Raw
            : d9Raw?.output || d9Raw?.svg || null,
        );
      } catch (e) {
        console.warn("[Chart SVG] Failed:", e.message);
      }

      const { results, errors } = await astrologyAPI.getMultipleCalculations(
        [
          "shadbala/summary",
          "vimsottari/dasa-information",
          "vimsottari/maha-dasas",
          "planets",
          "planets/extended",
          "western/natal-wheel-chart",
        ],
        payload,
      );

      const vimsRaw = results?.["vimsottari/dasa-information"];
      const shadbalaRaw = results?.["shadbala/summary"];
      const mahaRaw = results?.["vimsottari/maha-dasas"];
      const planetsRaw = results?.["planets/extended"];
      const westernChartSvgRaw = results?.["western/natal-wheel-chart"];

      let westernChartSvg = null;
      if (westernChartSvgRaw) {
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
          const stringValue = Object.values(westernChartSvgRaw).find(
            (v) => typeof v === "string" && v.trim().startsWith("<svg"),
          );
          if (stringValue) {
            westernChartSvg = stringValue.trim();
          }
        }
      }

      if (errors?.["western/natal-wheel-chart"]) {
        console.warn(
          "[Western Chart] Error:",
          errors["western/natal-wheel-chart"],
        );
      }

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

      let finalPlanetParsed = planetsRaw;
      if (!finalPlanetParsed) {
        const altPlanet = results?.["planets"];
        if (altPlanet) {
          let parsed = safeParse(safeParse(altPlanet.output ?? altPlanet));
          if (parsed && typeof parsed === "object" && parsed.output)
            parsed = safeParse(parsed.output);
          finalPlanetParsed = parsed;
        }
      }

      trackActionComplete("ai_chat_predictions_generation", {
        success: true,
        has_coordinates: !!(geo.latitude && geo.longitude),
      });
      trackEvent("ai_chat_predictions_generated", { success: true });

      setResult({
        input: { dob, tob: fmtTime(H, Min, S), place: geo.label || place, tz },
        coords: { latitude: geo.latitude, longitude: geo.longitude },
        configUsed: { observation_point: "geocentric", ayanamsha: "lahiri" },

        vimsottari: vimsParsed,
        planets: finalPlanetParsed,
        maha: mahaParsed,
        shadbala: finalShadbala,
        navamsa: navamsaRaw,

        d1ChartSvg,
        d9ChartSvg,

        westernChartSvg,
        apiErrors: { ...errors },
      });

      if (shouldResetChat) {
        setChatSessionId((prev) => prev + 1);
        setShouldResetChat(false);
      }
      navigateToChatAfterResultRef.current = true;
    } catch (err) {
      trackActionAbandon(
        "ai_chat_predictions_generation",
        err?.message || "unknown_error",
      );
      trackEvent("ai_chat_predictions_generation_failed", {
        error: err?.message || "unknown_error",
      });
      setError(err?.message || "Failed to compute predictions.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentDashaChain = useMemo(() => {
    const m = result?.maha;
    if (m) {
      const obj = typeof m === "string" ? safeParse(m) : m;
      if (obj && typeof obj === "object") {
        const entries = Object.entries(obj);
        if (entries.length > 0) {
          const now = new Date();
          let currentMaha = null;

          for (const [, value] of entries) {
            const startDate = value.start_time || value.start;
            const endDate = value.end_time || value.end;

            if (startDate && endDate) {
              try {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (now >= start && now <= end) {
                  currentMaha = value.Lord || value.lord || value.planet;
                  break;
                }
              } catch {
                // ignore parsing errors
              }
            }
          }

          if (currentMaha) {
            return String(currentMaha).trim();
          }
        }
      }
    }

    const v = result?.vimsottari;
    if (v) {
      const obj = typeof v === "string" ? safeParse(v) : v;
      if (obj && typeof obj === "object") {
        const cur = obj.current || obj.running || obj.now;
        if (cur) {
          const md = cur.md || cur.mahadasha;
          const ad = cur.ad || cur.antardasha;
          const pd = cur.pd || cur.pratyantar;
          const parts = [md, ad, pd]
            .filter(Boolean)
            .map((x) => (x.name || x.planet || x).toString().trim());
          if (parts.length) return parts.join(" > ");
        }
      }
    }

    return null;
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

  const chatData = result
    ? {
        birth: {
          ...result.input,
          fullName: fullName,
          name: fullName,
        },
        coords: result.coords,
        gender,

        raw: {
          planets: result.planets,
          vimsottari: result.vimsottari,
          maha: result.maha,
          shadbala: result.shadbala,
        },

        placements,
        shadbalaRows,
        mahaRows: [], // not needed for core chat context here
        currentDashaChain,
      }
    : null;

  // After form submit: once chatData is ready, save to sessionStorage and navigate to chat page
  useEffect(() => {
    if (!navigateToChatAfterResultRef.current || !chatData) return;
    try {
      const key = "tgs_ai_astrologer_chat_pending";
      sessionStorage.setItem(
        key,
        JSON.stringify({ chatData, formDataHash: currentFormDataHash })
      );
      navigateToChatAfterResultRef.current = false;
      router.push("/talk-to-ai-astrologer/chat");
    } catch (e) {
      navigateToChatAfterResultRef.current = false;
    }
  }, [chatData, currentFormDataHash, router]);

  // Address overflow for history card (same as new-predictions)
  useEffect(() => {
    const check = () => {
      const map = {};
      history.forEach((item) => {
        const el = addressRefs.current[item.id];
        if (el) map[item.id] = el.scrollHeight > el.clientHeight;
      });
      setIsOverflowing(map);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [history]);

  // Sync history card height with form (same as new-predictions)
  useEffect(() => {
    if (!formRef.current || !historyCardRef.current || chatData) return;
    const syncHeights = () => {
      const formHeight = formRef.current?.offsetHeight || 0;
      if (!formHeight) return;
      if (!initialHistoryHeightRef.current) initialHistoryHeightRef.current = formHeight;
      historyCardRef.current.style.height = `${formHeight}px`;
      historyCardRef.current.style.maxHeight = `${formHeight}px`;
    };
    syncHeights();
    window.addEventListener("resize", syncHeights);
    return () => window.removeEventListener("resize", syncHeights);
  }, [chatData, history.length, suggestions.length, fullName, dob, tob, place]);

  return (
    <main className="predictions-page talk-to-ai-astrologer-page">
      <div className="max-w-6xl mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        {/* Single H2 heading + hero-style subtitle – wrapper ensures center in view */}
        <header className="mb-6 talk-to-ai-hero-header">
          <div className="page-hero-title-wrap">
            <h2 className="page-hero-title">Talk To AI Astrologer</h2>
          </div>
          <p className="page-hero-subtitle">
            Share your birth details and we’ll build your Vedic chart in the background. Then chat with our AI astrologer—same engine as the predictions page.
          </p>
          <div className="trust-line">
            <span className="trust-line-item"><span>🔒</span><span>Private</span></span>
            <span className="trust-line-separator">•</span>
            <span className="trust-line-item"><span>📍</span><span>Accurate location</span></span>
            <span className="trust-line-separator">•</span>
            <span className="trust-line-item"><span>💾</span><span>Same engine as predictions</span></span>
          </div>
        </header>

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

        {/* Birth form + History side-by-side (same as new-predictions) */}
        <div className="birth-history-layout" style={{ width: "100%" }}>
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="card backdrop-blur-xl rounded-3xl shadow-xl border max-w-4xl bg-white border-gray-200"
          >
            <div className="flex items-center gap-3 mb-6">
              <Moon className="w-6 h-6 text-gold" />
              <div>
                <h3 className="form-title">{t.predictions?.enterDetails || "Enter birth details"}</h3>
                <p className="form-subtitle">
                  {t.predictions?.enterCosmicCoordinates || "These details stay private and power your chat."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {/* Name */}
              <div className="flex flex-col">
                <label className="form-field-label mb-2">Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Neha (as per records)"
                  className="form-field-input"
                  required
                />
                <p className="form-field-helper">Only letters and spaces</p>
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <label className="form-field-label mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="form-field-input"
                  required
                />
                <p className="form-field-helper">Format: DD-MM-YYYY</p>
              </div>

              {/* Time */}
              <div className="flex flex-col">
                <label className="form-field-label mb-2">Time of Birth</label>
                <input
                  type="time"
                  value={tob}
                  onChange={(e) => setTob(e.target.value)}
                  className="form-field-input"
                  required
                />
                <p className="form-field-helper">24-hour format</p>
              </div>

              {/* Gender */}
              <div className="flex flex-col">
                <label className="form-field-label mb-2">Gender</label>
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
                <p className="form-field-helper">Personalize chart reading</p>
              </div>

              {/* Place with autocomplete */}
              <div className="flex flex-col">
                <label className="form-field-label mb-2">Place</label>
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
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5"
                  >
                    {locating ? (
                      <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-[9999]">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {suggesting && (
                          <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading suggestions...
                          </div>
                        )}
                        {!suggesting &&
                          suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-2"
                            >
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{suggestion.label}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="form-field-helper">
                  {selectedCoords ? "Location coordinates saved" : "Choose the nearest city"}
                </p>
              </div>

              {/* Button */}
              <div className="flex flex-col">
                <label className="invisible mb-2">Hidden</label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary h-[52px] w-full"
                >
                  {submitting ? "Calculating…" : chatData ? "Recalculate & refresh chat" : "Start AI Astrologer Chat"}
                </button>
                <p className="cta-helper text-center">
                  No signup required • 2 free chats, then credits • ~10–15 sec
                </p>
              </div>
            </div>
          </form>

          {/* Right: Chat or placeholder (same layout as new-predictions) */}
          <div className="history-side w-full max-w-2xl mx-auto lg:mx-0">
            {chatData ? (
              <div className="chat-window-container">
                <Chat
                  key={`ai-astrologer-chat-${chatSessionId}-${currentFormDataHash || "new"}`}
                  pageTitle="Talk to AI Astrologer"
                  initialData={chatData}
                  chatType="prediction"
                  shouldReset={shouldResetChat}
                  formDataHash={currentFormDataHash}
                  embedded={true}
                  onMessageSent={fetchWalletBalance}
                  welcomeMessage="Welcome! How can I help you today?"
                  suggestedQuestionsVertical={true}
                  bubbleBgOpacity={0.3}
                  suggestedQuestionIcon="arrow"
                />
              </div>
            ) : (
              <div className="history-side">
                <div className="card history-card mx-auto" ref={historyCardRef}>
                <div className="results-header">
                  <History style={{ color: "#ca8a04" }} />
                  <h3 className="results-title flex items-center gap-2">Saved Profiles</h3>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="btn btn-ghost text-sm ml-auto flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" /> Clear
                    </button>
                  )}
                </div>

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
                  <div className="empty-state">No profiles match your search.</div>
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
                            {item.fullName} {item.gender ? `(${item.gender.toLowerCase()})` : ""}
                          </div>
                          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                            <div className="h-date" style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                              <strong style={{ color: "#374151" }}>DOB:</strong> {item.dob}
                            </div>
                            <div className="h-time" style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                              <strong style={{ color: "#374151" }}>Time:</strong> {item.tob}
                            </div>
                          </div>
                          <div className="h-place" style={{ marginTop: "0.25rem" }}>
                            <div
                              ref={(el) => (addressRefs.current[item.id] = el)}
                              className={`address ${isAddressExpanded[item.id] ? "show-full" : ""}`}
                              title={item.place}
                              style={{ fontSize: "0.8125rem", color: "#6b7280" }}
                            >
                              <strong style={{ color: "#374151" }}>Place:</strong> {item.place}
                            </div>
                            {isOverflowing[item.id] && (
                              <button
                                type="button"
                                className="show-more-btn"
                                onClick={(e) => { e.stopPropagation(); toggleAddressVisibility(item.id); }}
                              >
                                {isAddressExpanded[item.id] ? "Show Less" : "..."}
                              </button>
                            )}
                          </div>
                          {item.lastGenerated && (
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.375rem" }}>
                              Last generated:{" "}
                              {(() => {
                                const date = new Date(item.lastGenerated);
                                const now = new Date();
                                const diffMs = now - date;
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                if (diffDays === 0) return "Today";
                                if (diffDays === 1) return "1 day ago";
                                if (diffDays < 7) return `${diffDays} days ago`;
                                return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="history-actions">
                          <button type="button" onClick={(e) => { e.stopPropagation(); loadFromHistory(item); }} className="use-btn">
                            Load
                          </button>
                          {showDeleteConfirm === item.id ? (
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Delete?</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} className="delete-btn" style={{ background: "#dc2626", color: "#fff", padding: "0.25rem 0.5rem" }}>
                                Yes
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(null); }} style={{ background: "#f3f4f6", color: "#374151", padding: "0.25rem 0.5rem", border: "none", borderRadius: "0.25rem", fontSize: "0.75rem", cursor: "pointer" }}>
                                No
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} className="delete-btn">
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
        </div>
      </div>
    </main>
  );
}

