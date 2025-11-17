"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import PanchangCard from "@/components/PanchangCard";
import TimingsSection from "@/components/TimingsSection";
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

      // Populate Auspicious/Inauspicious times into UI state
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
          updatedPanchangData.moonset !== mockPanchangData.moonset ||
          updatedPanchangData.rahukalam !== mockPanchangData.rahukalam ||
          updatedPanchangData.gulika !== mockPanchangData.gulika ||
          updatedPanchangData.yamaganda !== mockPanchangData.yamaganda ||
          updatedPanchangData.abhijitMuhurat !==
            mockPanchangData.abhijitMuhurat ||
          updatedPanchangData.brahmaMuhurat !==
            mockPanchangData.brahmaMuhurat ||
          updatedPanchangData.amritKaal !== mockPanchangData.amritKaal ||
          updatedPanchangData.durMuhurat !== mockPanchangData.durMuhurat ||
          updatedPanchangData.varjyam !== mockPanchangData.varjyam ||
          updatedPanchangData.goodBadTimes !== mockPanchangData.goodBadTimes
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

  const inauspiciousTimings = [
    { label: "Rahukalam", time: panchangData?.rahukalam || "Loading..." },
    { label: "Gulika", time: panchangData?.gulika || "Loading..." },
    { label: "Yamaganda", time: panchangData?.yamaganda || "Loading..." },
    {
      label: "Abhijit Muhurat",
      time: panchangData?.abhijitMuhurat || "Loading...",
    },
    {
      label: "Brahma Muhurat",
      time: panchangData?.brahmaMuhurat || "Loading...",
    },
    { label: "Amrit Kaal", time: panchangData?.amritKaal || "Loading..." },
    { label: "Dur Muhurat", time: panchangData?.durMuhurat || "Loading..." },
    { label: "Varjyam", time: panchangData?.varjyam || "Loading..." },
    {
      label: "Good & Bad Times",
      time: panchangData?.goodBadTimes || "Loading...",
    },
  ];

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

                <h1 className="hero-main-title">
                  Unlock Your <span className="hero-highlight">Cosmic</span>{" "}
                  Destiny
                </h1>

                <p className="hero-description">
                  Discover personalized Vedic insights, daily Panchang, and
                  auspicious timings powered by ancient wisdom and modern
                  precision.
                </p>

                <div className="hero-features-inline">
                  <div className="hero-pill">
                    <Sun className="hero-pill-icon" />
                    <span>Daily Panchang</span>
                  </div>
                  <div className="hero-pill">
                    <Moon className="hero-pill-icon" />
                    <span>Kundli Analysis</span>
                  </div>
                  <div className="hero-pill">
                    <Star className="hero-pill-icon" />
                    <span>Live Muhurat</span>
                  </div>
                </div>

                <div className="hero-actions">
                  <button
                    onClick={() =>
                      document
                        .getElementById("panchang-section")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="hero-btn hero-btn-primary"
                  >
                    <Calendar className="hero-btn-icon" />
                    View Today's Panchang
                  </button>
                  <button
                    onClick={() =>
                      document
                        .getElementById("astrology-options")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="hero-btn hero-btn-secondary"
                  >
                    <Star className="hero-btn-icon" />
                    Explore Tools
                  </button>
                </div>

                <div className="hero-stats">
                  <div className="hero-stat">
                    <div className="hero-stat-number">50K+</div>
                    <div className="hero-stat-label">Daily Users</div>
                  </div>
                  <div className="hero-stat-divider"></div>
                  <div className="hero-stat">
                    <div className="hero-stat-number">99.9%</div>
                    <div className="hero-stat-label">Accuracy</div>
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
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 4v8l4 4" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-6">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12h18 M8 6v12 M12 8v8 M16 10v4" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-7">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18 M5 6v8a6 6 0 006 6h2a6 6 0 006-6V6" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-8">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" />
                        <path d="M12 18v4" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-9">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 12L12 4L20 12 M12 4V20" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-10">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h6a6 6 0 016 6v6a6 6 0 01-6 6H3" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-11">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 8h16 M4 16h16 M8 4v16 M16 4v16" />
                      </svg>
                    </div>
                    <div className="zodiac-icon zodiac-icon-12">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12c0-3 2-5 4-5s4 2 4 5-2 5-4 5 M21 12c0 3-2 5-4 5s-4-2-4-5 2-5 4-5" />
                      </svg>
                    </div>
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

            {/* PANCHANG GRID */}
            <section className="panchang-section" id="panchang-section">
              <div className="panchang-header-wrapper">
                <div className="panchang-date-badge">
                  <Calendar />
                  <span>Vedic Calendar</span>
                </div>
                <h2 className="section-header">
                  <Calendar className="section-icon section-icon-blue" />
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
                <p className="panchang-description">
                  Essential celestial elements for auspicious planning
                </p>
              </div>

              <div className="panchang-grid-container">
                <div className="panchang-grid">
                  {panchangItems.map((item, i) => (
                    <PanchangCard
                      key={i}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* AUSPICIOUS / INAUSPICIOUS TIMINGS */}
            <section className="timings-section">
              <div className="timings-section-container">
                <div className="timings-header-wrapper">
                  <div className="timings-header-left">
                    <div className="timings-header-badge">
                      <AlertCircle />
                      <span>Important Timings</span>
                    </div>
                    <h2 className="section-header">
                      <Clock className="section-icon section-icon-red" />
                      Auspicious & Inauspicious Periods
                    </h2>
                    <p className="timings-description">
                      Plan your day with precise Vedic time calculations
                    </p>
                  </div>

                  <div className="timings-header-right">
                    <div className="timings-legend">
                      <span className="timings-legend-dot auspicious"></span>
                      <span>Auspicious</span>
                    </div>
                    <div className="timings-legend">
                      <span className="timings-legend-dot inauspicious"></span>
                      <span>Inauspicious</span>
                    </div>
                  </div>
                </div>

                <div className="timings-content">
                  <TimingsSection timings={inauspiciousTimings} />
                </div>
              </div>
            </section>

            {/* FESTIVAL HIGHLIGHT */}
            {panchangData?.festivals.length > 0 && (
              <section className="festival-section-enhanced">
                <div className="festival-content-grid">
                  <div className="festival-left">
                    <div className="festival-badge">
                      <Sparkles className="festival-badge-icon" />
                      <span>Special Day</span>
                    </div>
                    <h2 className="festival-main-title">Today's Festival</h2>
                    <p className="festival-description">
                      Celebrating auspicious moments and sacred traditions
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

            {/* ASTROLOGY OPTIONS GRID */}
            <section className="astrology-section" id="astrology-options">
              <div className="astrology-header">
                <h2 className="astrology-title">
                  <Star />
                  Explore Vedic Calculations
                </h2>
                <p className="astrology-subtitle">
                  Tap any tool to compute detailed astrological insights
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
