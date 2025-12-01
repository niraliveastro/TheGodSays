"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import PanchangCard from "@/components/PanchangCard";
import FestivalCard from "@/components/FestivalCard";
import AstrologyOptionCard from "@/components/AstrologyOptionCard";
import AstrologyForm from "@/components/AstrologyForm";
import AstrologyResult from "@/components/AstrologyResult";
import DateSelector from "@/components/DateSelector";
import { mockPanchangData } from "@/lib/mockData";
import { astrologyAPI } from "@/lib/api";
import {
  Calendar,
  MapPin,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Star,
  AlertCircle,
} from "lucide-react";
import "./home.css";

// Simple in-memory cache for home panchang fetches (reset on reload)
const homePanchangCache = new Map(); // key => { data, savedAt }

// LocalStorage helpers for persistent cache between reloads
const HOME_STORAGE_PREFIX = "tgs:home:panchang:";
const readHomeCache = (key) => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(HOME_STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const writeHomeCache = (key, value) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(HOME_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
};

export default function Home() {
  const [panchangData, setPanchangData] = useState(null);
  const [currentDate, setCurrentDate] = useState("");

  // Date and location state
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [userLocation, setUserLocation] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [isLoadingPanchang, setIsLoadingPanchang] = useState(false);
  const [panchangError, setPanchangError] = useState(null);

  // Astrology options state
  const [selectedOption, setSelectedOption] = useState(null);
  const [astrologyResult, setAstrologyResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // New: top astrologers + testimonials
  const [onlineAstrologers, setOnlineAstrologers] = useState([]);
  const [featuredAstrologers, setFeaturedAstrologers] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  const astrologyOptions = [
    {
      id: "vedic-weekday",
      name: "Vedic Weekday",
      description: "Traditional weekday calculation",
    },
    {
      id: "lunar-month-info",
      name: "Lunar Month Info",
      description: "Lunar month details",
    },
    {
      id: "ritu-information",
      name: "Ritu Information",
      description: "Seasonal information",
    },
    {
      id: "samvat-information",
      name: "Samvat Information",
      description: "Era and calendar info",
    },
    { id: "aayanam", name: "Aayanam", description: "Precession of equinoxes" },
    {
      id: "choghadiya-timings",
      name: "Choghadiya Timings",
      description: "Auspicious time periods",
    },
  ];

  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    setCurrentDate(formattedDate);
  }, []);

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to Delhi, India
          setUserLocation({ latitude: 28.6139, longitude: 77.209 });
        }
      );
    } else {
      // Fallback to Delhi, India
      setUserLocation({ latitude: 28.6139, longitude: 77.209 });
    }
  }, []);

  // Fetch real Panchang data when date or location changes
  useEffect(() => {
    if (userLocation && selectedDate) {
      fetchRealPanchangData();
    }
  }, [selectedDate, userLocation]);

  // fetch top astrologers + testimonials (light placeholder logic)
  useEffect(() => {
    let mounted = true;

    async function loadAstrologers() {
      try {
        // Try fetching real astrologers from our server API first
        let res = null;
        try {
          const r = await fetch('/api/astrologer/top');
          if (r.ok) {
            const data = await r.json();
            if (data && data.success) {
              res = { online: data.online || [], featured: data.featured || [] };
            }
          }
        } catch (err) {
          console.warn('Failed to fetch /api/astrologer/top:', err);
        }

        // Fallback: try astrologyAPI.getTopAstrologers if server API not available
        if (!res && astrologyAPI.getTopAstrologers) {
          try {
            const apiRes = await astrologyAPI.getTopAstrologers();
            res = apiRes || null;
          } catch (e) {
            console.warn('astrologyAPI.getTopAstrologers failed:', e);
          }
        }

        // If API returned structured data, pick online + featured
        if (res && res.online && mounted) {
          setOnlineAstrologers(res.online.slice(0, 10));
          setFeaturedAstrologers(res.featured ? res.featured.slice(0, 10) : []);
        } else if (mounted) {
          // fallback mock list
          const fallback = [
            {
              id: "a1",
              name: "Pandit R. Sharma",
              tags: ["Vedic", "Career"],
              online: true,
              isFeatured: true,
              rating: 4.9,
            },
            {
              id: "a2",
              name: "Smt. L. Gupta",
              tags: ["Love & Relationships", "KP"],
              online: false,
              isFeatured: true,
              rating: 4.8,
            },
            {
              id: "a3",
              name: "Astro Rishi",
              tags: ["Nadi", "Health"],
              online: true,
              isFeatured: false,
              rating: 4.7,
            },
            // ...more
          ];
          setOnlineAstrologers(fallback.filter((a) => a.online).slice(0, 10));
          setFeaturedAstrologers(
            fallback.filter((a) => a.isFeatured).slice(0, 10)
          );
        }
      } catch (e) {
        console.error("Error loading astrologers:", e);
      }
    }

    async function loadTestimonials() {
      // lightweight mock testimonials; replace with real API later
      const mockT = [
        {
          id: "t1",
          name: "Anita K.",
          quote: "AI predictions were eerily accurate — 60s and meaningful.",
        },
        {
          id: "t2",
          name: "Rohit P.",
          quote: "Spoke to an astrologer instantly and got real guidance.",
        },
      ];
      if (mounted) setTestimonials(mockT);
    }

    loadAstrologers();
    loadTestimonials();

    return () => {
      mounted = false;
    };
  }, []);

  // Helper function to format time strings
  const formatTime = (timeString) => {
    try {
      if (!timeString) return "N/A";

      // Handle different time formats
      let date;
      if (timeString.includes("T")) {
        // ISO format
        date = new Date(timeString);
      } else if (timeString.includes(" ")) {
        // "YYYY-MM-DD HH:MM:SS" format
        date = new Date(timeString);
      } else {
        // Just time format "HH:MM:SS"
        const today = new Date(selectedDate);
        const [hours, minutes, seconds] = timeString.split(":");
        date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
      }

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString; // Return original if formatting fails
    }
  };

  // Helper function to format HH:MM time strings from IPGeolocation API
  const formatTimeFromHHMM = (timeString) => {
    try {
      if (!timeString || timeString === "-:-") return "N/A";

      // Handle HH:MM format from IPGeolocation API
      const [hours, minutes] = timeString.split(":");
      const today = new Date(selectedDate);
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        parseInt(hours),
        parseInt(minutes),
        0
      );

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting HH:MM time:", error);
      return timeString; // Return original if formatting fails
    }
  };

  // Helper to format various date/time strings (including "YYYY-MM-DD HH:MM:SS[.ffffff]") into 24h HH:MM
  const formatTime24Exact = (dateTimeString) => {
    try {
      if (!dateTimeString) return "N/A";
      const raw = String(dateTimeString).trim();

      // If it's just HH:MM or HH:MM:SS, return HH:MM
      const hhmmssMatch = raw.match(/^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/);
      if (hhmmssMatch) {
        const hh = String(parseInt(hhmmssMatch[1], 10)).padStart(2, "0");
        const mm = hhmmssMatch[2];
        return `${hh}:${mm}`;
      }

      // Try to normalize "YYYY-MM-DD HH:MM:SS(.ffffff)" to ISO by replacing space with 'T' and removing microseconds
      let normalized = raw.replace(" ", "T").replace(/\.(\d{1,6})$/, "");
      let d = new Date(normalized);

      // Fallback: if still invalid, try without the 'T'
      if (isNaN(d.getTime())) {
        const parts = raw.split(/[ T]/);
        if (parts.length >= 2) {
          const timePart = parts[1];
          const tm = timePart.split(":");
          if (tm.length >= 2) {
            const hh = String(parseInt(tm[0], 10)).padStart(2, "0");
            const mm = String(parseInt(tm[1], 10)).padStart(2, "0");
            return `${hh}:${mm}`;
          }
        }
        return raw;
      }

      // Format to 24-hour HH:MM using en-GB locale
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Error in formatTime24Exact:", error);
      return String(dateTimeString);
    }
  };
  // Helper to normalize all astrology API outputs (direct JSON or { output: "..." })
  const normalizeAstroOutput = (raw) => {
    let out = raw;

    // 1) Unwrap { output: ... } shape
    if (out && typeof out === "object" && "output" in out) {
      out = out.output;
    }

    // 2) If it's a JSON string, parse 1–2 times (handles double-encoded JSON)
    try {
      if (typeof out === "string") out = JSON.parse(out);
    } catch {}
    try {
      if (typeof out === "string") out = JSON.parse(out);
    } catch {}

    return out || null;
  };

  const fetchRealPanchangData = async () => {
    if (!userLocation || !selectedDate) return;

    setIsLoadingPanchang(true);
    setPanchangError(null);

    try {
      const date = new Date(selectedDate);
      const tzNow = -new Date().getTimezoneOffset() / 60;
      // Build a stable cache key by date + rounded location + tz
      const cacheKey = `${date
        .toISOString()
        .slice(0, 10)}|${userLocation.latitude.toFixed(
        3
      )},${userLocation.longitude.toFixed(3)}|${tzNow}`;

      // 1) Check in-memory cache
      const mem = homePanchangCache.get(cacheKey);
      if (mem && mem.data) {
        setPanchangData(mem.data);
        setIsLoadingPanchang(false);
        return;
      }
      // 2) Check localStorage cache
      const stored = readHomeCache(cacheKey);
      if (stored && stored.data) {
        setPanchangData(stored.data);
        // warm in-memory cache
        try {
          homePanchangCache.set(cacheKey, {
            data: stored.data,
            savedAt: stored.savedAt || Date.now(),
          });
        } catch {}
        setIsLoadingPanchang(false);
        return;
      }
      const payload = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        date: date.getDate(),
        hours: 12,
        minutes: 0,
        seconds: 0,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        timezone: tzNow,
        config: {
          observation_point: "topocentric",
          ayanamsha: "lahiri",
        },
      };

      // Fetch Panchang data, Sun/Moon data, and Auspicious/Inauspicious data in parallel
      const now = new Date();
      const auspiciousPayload = {
        ...payload,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        date: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        timezone: tzNow,
      };
      try {
        console.groupCollapsed("[Home] Payloads");
        console.log("[Panchang] Payload", payload);
        console.log("[Auspicious] Payload", auspiciousPayload);
        console.groupEnd();
      } catch {}

      // Tolerate partial failures: do not reject if a single call returns 429 or 403
      const [panchangSettled, sunMoonSettled, auspiciousSettled] =
        await Promise.allSettled([
          astrologyAPI.getPanchangData(payload),
          astrologyAPI.getSunMoonData(
            userLocation.latitude,
            userLocation.longitude,
            date
          ),
          astrologyAPI.getAuspiciousData(auspiciousPayload),
        ]);

      const panchangResults =
        panchangSettled.status === "fulfilled"
          ? panchangSettled.value
          : {
              results: {},
              errors: { all: panchangSettled.reason?.message || "failed" },
            };
      const sunMoonData =
        sunMoonSettled.status === "fulfilled" ? sunMoonSettled.value : null;
      const auspiciousData =
        auspiciousSettled.status === "fulfilled"
          ? auspiciousSettled.value
          : {
              results: {},
              errors: { all: auspiciousSettled.reason?.message || "failed" },
            };

      // Check if API authentication failed (403 error)
      const hasAuthError = [
        panchangSettled,
        sunMoonSettled,
        auspiciousSettled,
      ].some(
        (result) =>
          result.status === "rejected" &&
          result.reason?.message?.includes("403")
      );

      if (hasAuthError) {
        console.warn("API authentication failed, using mock data");
        setPanchangData(mockPanchangData);
        setPanchangError("Using sample data due to API authentication issues.");
        setIsLoadingPanchang(false);
        return;
      }

      // Update panchang data with real API results
      const updatedPanchangData = { ...mockPanchangData };

      // Process Tithi data
      if (panchangResults.results["tithi-durations"]) {
        try {
          const raw = panchangResults.results["tithi-durations"];
          const t = normalizeAstroOutput(raw);

          if (t && t.name) {
            // API gives paksha in lowercase: "krishna" / "shukla"
            const paksha =
              typeof t.paksha === "string" && t.paksha.length
                ? t.paksha[0].toUpperCase() + t.paksha.slice(1).toLowerCase()
                : null;

            // Final label: "Krishna Paksha Ekadashi"
            updatedPanchangData.tithi = paksha
              ? `${paksha} Paksha ${t.name}`
              : t.name;
          }
        } catch (e) {
          console.error("Error parsing tithi data:", e);
        }
      }

      // Process Nakshatra data
      if (panchangResults.results["nakshatra-durations"]) {
        try {
          const raw = panchangResults.results["nakshatra-durations"];
          const n = normalizeAstroOutput(raw);

          const name = n?.name || n?.nakshatra?.name || n?.nakshatra_name;

          if (name) {
            updatedPanchangData.nakshatra = name;
          }
        } catch (e) {
          console.error("Error parsing nakshatra data:", e);
        }
      }

      // Process Yoga data
      if (panchangResults.results["yoga-durations"]) {
        try {
          const yogaData = JSON.parse(
            JSON.parse(panchangResults.results["yoga-durations"].output)
          );
          const currentYoga = Object.values(yogaData).find(
            (yoga) => yoga.yoga_left_percentage > 0
          );
          if (currentYoga) {
            updatedPanchangData.yoga = currentYoga.name;
          }
        } catch (e) {
          console.error("Error parsing yoga data:", e);
        }
      }

      // Process Karana data
      if (panchangResults.results["karana-timings"]) {
        try {
          const karanaData = JSON.parse(
            JSON.parse(panchangResults.results["karana-timings"].output)
          );
          const currentKarana = Object.values(karanaData).find(
            (karana) => karana.karana_left_percentage > 0
          );
          if (currentKarana) {
            updatedPanchangData.karana = currentKarana.name;
          }
        } catch (e) {
          console.error("Error parsing karana data:", e);
        }
      }

      // Process Sun/Moon data from IPGeolocation API
      if (sunMoonData && sunMoonData.astronomy) {
        try {
          const astronomy = sunMoonData.astronomy;

          // Process Sunrise/Sunset
          if (astronomy.sunrise && astronomy.sunrise !== "-:-") {
            updatedPanchangData.sunrise = formatTimeFromHHMM(astronomy.sunrise);
          }
          if (astronomy.sunset && astronomy.sunset !== "-:-") {
            updatedPanchangData.sunset = formatTimeFromHHMM(astronomy.sunset);
          }

          // Process Moonrise/Moonset
          if (astronomy.moonrise && astronomy.moonrise !== "-:-") {
            updatedPanchangData.moonrise = formatTimeFromHHMM(
              astronomy.moonrise
            );
          }
          if (astronomy.moonset && astronomy.moonset !== "-:-") {
            updatedPanchangData.moonset = formatTimeFromHHMM(astronomy.moonset);
          }
        } catch (e) {
          console.error("Error parsing sun/moon data:", e);
        }
      }

      // Debug logs: show raw API results for diagnostics
      try {
        console.groupCollapsed("[Panchang] Raw API results");
        console.log("panchangResults:", panchangResults);
        console.log("sunMoonData:", sunMoonData);
        console.log("auspiciousData:", auspiciousData);
        console.groupEnd();
      } catch (_) {}

      // Log Auspicious/Inauspicious fetch outcome per endpoint
      if (auspiciousData) {
        const endpointsToCheck = [
          "rahu-kalam",
          "yama-gandam",
          "gulika-kalam",
          "abhijit-muhurat",
          "amrit-kaal",
          "brahma-muhurat",
          "dur-muhurat",
          "varjyam",
          "good-bad-times",
        ];
        endpointsToCheck.forEach((ep) => {
          const res = auspiciousData.results?.[ep];
          const err = auspiciousData.errors?.[ep];
          if (res) {
            console.log(`[Auspicious] ${ep} fetched:`, res);
          } else if (err) {
            console.error(`[Auspicious] ${ep} failed:`, err);
          } else {
            console.warn(`[Auspicious] ${ep} no data returned`);
          }
        });
      }

      // Populate Auspicious/Inauspicious times into UI state (we WILL NOT show them on home — only Panchang page)
      // but still collect them into updatedPanchangData so the Panchang page can read from cache/localStorage
      if (auspiciousData && auspiciousData.results) {
        const map = {
          "rahu-kalam": "rahukalam",
          "yama-gandam": "yamaganda",
          "gulika-kalam": "gulika",
          "abhijit-muhurat": "abhijitMuhurat",
          "amrit-kaal": "amritKaal",
          "brahma-muhurat": "brahmaMuhurat",
          "dur-muhurat": "durMuhurat",
          varjyam: "varjyam",
        };

        const safeParse = (v) => {
          try {
            return typeof v === "string" ? JSON.parse(v) : v;
          } catch {
            return v;
          }
        };

        const toRange = (start, end) => {
          if (!start && !end) return null;
          const s = start ? formatTime24Exact(String(start)) : null;
          const e = end ? formatTime24Exact(String(end)) : null;
          if (s && e) return `${s} - ${e}`;
          return s || e;
        };

        for (const [endpoint, target] of Object.entries(map)) {
          const res = auspiciousData.results[endpoint];
          if (!res) continue;
          let out = res.output;
          out = safeParse(out);
          out = safeParse(out);
          if (out && typeof out === "object") {
            const start =
              out.starts_at || out.start_time || out.start || out.from;
            const end = out.ends_at || out.end_time || out.end || out.to;
            const range = toRange(start, end);
            if (range) {
              updatedPanchangData[target] = range;
            }
          } else if (typeof out === "string") {
            // Sometimes API returns a ready-made string
            updatedPanchangData[target] = out;
          }
        }

        // Good & Bad Times (may include arrays)
        if (auspiciousData.results["good-bad-times"]) {
          let out = auspiciousData.results["good-bad-times"].output;
          out = safeParse(out);
          out = safeParse(out);
          if (out && typeof out === "object") {
            const toJoined = (arr) => {
              if (!Array.isArray(arr)) return null;
              const parts = arr
                .map((item) => {
                  const st =
                    item.starts_at ||
                    item.start_time ||
                    item.start ||
                    item.from;
                  const en =
                    item.ends_at || item.end_time || item.end || item.to;
                  return toRange(st, en);
                })
                .filter(Boolean);
              return parts.length ? parts.join(", ") : null;
            };
            const good = toJoined(out.good_times || out.good);
            const bad = toJoined(out.bad_times || out.bad);
            const combined = [
              good ? `Good: ${good}` : null,
              bad ? `Bad: ${bad}` : null,
            ]
              .filter(Boolean)
              .join("; ");
            if (combined) updatedPanchangData.goodBadTimes = combined;
          } else if (typeof out === "string") {
            updatedPanchangData.goodBadTimes = out;
          }
        }
      }

      setPanchangData(updatedPanchangData);
      // Cache success to cut repeats (guard if cacheKey exists)
      try {
        homePanchangCache.set(cacheKey, {
          data: updatedPanchangData,
          savedAt: Date.now(),
        });
        writeHomeCache(cacheKey, {
          data: updatedPanchangData,
          savedAt: Date.now(),
        });
      } catch {}

      // Decide banner severity
      const hasAnyData = Boolean(
        updatedPanchangData.tithi !== mockPanchangData.tithi ||
          updatedPanchangData.nakshatra !== mockPanchangData.nakshatra ||
          updatedPanchangData.yoga !== mockPanchangData.yoga ||
          updatedPanchangData.karana !== mockPanchangData.karana ||
          updatedPanchangData.sunrise !== mockPanchangData.sunrise ||
          updatedPanchangData.sunset !== mockPanchangData.sunset ||
          updatedPanchangData.moonrise !== mockPanchangData.moonrise ||
          updatedPanchangData.moonset !== mockPanchangData.moonset
      );
      const allFailed =
        panchangSettled.status === "rejected" &&
        sunMoonSettled.status === "rejected" &&
        auspiciousSettled.status === "rejected";
      if (allFailed) {
        setPanchangError(
          "Failed to load real-time Panchang data. Using sample data."
        );
      } else if (!hasAnyData) {
        setPanchangError(
          "Real-time Panchang data could not be populated due to API limits. Using sample data."
        );
      } else {
        // Show a softer note only if some endpoints failed
        const fails = [
          panchangSettled,
          sunMoonSettled,
          auspiciousSettled,
        ].filter((r) => r.status === "rejected").length;
        if (fails > 0) {
          setPanchangError(
            "Some sections are limited due to API rate limits. Showing partial real-time data."
          );
        }
      }
    } catch (error) {
      console.error("Error fetching Panchang data:", error);
      // Fall back to mock data on any error
      setPanchangData(mockPanchangData);
      setPanchangError("Using sample Panchang data due to API issues.");
    } finally {
      setIsLoadingPanchang(false);
    }
  };

  const handleOptionClick = (optionId) => {
    if (optionId === "tithi-timings") {
      // Redirect to dedicated tithi timings page
      window.location.href = "/tithi-timings";
      return;
    }

    if (optionId === "choghadiya-timings") {
      // Redirect to dedicated choghadiya timings page
      window.location.href = "/choghadiya-timings";
      return;
    }

    const option = astrologyOptions.find((opt) => opt.id === optionId);
    setSelectedOption(option);
    setAstrologyResult(null);
    setError(null);
  };

  const handleFormSubmit = async (payload) => {
    // This handler is reused by astrology form(s).
    // For "AI Prediction" flow we redirect with query/prefill.
    setIsLoading(true);
    setError(null);

    try {
      const result = await astrologyAPI.getSingleCalculation(
        selectedOption.id,
        payload
      );
      setAstrologyResult(result);
    } catch (error) {
      setError("Failed to fetch astrological data. Please try again.");
      console.error("API error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToOptions = () => {
    setSelectedOption(null);
    setAstrologyResult(null);
    setError(null);
    setTimeout(() => {
      document
        .getElementById("astrology-options")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleNewCalculation = () => {
    setAstrologyResult(null);
    setError(null);
  };

  // NEW: AI Prediction quick form submit (redirect with prefill)
  const handleAIPredictionSubmit = (birthPayload) => {
    // Build a query string with minimal, safe prefill params
    // NOTE: don't include sensitive data in URL if you don't want it logged.
    const qs = new URLSearchParams({
      name: birthPayload.name || "",
      date: birthPayload.date || "",
      time: birthPayload.time || "",
      place: birthPayload.place || "",
    }).toString();
    // Redirect to AI Prediction page (prefill handled there by reading query params or localStorage)
    window.location.href = `/ai-prediction?${qs}`;
  };

  // Panchang items (keeps showing core tithi/nakshatra etc)
  const panchangItems = [
    { label: "Tithi", value: panchangData?.tithi || "Loading..." },
    { label: "Nakshatra", value: panchangData?.nakshatra || "Loading..." },
    { label: "Yoga", value: panchangData?.yoga || "Loading..." },
    { label: "Karana", value: panchangData?.karana || "Loading..." },
    { label: "Sunrise", value: panchangData?.sunrise || "Loading..." },
    { label: "Sunset", value: panchangData?.sunset || "Loading..." },
    { label: "Moonrise", value: panchangData?.moonrise || "Loading..." },
    { label: "Moonset", value: panchangData?.moonset || "Loading..." },
  ];

  // HOME: we REMOVE the in-page Auspicious & Inauspicious timings section per your request.
  // Instead, provide a short link/callout to full Panchang page where timings are shown.

  // Show form if option is selected
  if (selectedOption && !astrologyResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AstrologyForm
            option={selectedOption}
            onSubmit={handleFormSubmit}
            onBack={handleBackToOptions}
            isLoading={isLoading}
          />
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Show result if calculation is complete
  if (selectedOption && astrologyResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AstrologyResult
            option={selectedOption}
            data={astrologyResult}
            onBack={handleBackToOptions}
            onNewCalculation={handleNewCalculation}
          />
        </main>
      </div>
    );
  }

  // Show main home page with options
  return (
    <>
      {/* Full Page Background */}
      <div className="home-page min-h-screen">
        <div
          className="fixed inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%234f46e5' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Main Content */}
        <main className="home-main relative z-10">
          {/* ─────────────────────────────── HERO SECTION ─────────────────────────────── */}
          <header className="hero-section">
            <div className="hero-background">
              <div className="hero-gradient-mesh"></div>
              <div className="hero-constellation"></div>
              <div className="hero-particles">
                <span className="particle particle-1"></span>
                <span className="particle particle-2"></span>
                <span className="particle particle-3"></span>
                <span className="particle particle-4"></span>
                <span className="particle particle-5"></span>
              </div>
            </div>

            <div className="hero-content-wrapper">
              {/* Left Content */}
              <div className="hero-left">
                <div className="hero-badge">
                  <Sparkles className="hero-badge-icon" />
                  <span>Trusted Vedic Astrology Platform</span>
                </div>

                {/* NEW: Updated headline per request */}
                <h1 className="hero-main-title">
                  Don’t wait for life to break. Fix it with{" "}
                  <span className="hero-highlight">AI-powered astrology.</span>
                </h1>

                {/* NEW: Refined subheading */}
                <p className="hero-description">
                  Talk to famous astrologers <strong>or</strong> use our AI
                  engine trained on NASA ephemeris data and insights from{" "}
                  <strong>200,000+ real charts.</strong>
                </p>

                {/* NEW: Pill chips under subheading (Life Insights, Kundali Matching, Panchang Today) */}
                <div className="hero-features-inline" style={{ marginTop: 8 }}>
                  <button
                    className="hero-pill"
                    onClick={() => {
                      // quick link to Life Insights (placeholder)
                      window.location.href = "/predictions";
                    }}
                  >
                    Life Insights
                  </button>
                  <button
                    className="hero-pill"
                    onClick={() => {
                      window.location.href = "/matching";
                    }}
                  >
                    Kundali Matching
                  </button>
                  <button
                    className="hero-pill"
                    onClick={() => {
                      window.location.href = "/panchang/calender"
                    }}
                  >
                    Panchang Today
                  </button>
                </div>

                {/* NEW: Primary CTAs (two main flows only) */}
                <div className="hero-actions">
                  {/* The two new primary CTAs requested */}
                  <button
                    onClick={() =>
                      (window.location.href = "/talk-to-astrologer")
                    }
                    className="hero-btn hero-btn-primary"
                  >
                    <Star className="hero-btn-icon" />
                    Talk to an Astrologer
                  </button>

                  <button
                    onClick={() => (window.location.href = "/predictions")}
                    className="hero-btn inline-flex items-center gap-2 px-4 py-3 rounded-md font-semibold shadow-sm
             bg-transparent border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    type="button"
                    style={{
                      background: "transparent",
                      border: "2px solid #a78bfa",
                      color: "#5b21b6", // optional: make text match border
                    }}
                  >
                    <Sparkles className="hero-btn-icon" />
                    Get AI Predictions
                  </button>
                </div>

                {/* Subtexts that sit directly below the primary CTAs */}
                <div className="hero-cta-subtexts">
                  <p className="cta-subtext">
                    Instant 1:1 call or chat with a real expert.
                  </p>
                  <p className="cta-subtext">Precise insights in 60 seconds.</p>
                </div>

                {/* Social proof line (updated stats per design) */}
                <div className="hero-stats" style={{ marginTop: 18 }}>
                  <div className="hero-stat">
                    <div className="hero-stat-number">50K+</div>
                    <div className="hero-stat-label">Daily Users</div>
                  </div>
                  <div className="hero-stat-divider"></div>
                  <div className="hero-stat">
                    <div className="hero-stat-number">98%</div>
                    <div className="hero-stat-label">User Satisfaction</div>
                  </div>
                  <div className="hero-stat-divider"></div>
                  <div className="hero-stat">
                    <div className="hero-stat-number">24/7</div>
                    <div className="hero-stat-label">Available</div>
                  </div>
                </div>
              </div>

              {/* Right Visual */}
              <div className="hero-right">
                <div className="hero-visual-container">
                  <div className="zodiac-circle">
                    <div className="zodiac-ring zodiac-ring-outer"></div>
                    <div className="zodiac-ring zodiac-ring-middle"></div>
                    <div className="zodiac-ring zodiac-ring-inner"></div>
                    <div className="zodiac-center">
                      <Sun className="zodiac-center-icon" />
                    </div>
                    {/* Zodiac Icons */}
                    <div className="zodiac-icon zodiac-icon-1">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 2L15 8L12 14L9 8L12 2Z M9 8L6 14L3 8 M15 8L18 14L21 8" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="8" cy="12" r="6" />
                        <circle cx="16" cy="12" r="6" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-3">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 4v16 M18 4v16 M6 8h12 M6 16h12" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-4">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <circle cx="7" cy="16" r="4" />
                        <circle cx="17" cy="16" r="4" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-5">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <circle cx="12" cy="12" r="8" />{" "}
                        <path d="M12 4v8l4 4" />{" "}
                      </svg>{" "}
                    </div>{" "}
                    <div className="zodiac-icon zodiac-icon-6">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <path d="M3 12h18 M8 6v12 M12 8v8 M16 10v4" />{" "}
                      </svg>{" "}
                    </div>{" "}
                    <div className="zodiac-icon zodiac-icon-7">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <path d="M3 6h18 M5 6v8a6 6 0 006 6h2a6 6 0 006-6V6" />{" "}
                      </svg>{" "}
                    </div>{" "}
                    <div className="zodiac-icon zodiac-icon-8">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" />{" "}
                        <path d="M12 18v4" />{" "}
                      </svg>{" "}
                    </div>{" "}
                    <div className="zodiac-icon zodiac-icon-9">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <path d="M4 12L12 4L20 12 M12 4V20" />{" "}
                      </svg>{" "}
                    </div>{" "}
                    <div className="zodiac-icon zodiac-icon-10">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <path d="M3 6h6a6 6 0 016 6v6a6 6 0 01-6 6H3" />{" "}
                      </svg>{" "}
                    </div>{" "}
                    <div className="zodiac-icon zodiac-icon-11">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <path d="M4 8h16 M4 16h16 M8 4v16 M16 4v16" />{" "}
                      </svg>{" "}
                    </div>{" "}
                    <div className="zodiac-icon zodiac-icon-12">
                      {" "}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {" "}
                        <path d="M3 12c0-3 2-5 4-5s4 2 4 5-2 5-4 5 M21 12c0 3-2 5-4 5s-4-2-4-5 2-5 4-5" />{" "}
                      </svg>{" "}
                    </div>{" "}
                  </div>
                  <div className="hero-info-card hero-info-card-1">
                    <Clock className="hero-info-icon" />
                    <div className="hero-info-content">
                      <div className="hero-info-label">Current Date</div>
                      <div className="hero-info-value">{currentDate}</div>
                    </div>
                  </div>

                  <div className="hero-info-card hero-info-card-2">
                    <Moon className="hero-info-icon" />
                    <div className="hero-info-content">
                      <div className="hero-info-label">Tithi</div>
                      <div className="hero-info-value">
                        {panchangData?.tithi || "Loading..."}
                      </div>
                    </div>
                  </div>

                  <div className="hero-info-card hero-info-card-3">
                    <Star className="hero-info-icon" />
                    <div className="hero-info-content">
                      <div className="hero-info-label">Nakshatra</div>
                      <div className="hero-info-value">
                        {panchangData?.nakshatra || "Loading..."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>
          {/* ───────────────────────────── END HERO SECTION ───────────────────────────── */}

          {/* ====== AI PREDICTION FORM SECTION (NEW) ====== */}
          <section id="ai-prediction-section" className="card mt-12">
            <div className="form-header p-5">
              <div className="form-header-icon">
                <Star />
              </div>
              <div className="form-header-text">
                <h3 className="form-title">
                  Let AI read your stars in 60 seconds.
                </h3>
                <p className="form-subtitle">
                  Fill in your birth details once. We’ll prefill them on the AI
                  predictions page and save time for all future readings.
                </p>
              </div>
            </div>

            <div className="form-grid-2col ai-form-grid p-10">
              {/* Minimal quick form — only name/date/time/place to prefill AI page */}
              <div className="form-field">
                <label htmlFor="ai-name">Name</label>
                <input
                  id="ai-name"
                  className="form-field-input"
                  placeholder="Your name"
                  aria-label="Your name"
                />
                <small className="form-field-helper">
                  Optional — we’ll personalise results.
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="ai-dob">Date of Birth</label>
                <input
                  id="ai-dob"
                  type="date"
                  className="form-field-input"
                  aria-label="Date of birth"
                />
              </div>

              <div className="form-field">
                <label htmlFor="ai-tob">Time of Birth</label>
                <input
                  id="ai-tob"
                  type="time"
                  className="form-field-input"
                  aria-label="Time of birth"
                />
                <small className="form-field-helper">
                  If unknown, pick approx. — AI will adapt.
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="ai-place">Place</label>
                <input
                  id="ai-place"
                  className="form-field-input"
                  placeholder="City, Country"
                  aria-label="Place of birth"
                />
              </div>
            </div>

            <div className="form-actions ai-form-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  // hint to user
                  document.getElementById("ai-name")?.focus();
                }}
                aria-label="Auto-fill hint"
                type="button"
              >
                Already used this before? We'll auto-fill what we remember.
              </button>

              <div className="cta-block">
                <button
                  id="ai-predict-btn"
                  className="btn btn-primary "
                  onClick={() => {
                    const payload = {
                      name: document.getElementById("ai-name")?.value || "",
                      date: document.getElementById("ai-dob")?.value || "",
                      time: document.getElementById("ai-tob")?.value || "",
                      place: document.getElementById("ai-place")?.value || "",
                    };
                    handleAIPredictionSubmit(payload);
                  }}
                  aria-label="Get AI predictions"
                  type="button"
                  style={{ color: "var(-color--gold" }}
                >
                  Get AI Predictions
                </button>
                <div className="cta-note">
                  Predictions under <strong>60 seconds</strong>. We’ll prefill
                  fields next time.
                </div>
              </div>
            </div>
          </section>

          {/* ====== Top Astrologers Online / Featured (NEW) ====== */}

          <section className="card mt-12 astrologers-section">
            <div className="astrologers-header p-5 mx-auto flex flex-col items-center text-center gap-4 sm:flex-col sm:text-center">
              <div className="astrologers-header-text">
                <h1 className="astrologers-title font-semibold">
                  Talk to the right astrologer — right now.
                </h1>
                <p className="astrologers-sub">
                  Handpicked Vedic, KP, and Nadi astrologers. Verified
                  experience. Real humans, not random “babas”.
                </p>
              </div>

              <div className="astrologers-actions flex flex-col sm:flex-row gap-3 sm:gap-4 w-full justify-center">
                <button
                  className="btn btn-ghost w-full sm:w-auto text-center"
                  onClick={() =>
                    (window.location.href = "/talk-to-astrologers")
                  }
                >
                  View All Astrologers →
                </button>

                <button
                  className="btn btn-ghost w-full sm:w-auto text-center"
                  onClick={() => (window.location.href = "/auth/astrologer")}
                >
                  Become an Astrologer →
                </button>
              </div>
            </div>

            <div
              className="astrologer-grid"
              role="list"
              aria-label="Top astrologers list"
            >
              {(onlineAstrologers.length > 0
                ? onlineAstrologers
                : featuredAstrologers
              ).map((ast) => (
                <article
                  key={ast.id}
                  className="astrologer-card card"
                  role="listitem"
                >
                  <header className="astrologer-card-top">
                    <div className="astrologer-meta">
                      <h4 className="astrologer-name">{ast.name}</h4>
                      <div className="astrologer-tags">
                        {ast.tags?.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="astrologer-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="astrologer-badge">
                      {ast.online ? (
                        <div className="liveBadge">
                          <span className="pulseDot" aria-hidden="true" />{" "}
                          Online
                        </div>
                      ) : ast.isFeatured ? (
                        <div className="featured-badge">Featured</div>
                      ) : null}
                    </div>
                  </header>

                  <div className="astrologer-card-body">
                    <div className="astrologer-rating">
                      ⭐ {ast.rating ?? 4.7}
                    </div>

                    <div className="astrologer-ctas">
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          (window.location.href = `/astrologer/${ast.id}`)
                        }
                        aria-label={`View profile of ${ast.name}`}
                        type="button"
                      >
                        View
                      </button>

                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          (window.location.href = `/chat/${ast.id}`)
                        }
                        aria-label={`Chat with ${ast.name}`}
                        type="button"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ====== Partner Matching / Loyalty Detector (UPGRADED) ====== */}
          <section className="mt-12">
            <div
              role="region"
              aria-labelledby="loyalty-title"
              className="max-w-7xl mx-auto bg-gradient-to-br from-white to-indigo-50/40 border border-gray-100 rounded-2xl p-6 md:p-8 shadow-lg flex flex-col md:flex-row gap-6 items-center"
            >
              {/* Left: icon + copy */}
              <div className="flex items-start gap-4 md:gap-6 flex-1">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-tr from-pink-100 to-rose-50 ring-1 ring-rose-100"
                  aria-hidden="true"
                >
                  {/* simple decorative icon */}
                  <svg
                    className="w-8 h-8 text-rose-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 21s-7-4.35-9-7.5A6 6 0 0112 3a6 6 0 019 10.5C19 16.65 12 21 12 21z" />
                  </svg>
                </div>

                <div>
                  <h3
                    id="loyalty-title"
                    className="text-lg md:text-xl font-semibold text-slate-800"
                  >
                    Loyalty Detector — quick compatibility check
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    See how your relationship might progress using our
                    Ashtakoot-based compatibility model. Designed for dating,
                    serious relationships, and marriage.
                  </p>

                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-50 text-emerald-600 font-semibold">
                        ✓
                      </span>
                      Quick results — minimal details required
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-50 text-amber-600 font-semibold">
                        ★
                      </span>
                      Learn the top Koot strengths & weaknesses
                    </li>
                  </ul>

                  <p className="mt-3 text-xs text-slate-500">
                    Already have details saved? The matching page will prefill
                    them for you.
                  </p>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="flex-shrink-0 flex flex-col items-stretch gap-3">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/matching")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold shadow-md hover:scale-[1.01] active:translate-y-0.5 transition transform"
                  aria-label="Check compatibility now — go to matching page"
                  style={{ backgroundColor: "var(--color-gold)" }}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M20.8 7.2a4.6 4.6 0 00-6.5 0L12 9.5l-2.3-2.3a4.6 4.6 0 10-6.5 6.5L12 22l8.8-8.8a4.6 4.6 0 000-6z" />
                  </svg>
                  Check Compatibility Now
                </button>
              </div>
            </div>
          </section>

          {/* ====== Testimonials (NEW) (Tailwind) ====== */}
          <section
            className="mt-12 flex flex-col items-center text-center px-4"
            aria-labelledby="testimonials-heading"
          >
            <h3 id="testimonials-heading" className="text-3xl font-semibold">
              What people say
            </h3>

            {/* wrapper: horizontal snap on mobile, grid on md+ */}
            <div className="w-full max-w-6xl mt-6">
              {/* Mobile: horizontal snap list */}
              <div
                role="list"
                aria-label="User testimonials"
                className="
        block md:hidden
        overflow-x-auto
        snap-x snap-mandatory
        -mx-4 px-4
      "
              >
                <div className="flex gap-4 items-start">
                  {testimonials && testimonials.length > 0 ? (
                    testimonials.map((t) => {
                      const initials = (t.name || "U")
                        .split(" ")
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join("")
                        .toUpperCase();

                      return (
                        <article
                          key={t.id}
                          role="listitem"
                          className="
                  snap-center flex-shrink-0
                  w-[88vw] max-w-xs
                  card bg-white p-5 rounded-xl shadow-sm mx-auto
                "
                        >
                          <header className="flex items-center gap-3 justify-center">
                            <div
                              aria-hidden="true"
                              className="
                      flex items-center justify-center
                      w-12 h-12 rounded-full font-bold text-white text-base
                    "
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(99,102,241,0.95))",
                              }}
                            >
                              {initials}
                            </div>

                            <div className="text-left">
                              <div className="text-sm font-semibold text-gray-900">
                                {t.name}
                              </div>
                              {t.meta && (
                                <div className="text-xs text-gray-500 truncate">
                                  {t.meta}
                                </div>
                              )}
                            </div>
                          </header>

                          <blockquote className="mt-4 text-sm italic text-gray-700 text-left">
                            “{t.quote}”
                          </blockquote>

                          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                            <div>Verified user</div>
                            {t.rating && (
                              <div className="font-medium text-yellow-500">
                                ★ {t.rating}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center w-full p-6 text-sm text-gray-500">
                      No testimonials yet.
                    </div>
                  )}
                </div>
              </div>

              {/* md+ grid view (2 cols on md, 3 on lg) */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {testimonials && testimonials.length > 0 ? (
                  testimonials.map((t) => {
                    const initials = (t.name || "U")
                      .split(" ")
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <article
                        key={t.id}
                        role="listitem"
                        className="card bg-white p-5 rounded-xl shadow-sm mx-auto"
                      >
                        <header className="flex items-center gap-3 justify-start">
                          <div
                            aria-hidden="true"
                            className="
                    flex items-center justify-center
                    w-12 h-12 rounded-full font-bold text-white text-base
                  "
                            style={{
                              background:
                                "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(99,102,241,0.95))",
                            }}
                          >
                            {initials}
                          </div>

                          <div className="text-left">
                            <div className="text-sm font-semibold text-gray-900">
                              {t.name}
                            </div>
                            {t.meta && (
                              <div className="text-xs text-gray-500 truncate">
                                {t.meta}
                              </div>
                            )}
                          </div>
                        </header>

                        <blockquote className="mt-4 text-sm italic text-gray-700 text-left">
                          “{t.quote}”
                        </blockquote>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <div>Verified user</div>
                          {t.rating && (
                            <div className="font-medium text-yellow-500">
                              ★ {t.rating}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center w-full p-6 text-sm text-gray-500">
                    No testimonials yet.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Main content sections wrapper */}
          <div className="content-sections-wrapper">
            {/* DATE & LOCATION CARD */}
            <div className="date-location-card">
              <DateSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                userLocation={userLocation}
                onLocationChange={setUserLocation}
                pendingLocation={pendingLocation}
                onPendingLocationChange={setPendingLocation}
              />
              {pendingLocation && (
                <button
                  onClick={() => {
                    setUserLocation({
                      latitude: pendingLocation.latitude,
                      longitude: pendingLocation.longitude,
                    });
                    setPendingLocation(null);
                  }}
                  className="apply-location-btn"
                >
                  <MapPin />
                  Apply Selected Location
                </button>
              )}
            </div>

            {/* LOADING STATE */}
            {isLoadingPanchang && (
              <div className="loading-container">
                <div className="loading-content">
                  <div className="loading-spinner"></div>
                  <span>Loading real-time cosmic data...</span>
                </div>
                <p className="loading-text">
                  Tithi • Nakshatra • Sunrise • Muhurta
                </p>
              </div>
            )}

            {/* STATUS BANNERS */}
            {panchangError && (
              <div className="status-banner status-banner-error">
                <p className="status-banner-text">{panchangError}</p>
              </div>
            )}

            {!isLoadingPanchang && !panchangError && userLocation && (
              <div className="status-banner status-banner-success">
                <p className="status-banner-text">
                  Real-time Panchang loaded for your location
                </p>
                <p className="status-banner-subtext">
                  Powered by Vedic API • Sun/Moon via IPGeolocation
                </p>
              </div>
            )}

            {/* PANCHANG GRID (Auspicious/Inauspicious moved to full Panchang page) */}
            <section className="panchang-section" id="panchang-section">
              <div className="panchang-date-badge flex items-center justify-center gap-2 mx-auto text-center">
                <Calendar />
                <span>Vedic Calendar</span>
              </div>

              <h2
                className="
      section-header
      flex flex-col items-center justify-center
      text-center mx-auto mt-4
    "
              >
                <Calendar className="section-icon section-icon-blue mb-1" />
                {selectedDate === new Date().toISOString().split("T")[0]
                  ? "Today's Panchang"
                  : `Panchang • ${new Date(selectedDate).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}`}
              </h2>

              <p
                className="
      panchang-description 
      text-center 
      max-w-2xl 
      mx-auto 
      mt-2 
      text-gray-600
    "
              >
                Essential celestial elements for auspicious planning.
                <br />
              </p>

              <div className="panchang-grid-container">
                <div className="panchang-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {panchangItems.map((item, i) => (
                    <PanchangCard
                      key={i}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </div>

              {/* If festivals exist show highlighted festival */}
              {panchangData?.festivals?.length > 0 && (
                <section
                  className="festival-section-enhanced"
                  style={{ marginTop: 18 }}
                >
                  <div className="festival-content-grid">
                    <div className="festival-left">
                      <div className="festival-badge">
                        <Sparkles className="festival-badge-icon" />
                        <span>Special Day</span>
                      </div>
                      <h2 className="festival-main-title">Today's Festival</h2>
                      <p className="festival-description">
                        Celebrating auspicious moments and sacred traditions.
                      </p>
                    </div>
                    <div className="festival-right">
                      <div className="festival-card-wrapper">
                        <FestivalCard festival={panchangData?.festivals[0]} />
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </section>

            {/* ASTROLOGY OPTIONS GRID */}
            <section className="astrology-section" id="astrology-options">
              <div className="astrology-header">
                <h2 className="astrology-title">
                  <Star />
                  Explore Vedic Calculations
                </h2>
                <p className="astrology-subtitle">
                  For serious astrology lovers. Deep-dive into the math behind
                  your chart.
                </p>
              </div>
              <div className="astrology-grid">
                {astrologyOptions.map((option) => (
                  <AstrologyOptionCard
                    key={option.id}
                    option={option}
                    onClick={handleOptionClick}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* FOOTER */}
          <footer className="home-footer">
            <p>
              Made with <span className="text-red-500">❤️</span> by{" "}
              <span className="footer-brand">TheGodSays Team</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Vedic wisdom meets modern precision
            </p>
          </footer>
        </main>
      </div>

      {/* FORM VIEW */}
      {selectedOption && !astrologyResult && (
        <div className="form-view">
          <div className="form-container">
            <AstrologyForm
              option={selectedOption}
              onSubmit={handleFormSubmit}
              onBack={handleBackToOptions}
              isLoading={isLoading}
            />
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}

      {/* RESULT VIEW */}
      {selectedOption && astrologyResult && (
        <div className="result-view">
          <div className="result-container">
            <AstrologyResult
              option={selectedOption}
              data={astrologyResult}
              onBack={handleBackToOptions}
              onNewCalculation={handleNewCalculation}
            />
          </div>
        </div>
      )}
    </>
  );
}
