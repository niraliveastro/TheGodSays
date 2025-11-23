"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Chat from "@/components/Chat";
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Orbit,
  Moon,
  Sun,
  X,
  Loader2,
  Cpu,
  RotateCcw,
  Trash2,
} from "lucide-react";
import "./predictions.css";
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api";
export default function PredictionsPage() {
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  // Timezone (UTC offset hours) — default IST 5.5
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const suggestTimer = useRef(null);
  const formRef = useRef(null);
  const historyCardRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
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
  const [isAddressExpanded, setIsAddressExpanded] = useState({});
  const [chatOpen, setChatOpen] = useState(false);
  const addressRefs = useRef({});
  const [isOverflowing, setIsOverflowing] = useState({});

const toggleAddressVisibility = (id) => {
  setIsAddressExpanded((prevState) => ({
    ...prevState,
    [id]: !prevState[id], // Toggle visibility for specific address
  }));
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
  setDob(item.dob || "");
  setTob(item.tob || "");
  setPlace(item.place || "");
  setSelectedCoords(null);
  setSuggestions([]);
  setError("");
  setResult(null); // optional: clear old result so user explicitly re-runs
};


  useEffect(() => {
    setHistory(getHistory());
  }, []);

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
  if (!formRef.current || !historyCardRef.current) return;

  const syncHeights = () => {
    const formHeight = formRef.current?.offsetHeight || 0;
    if (!formHeight) return;
    historyCardRef.current.style.height = `${formHeight}px`;
    historyCardRef.current.style.maxHeight = `${formHeight}px`;
  };

  syncHeights();
  window.addEventListener("resize", syncHeights);

  return () => {
    window.removeEventListener("resize", syncHeights);
  };
}, [dob, tob, place, fullName, suggestions.length, history.length]);

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
    if (!dob) return "Please enter your Date of Birth.";
    if (!tob) return "Please enter your Time of Birth.";
    if (!place.trim()) return "Please enter your Place of Birth.";
    return "";
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
            "User-Agent": "TheGodSays/1.0 (education)",
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

    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const geo = selectedCoords || (await geocodePlace(place));
      if (!geo)
        throw new Error(
          "Unable to find location. Try a more specific place name (e.g., City, Country)."
        );
      const [Y, M, D] = dob.split("-").map((n) => parseInt(n, 10));
      const tparts = tob.split(":").map((n) => parseInt(n, 10));
      const [H, Min, S = 0] = tparts;
      // Automatically determine timezone based on location
      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude);
      saveToHistory({
        id: Date.now(),
        fullName,
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
        timezone: tz,
        config: {
          observation_point: "topocentric",
          ayanamsha: "lahiri",
          house_system: "Placidus",
          language: "en",
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
            altPayload
          );
          let altParsed = safeParse(safeParse(alt.output ?? alt));
          if (altParsed && typeof altParsed === "object" && altParsed.output)
            altParsed = safeParse(altParsed.output);
          if (altParsed && Object.keys(altParsed).length)
            finalPlanetParsed = altParsed;
        } catch {}
      }
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
    } catch (err) {
      setError(err?.message || "Failed to compute predictions.");
    } finally {
      setSubmitting(false);
    }
  }
  const currentDashaChain = useMemo(() => {
    const v = result?.vimsottari;
    if (!v) return null;
    const current = v.current || v.running || v.now || v?.mahadasha?.current;
    if (current && (current.md || current.mahadasha)) {
      const md = current.md || current.mahadasha;
      const ad = current.ad || current.antardasha;
      const pd = current.pd || current.pratyantar;
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
  }, [result]);
  function buildPayloadForApi() {
    const inp = result?.input;
    const coords = result?.coords;
    if (!inp || !coords) return null;
    const [Y, M, D] = String(inp.dob || "")
      .split("-")
      .map((n) => parseInt(n, 10));
    const [H, Min, S = 0] = String(inp.tob || "")
      .split(":")
      .map((n) => parseInt(n, 10));
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
  return (
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

      {/* Header */}
      <header className="header">
        <Sparkles
          className="headerIcon"
          style={{ color: "#ffff", padding: "0.4rem", width: 36, height: 36 }}
        />
        <h1 className="title">Cosmic Insights</h1>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span>Warning</span> {error}
          </div>
        )}

        {/* === Birth form + History side-by-side === */}
        <div className="birth-history-layout">
          {/* ==== FORM ==== */}
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="card bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-xl border border-gold/20 max-w-4xl mx-auto"
          >
            <div className="form-header" style={{ alignItems: "center" }}>
              <div className="form-header-icon">
                <Moon className="w-6 h-6 text-gold" />
              </div>
              <div className="form-header-text" style={{ flex: 1 }}>
                <h3 className="form-title">Birth Details</h3>
                <p className="form-subtitle">Enter your cosmic coordinates</p>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="btn btn-primary"
                style={{ height: 40 }}
              >
                Chat with AI
              </button>
            </div>
            {/* ---- Birth Details Section ---- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Full Name */}
              <div>
                <label className="form-field-label flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-gold" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="form-field-input"
                  required
                />
                <p className="form-field-helper">
                  Your full name as per records
                </p>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="form-field-label flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-gold" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="form-field-input"
                  required
                />
                <p className="form-field-helper">Format: YYYY-MM-DD</p>
              </div>

              {/* Time of Birth */}
              <div>
                <label className="form-field-label flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gold" />
                  Time
                </label>
                <input
                  type="time"
                  value={tob}
                  onChange={(e) => setTob(e.target.value)}
                  step="60"
                  className="form-field-input"
                  required
                />
                <p className="form-field-helper">24-hour format</p>
              </div>

              {/* Place + Get Predictions + Reset all in one row */}
              <div className="md:col-span-3">
                <div className="place-row">
                  {/* Place of Birth */}
                  <div className="flex-1 place-wrapper">
                    <label className="form-field-label flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-gold" />
                      Place of Birth
                    </label>

                    <div className="relative">
                      <div className="place-input-wrapper">
                        <input
                          placeholder="City, Country"
                          value={place}
                          onChange={(e) => {
                            const q = e.target.value;
                            setPlace(q);
                            setSelectedCoords(null);
                            fetchSuggestions(q);
                          }}
                          className="form-field-input place-input"
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

                  {/* Get Predictions button */}
                  <div className="w-full md:w-48">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary w-full h-[52px]"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Calculating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Get Predictions
                        </>
                      )}
                    </button>
                  </div>

                  {/* Reset button */}
                  <div className="w-full md:w-32">
                    <button
                      type="reset"
                      onClick={() => {
                        setFullName("");
                        setDob("");
                        setTob("");
                        setPlace("");
                        setResult(null);
                        setError("");
                        setSelectedMaha(null);
                      }}
                      className="btn btn-ghost w-full h-[52px] px-4"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Prediction History to the RIGHT of the form */}
          <section
            className="results-section history-side"
            style={{ marginTop: 0 }}
          >
            <div className="card" ref={historyCardRef}>
              <div className="results-header">
                <Sparkles style={{ color: "#ca8a04" }} />
                <h3 className="results-title flex items-center gap-2">
                  Prediction History
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
                        <div className="h-name">{item.fullName}</div>
                        <div className="h-date">{item.dob}</div>
                        <div className="h-time">{item.tob}</div>

                        {/* Address */}
                        <div className="h-place">
                          <div
                            ref={(el) => (addressRefs.current[item.id] = el)}
                            className={`address ${
                              isAddressExpanded[item.id] ? "show-full" : ""
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
                  <div className="info-value">{currentDashaChain || "—"}</div>
                </div>
              </div>
            </div>
            {/* Western Natal Wheel Chart */}
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
            {/* Planet Placements */}
            {placements.length > 0 ? (
              <div
                ref={setPlacementsRef}
                id="planet-placements"
                className="card"
                style={{ scrollMarginTop: "96px" }} // keeps it nicely below your fixed header when scrolled
              >
                <div className="results-header">
                  <Orbit style={{ color: "#7c3aed" }} />
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
                        const planetDisplay = p.retro
                          ? `${pname} (Retro)`
                          : pname;
                        const degreesDisplay =
                          [
                            typeof p.fullDegree === "number"
                              ? `Full: ${p.fullDegree.toFixed(2)}°`
                              : null,
                            typeof p.normDegree === "number"
                              ? `Norm: ${p.normDegree.toFixed(2)}°`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" ") || "—";
                        const nakshatraDisplay = `${p.nakshatra ?? "—"} (${
                          p.pada ?? "—"
                        })`;
                        return (
                          <tr key={p.name}>
                            <td style={{ fontWeight: 500, color: "#1f2937" }}>
                              {planetDisplay}
                            </td>
                            <td>{p.currentSign || "—"}</td>
                            <td>{p.house ?? "—"}</td>
                            <td>{nakshatraDisplay}</td>
                            <td>{degreesDisplay}</td>
                            <td>
                              {pctVal != null ? `${pctVal.toFixed(1)}%` : "—"}
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
                                "—"
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
                                "—"
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
                <Moon style={{ color: "#4f46e5" }} />
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

                            {/* === INLINE ANTAR PERIODS === */}
                            {openAntarFor === row.lord && (
                              <div className="antar-inline-box">
                                {antarLoadingFor === row.lord ? (
                                  <div className="antar-loading">Loading…</div>
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
              ? `${selectedMaha} Maha Dasha — Antar Periods`
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
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
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
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    No Antar Dasha Data
                  </h3>
                  <p className="text-sm text-gray-500">
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
                          : "—";
                        const endDate = ad.end
                          ? new Date(ad.end).toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—";
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500, color: "#1f2937" }}>
                              {ad.lord || "—"}
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
              ? `AI Predictions — ${selectedPlanetForPredictions} Maha Dasha`
              : "AI Predictions"
          }
          position="center"
        >
          {predictionsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
              <div className="text-sm text-gray-600">
                Generating AI predictions...
              </div>
            </div>
          ) : predictionsError ? (
            <div className="py-4 text-sm text-red-700 bg-red-50 border border-red-300 rounded-lg px-4">
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
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 border border-gray-300">
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
      <Modal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Chat with AI"
        position="center"
      >
        <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
          <Chat pageTitle="Predictions" />
          <div className="mt-4 flex justify-end">
            <button
              className="btn btn-primary"
              onClick={() => setChatOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
