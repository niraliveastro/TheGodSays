"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import PanchangCard from "@/components/PanchangCard";
import FestivalCard from "@/components/FestivalCard";
import AstrologyOptionCard from "@/components/AstrologyOptionCard";
import AstrologyForm from "@/components/AstrologyForm";
import AstrologyResult from "@/components/AstrologyResult";
import DateSelector from "@/components/DateSelector";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/contexts/ThemeContext";
import { mockPanchangData } from "@/lib/mockData";
import { astrologyAPI } from "@/lib/api";
import { trackPageView } from "@/lib/analytics";
import { fastNavigate, prefetchRoutes, COMMON_ROUTES } from "@/lib/fastRouter";
import {
  Calendar,
  MapPin,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Star,
  AlertCircle,
  Video,
  Phone,
} from "lucide-react";
import "./home.css";
import ReviewModal from "@/components/ReviewModal";
import CallConnectingNotification from "@/components/CallConnectingNotification";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  } catch { }
};

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isCosmic = theme === 'cosmic';

  // Prefetch common routes on mount for faster navigation
  useEffect(() => {
    prefetchRoutes(router, COMMON_ROUTES);
  }, [router]);

  // Track page view on mount
  useEffect(() => {
    trackPageView('/', 'Home - RahuNow');
  }, []);

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
  const [fetchingAstrologers, setFetchingAstrologers] = useState(true);

  // Call state
  const [connectingCallType, setConnectingCallType] = useState(null);
  const [callStatus, setCallStatus] = useState("connecting");
  const [loading, setLoading] = useState(false);

  // AI Predictions form state
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    tob: "",
    place: "",
    gender: "",
  });
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const locationInputRef = useRef(null);
  const hasInteractedWithLocation = useRef(false);

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedAstrologerForReview, setSelectedAstrologerForReview] = useState(null);

  // Fetch astrologers from Firebase with real status
  const fetchAndUpdateAstrologers = async () => {
    try {
      const snap = await getDocs(collection(db, "astrologers"));
      const list = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          specialization: d.specialization,
          rating: d.rating || 0,
          reviews: d.reviews || 0,
          experience: d.experience,
          languages: d.languages || ["English"],
          status: d.status || "offline",
          isOnline: d.status === "online",
          online: d.status === "online",
          bio: d.bio || `Expert in ${d.specialization}`,
          verified: d.verified || false,
        };
      });

      /* ---- Pricing ---- */
      try {
        const res = await fetch("/api/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-all-pricing" }),
        });
        const data = await res.json();
        if (data.success) {
          const map = {};
          data.pricing.forEach((p) => (map[p.astrologerId] = p));
          list.forEach((a) => {
            const p = map[a.id];
            if (p) {
              a.pricing = p;
              a.perMinuteCharge =
                p.pricingType === "per_minute" ? p.finalPrice : null;
            } else {
              a.pricing = { pricingType: "per_minute", finalPrice: 50 };
              a.perMinuteCharge = 50;
            }
          });
        }
      } catch (e) {
        console.error("Error fetching pricing:", e);
      }

      const online = list.filter((a) => a.status === "online");
      const featured = list.slice(0, 6);

      setOnlineAstrologers(online);
      setFeaturedAstrologers(featured);
    } catch (error) {
      console.error("Error fetching astrologers:", error);
    } finally {
      setFetchingAstrologers(false);
    }
  };

  useEffect(() => {
    fetchAndUpdateAstrologers();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAndUpdateAstrologers, 30000);
    return () => clearInterval(interval);
  }, []);

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
          const r = await fetch("/api/astrologer/top");
          if (r.ok) {
            const data = await r.json();
            if (data && data.success) {
              res = {
                online: data.online || [],
                featured: data.featured || [],
              };
            }
          }
        } catch (err) {
          console.warn("Failed to fetch /api/astrologer/top:", err);
        }

        // Fallback: try astrologyAPI.getTopAstrologers if server API not available
        if (!res && astrologyAPI.getTopAstrologers) {
          try {
            const apiRes = await astrologyAPI.getTopAstrologers();
            res = apiRes || null;
          } catch (e) {
            console.warn("astrologyAPI.getTopAstrologers failed:", e);
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
    } catch { }
    try {
      if (typeof out === "string") out = JSON.parse(out);
    } catch { }

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
        } catch { }
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
      } catch { }

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
      } catch (_) { }

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
      } catch { }

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

  // AI Predictions form handlers
  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        setIsGettingLocation(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Reverse geocode to get location name
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();

            const city = data.address.city || data.address.town || data.address.village || "";
            const country = data.address.country || "";
            const locationString = [city, country].filter(Boolean).join(", ");

            setFormData(prev => ({ ...prev, place: locationString }));
            setShowLocationSuggestions(false);
          } catch (error) {
            console.error("Error reverse geocoding:", error);
            setFormData(prev => ({ ...prev, place: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          }
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please enter it manually.");
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (error) {
      console.error("Error:", error);
      setIsGettingLocation(false);
    }
  };

  const handleLocationSearch = async (query) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
      );
      const data = await response.json();

      const suggestions = data.map(item => ({
        display_name: item.display_name || "",
        city: item.address?.city || item.address?.town || item.address?.village || "",
        country: item.address?.country || "",
        lat: item.lat,
        lon: item.lon,
      }));

      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(true);
    } catch (error) {
      console.error("Error searching locations:", error);
    }
  };

  const handleLocationSelect = (suggestion) => {
    const locationString = [suggestion.city, suggestion.country].filter(Boolean).join(", ");
    setFormData(prev => ({ ...prev, place: locationString || suggestion.display_name }));
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleAIPredictionsSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      alert("Please enter your Name");
      return;
    }
    if (!formData.dob) {
      alert("Please enter your Date of Birth");
      return;
    }
    if (!formData.tob) {
      alert("Please enter your Time of Birth");
      return;
    }
    if (!formData.place || !formData.place.trim()) {
      alert("Please enter your Place of Birth");
      return;
    }
    if (!formData.gender) {
      alert("Please select your Gender");
      return;
    }

    // Store form data in localStorage for prefilling
    try {
      localStorage.setItem("tgs:aiPredictionForm", JSON.stringify(formData));
    } catch (error) {
      console.error("Error saving form data:", error);
    }

    // Navigate to predictions page (fast client-side routing)
    fastNavigate(router, "/predictions");
  };

  // Debounce location search
  useEffect(() => {
    // Don't search on initial load when data is restored from localStorage
    if (!hasInteractedWithLocation.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (formData.place && formData.place.length >= 3) {
        handleLocationSearch(formData.place);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.place]);

  // Load saved form data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tgs:aiPredictionForm");
      if (saved) {
        const parsedData = JSON.parse(saved);
        setFormData(parsedData);
      }
    } catch (error) {
      console.error("Error loading saved form data:", error);
    }
  }, []);

  // Close location suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target)) {
        setShowLocationSuggestions(false);
      }
    };

    if (showLocationSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLocationSuggestions]);

  const handleOptionClick = (optionId) => {
    if (optionId === "tithi-timings") {
      // Redirect to dedicated tithi timings page (fast client-side routing)
      fastNavigate(router, "/tithi-timings");
      return;
    }

    if (optionId === "choghadiya-timings") {
      // Redirect to dedicated choghadiya timings page (fast client-side routing)
      fastNavigate(router, "/choghadiya-timings");
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
    // Redirect to AI Prediction page (fast client-side routing)
    fastNavigate(router, `/ai-prediction?${qs}`);
  };

  // Review Modal Handlers
  const handleOpenReview = (astrologer) => {
    if (!!connectingCallType) return;
    const userId = localStorage.getItem("tgs:userId");
    if (!userId) {
      alert("Please log in to leave a review.");
      router.push("/auth/user");
      return;
    }
    setSelectedAstrologerForReview(astrologer);
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });

      if (!res.ok) throw new Error("Failed to submit review");

      const data = await res.json();
      if (data.success) {
        alert("Review submitted successfully!");
        setIsReviewModalOpen(false);
        // Refresh astrologer data
        fetchAndUpdateAstrologers();
      } else {
        throw new Error(data.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };

  // Call functionality
  const startCall = async (type, astrologerId) => {
    if (!!connectingCallType) return;
    setLoading(true);

    try {
      const userId = localStorage.getItem("tgs:userId");
      if (!userId) {
        alert("Please log in to make a call.");
        router.push("/auth/user");
        setLoading(false);
        return;
      }

      setConnectingCallType(type);

      /* ---- Check astrologer status ---- */
      const statusRes = await fetch(
        `/api/astrologer/status?astrologerId=${astrologerId}`
      );
      const { success, status } = await statusRes.json();

      if (!success) throw new Error("Cannot check astrologer status.");
      if (status === "offline") throw new Error("Astrologer is offline.");
      if (status === "busy" && !confirm("Astrologer is busy. Join queue?")) {
        setConnectingCallType(null);
        setLoading(false);
        return;
      }

      /* ---- Create call ---- */
      const callRes = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-call",
          astrologerId,
          userId,
          callType: type,
        }),
      });
      if (!callRes.ok) throw new Error("Failed to create call.");
      const { call } = await callRes.json();

      localStorage.setItem("tgs:callId", call.id);
      localStorage.setItem("tgs:currentCallId", call.id);
      localStorage.setItem("tgs:astrologerId", astrologerId);

      /* ---- Initialize billing ---- */
      await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize-call",
          callId: call.id,
          userId,
          astrologerId,
        }),
      }).catch(() => { });

      /* ---- Poll for call status ---- */
      let timeoutId;
      const poll = setInterval(async () => {
        const sRes = await fetch(`/api/calls?astrologerId=${astrologerId}`);
        const sData = await sRes.json();
        const c = sData.calls?.find((c) => c.id === call.id);

        if (c?.status === "active") {
          clearInterval(poll);
          clearTimeout(timeoutId);
          const sessRes = await fetch("/api/livekit/create-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              astrologerId,
              userId,
              callId: call.id,
              roomName: c.roomName,
              callType: type,
              role: "user",
              displayName: "User",
            }),
          });
          if (sessRes.ok) {
            const { roomName } = await sessRes.json();
            setConnectingCallType(null);
            setLoading(false);
            router.push(
              type === "video"
                ? `/talk-to-astrologer/room/${roomName}`
                : `/talk-to-astrologer/voice/${roomName}`
            );
          } else {
            setConnectingCallType(null);
            setLoading(false);
            alert("Failed to join room.");
          }
        } else if (c?.status === "rejected") {
          clearInterval(poll);
          clearTimeout(timeoutId);
          await fetch("/api/billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel-call", callId: call.id }),
          }).catch(() => { });
          setCallStatus("rejected");
          setTimeout(() => {
            setConnectingCallType(null);
            setCallStatus("connecting");
            setLoading(false);
          }, 2000);
        } else if (c?.status === "cancelled") {
          clearInterval(poll);
          clearTimeout(timeoutId);
          setConnectingCallType(null);
          setCallStatus("connecting");
          setLoading(false);
        }
      }, 2000);

      timeoutId = setTimeout(() => {
        clearInterval(poll);
        fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel-call", callId: call.id }),
        }).catch(() => { });
        setConnectingCallType(null);
        setLoading(false);
        alert("Astrologer not responding.");
      }, 60_000);
    } catch (e) {
      console.error(e);
      setConnectingCallType(null);
      setLoading(false);
      alert(e.message || "Call failed.");
    }
  };

  const handleVideoCall = (id) => startCall("video", id);
  const handleVoiceCall = (id) => startCall("voice", id);

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
                  <span>{t.hero.badge}</span>
                </div>

                {/* NEW: Updated headline per request */}
                <h1 className="hero-main-title">
                  {t.hero.title}{" "}
                  <span className="hero-highlight">{t.hero.titleHighlight}</span>
                </h1>

                {/* NEW: Refined subheading */}
                <p className="hero-description">
                  {t.hero.description}
                </p>

                {/* NEW: Pill chips under subheading (Life Insights, Kundali Matching, Panchang Today) */}
                <div className="hero-features-inline" style={{ marginTop: 8 }}>
                  <button
                    className="hero-pill"
                    onClick={() => {
                      // quick link to Life Insights (fast client-side routing)
                      fastNavigate(router, "/predictions");
                    }}
                  >
                    {t.hero.lifeInsights}
                  </button>
                  <button
                    className="hero-pill"
                    onClick={() => {
                      fastNavigate(router, "/matching");
                    }}
                  >
                    {t.hero.kundaliMatching}
                  </button>
                  <button
                    className="hero-pill"
                    onClick={() => {
                      fastNavigate(router, "/panchang/calender");
                    }}
                  >
                    {t.hero.panchangToday}
                  </button>
                </div>

                {/* NEW: Primary CTAs (two main flows only) */}
                <div className="hero-actions">
                  {/* The two new primary CTAs requested */}
                  <button
                    onClick={() => fastNavigate(router, "/talk-to-astrologer")}
                    className="hero-btn hero-btn-primary"
                  >
                    <Star className="hero-btn-icon" />
                    {t.hero.talkToAstrologer}
                  </button>

                  <button
                    onClick={() => fastNavigate(router, "/predictions")}
                    className="hero-btn hero-btn-secondary-gold"
                    type="button"
                  >
                    <Sparkles className="hero-btn-icon" />
                    {t.hero.getAIPredictions}
                  </button>
                </div>

                {/* Subtexts that sit directly below the primary CTAs */}
                <div className="hero-cta-subtexts">
                  <p className="cta-subtext">
                    {t.hero.instantCall}
                  </p>
                  <p className="cta-subtext">{t.hero.preciseInsights}</p>
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
                      <div className="hero-info-label">{t.heroLabels.currentDate}</div>
                      <div className="hero-info-value">{currentDate}</div>
                    </div>
                  </div>

                  <div className="hero-info-card hero-info-card-2">
                    <Moon className="hero-info-icon" />
                    <div className="hero-info-content">
                      <div className="hero-info-label">{t.heroLabels.tithi}</div>
                      <div className="hero-info-value">
                        {panchangData?.tithi || t.heroLabels.loading}
                      </div>
                    </div>
                  </div>

                  <div className="hero-info-card hero-info-card-3">
                    <Star className="hero-info-icon" />
                    <div className="hero-info-content">
                      <div className="hero-info-label">{t.heroLabels.nakshatra}</div>
                      <div className="hero-info-value">
                        {panchangData?.nakshatra || t.heroLabels.loading}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>
          {/* ───────────────────────────── END HERO SECTION ───────────────────────────── */}

          {/* ====== OUR SERVICES OVERVIEW — QUICK NAVIGATION ====== */}
          <section className="max-w-7xl mx-auto mt-16 px-4">
            <div className="text-center mb-10">
              <h2 className="text-4xl text-gold font-bold mb-3">{t.services.sectionTitle}</h2>
              <p className="text-slate-600 text-lg">{t.services.sectionSubtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Service Card 1: Talk to Astrologer */}
              <div
                className="card service-card-gold service-card-content rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => fastNavigate(router, "/talk-to-astrologer")}
              >
                <div className="service-card-icon-wrapper">
                  <div className="service-icon-gold group-hover:scale-110 transition-transform">
                    <Star className="service-icon-svg text-white" />
                  </div>
                </div>
                <h3 className="service-card-title">{t.services.talkToExpert}</h3>
                <p className="service-card-description">{t.services.talkToExpertDesc}</p>
                <div className="service-card-cta">{t.services.talkToExpertCta}</div>
              </div>

              {/* Service Card 2: AI Predictions */}
              <div
                className="card service-card-gold service-card-content rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => document.getElementById('ai-prediction-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div className="service-card-icon-wrapper">
                  <div className="service-icon-gold group-hover:scale-110 transition-transform">
                    <Sparkles className="service-icon-svg text-white" />
                  </div>
                </div>
                <h3 className="service-card-title">{t.services.aiPredictionsTitle}</h3>
                <p className="service-card-description">{t.services.aiPredictionsDesc}</p>
                <div className="service-card-cta">{t.services.aiPredictionsCta}</div>
              </div>

              {/* Service Card 3: Compatibility Check */}
              <div
                className="card service-card-gold service-card-content rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => fastNavigate(router, "/matching")}
              >
                <div className="service-card-icon-wrapper">
                  <div className="service-icon-gold group-hover:scale-110 transition-transform">
                    <svg className="service-icon-svg text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21s-7-4.35-9-7.5A6 6 0 0112 3a6 6 0 019 10.5C19 16.65 12 21 12 21z" />
                    </svg>
                  </div>
                </div>
                <h3 className="service-card-title">{t.services.loveMatch}</h3>
                <p className="service-card-description">{t.services.loveMatchDesc}</p>
                <div className="service-card-cta">{t.services.loveMatchCta}</div>
              </div>

              {/* Service Card 4: Daily Panchang */}
              <div
                className="card service-card-gold service-card-content rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => document.getElementById('panchang-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div className="service-card-icon-wrapper">
                  <div className="service-icon-gold group-hover:scale-110 transition-transform">
                    <Calendar className="service-icon-svg text-white" />
                  </div>
                </div>
                <h3 className="service-card-title">{t.services.dailyPanchang}</h3>
                <p className="service-card-description">{t.services.dailyPanchangDesc}</p>
                <div className="service-card-cta">{t.services.dailyPanchangCta}</div>
              </div>
            </div>
          </section>

          {/* ====== HOW IT WORKS SECTION ====== */}
          <section className="max-w-6xl mx-auto mt-20 px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl text-gold font-bold mb-3">{t.howItWorks.title}</h2>
              <p className="text-slate-600 text-lg">{t.howItWorks.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full how-it-works-step-icon flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.howItWorks.step1Title}</h3>
                  <p className="text-gray-600">{t.howItWorks.step1Desc}</p>
                </div>
                {/* Connector Arrow (hidden on mobile) */}
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 how-it-works-connector"></div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full how-it-works-step-icon flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.howItWorks.step2Title}</h3>
                  <p className="text-gray-600">{t.howItWorks.step2Desc}</p>
                </div>
                {/* Connector Arrow (hidden on mobile) */}
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 how-it-works-connector"></div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full how-it-works-step-icon flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.howItWorks.step3Title}</h3>
                  <p className="text-gray-600">{t.howItWorks.step3Desc}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ====== AI PREDICTION FORM SECTION — VISUALLY MATCHES PROVIDED DESIGN ====== */}
          <section
            id="ai-prediction-section"
            className="max-w-4xl mx-auto mt-12 ai-prediction-form-section rounded-3xl shadow-xl p-6 md:p-10"
            style={{
              background: isCosmic
                ? "rgba(22, 33, 62, 0.85)"
                : "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              border: isCosmic
                ? "1px solid rgba(212, 175, 55, 0.3)"
                : "1px solid rgba(212, 175, 55, 0.2)",
            }}
          >
            {/* header */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,246,230,0.8), rgba(255,247,237,0.6))",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                }}
              >
                <Star className="w-6 h-6 text-amber-500" />
              </div>

              <div>
                <h3 className="text-4xl text-gold">
                  {t.aiForm.title}
                </h3>
                <p className="text-sm" style={{ color: isCosmic ? "rgba(249, 250, 251, 0.8)" : "#6b7280" }}>
                  {t.aiForm.description}
                </p>
              </div>
            </div>

            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-6 ai-prediction-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAIPredictionsSubmit();
              }}
            >
              {/* Name */}
              <div className="flex flex-col ai-form-field">
                <label className="block text-sm font-medium text-gold mb-2 h-5">
                  {t.aiForm.name}
                </label>
                <input
                  className="form-input-field h-12 w-full rounded-2xl border border-slate-200 px-4 shadow-sm"
                  placeholder="e.g., Rajesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <p className="mt-2 text-xs text-gold-dark">
                  {t.aiForm.nameHelper}
                </p>
              </div>

              {/* DOB */}
              <div className="flex flex-col ai-form-field">
                <label className="block text-sm font-medium text-gold mb-2 h-5">
                  {t.aiForm.dob}
                </label>
                <input
                  type="date"
                  className="form-input-field h-12 w-full rounded-2xl border border-slate-200 px-4 shadow-sm appearance-none"
                  placeholder="YYYY-MM-DD"
                  value={formData.dob}
                  onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                  required
                />
                <p className="mt-2 text-xs text-gold-dark">
                  {t.aiForm.dobHelper}
                </p>
              </div>

              {/* Time */}
              <div className="flex flex-col ai-form-field">
                <label className="block text-sm font-medium text-gold mb-2 h-5">
                  {t.aiForm.tob}
                </label>
                <input
                  type="time"
                  className="form-input-field h-12 w-full rounded-2xl border border-slate-200 px-4 shadow-sm appearance-none"
                  placeholder="14:30"
                  value={formData.tob}
                  onChange={(e) => setFormData(prev => ({ ...prev, tob: e.target.value }))}
                  required
                />
                <p className="mt-2 text-xs text-gold-dark">{t.aiForm.tobHelper}</p>
              </div>

              {/* Gender (col 1 of row 2) */}
              <div className="md:col-span-1 flex flex-col ai-form-field">
                <label className="block text-sm font-medium text-gold mb-2 h-5">
                  {t.aiForm.gender}
                </label>

                <div className="h-12 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      className="gender-radio h-4 w-4"
                      checked={formData.gender === "Male"}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    />
                    <span className="text-sm text-gold-dark font-medium">{t.aiForm.male}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      className="gender-radio h-4 w-4"
                      checked={formData.gender === "Female"}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    />
                    <span className="text-sm text-gold-dark font-medium">{t.aiForm.female}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Other"
                      className="gender-radio h-4 w-4"
                      checked={formData.gender === "Other"}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    />
                    <span className="text-sm text-gold-dark font-medium">{t.aiForm.other}</span>
                  </label>
                </div>
              </div>

              {/* Place (col 2 of row 2) */}
              <div className="md:col-span-1 flex flex-col relative ai-form-field">
                {/* label has fixed height to match other labels */}
                <label className="block text-sm font-medium text-gold mb-2 h-5">
                  {t.aiForm.place}
                </label>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      ref={locationInputRef}
                      className="form-input-field h-12 w-full rounded-2xl border border-slate-200 px-4 shadow-sm"
                      placeholder="e.g., Mumbai, India"
                      value={formData.place}
                      onChange={(e) => {
                        hasInteractedWithLocation.current = true;
                        setFormData(prev => ({ ...prev, place: e.target.value }));
                      }}
                      onFocus={() => {
                        hasInteractedWithLocation.current = true;
                        setShowLocationSuggestions(locationSuggestions.length > 0);
                      }}
                      required
                      autoComplete="off"
                    />

                    {/* Location suggestions dropdown */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div
                        className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto"
                        style={{ top: "100%" }}
                      >
                        {locationSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                            onClick={() => handleLocationSelect(suggestion)}
                          >
                            <div className="text-sm font-medium text-slate-900">
                              {suggestion.city || suggestion.display_name?.split(",")[0] || "Unknown Location"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {suggestion.display_name || "No address available"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="h-12 w-12 rounded-xl border border-slate-200 flex items-center justify-center shadow-sm bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Use my location"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                  >
                    {isGettingLocation ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold"></div>
                    ) : (
                      <MapPin className="w-5 h-5 text-gold" />
                    )}
                  </button>
                </div>
              </div>

              {/* CTA (col 3 of row 2) */}
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gold mb-2 h-5 opacity-0">
                  {/* Hidden label for alignment */}
                  Placeholder
                </label>
                <div className="w-full">
                  <button
                    type="submit"
                    className="btn ai-predictions-submit-btn w-full h-12 text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all"
                  >
                    {t.aiForm.submit}
                  </button>
                </div>
              </div>
            </form>

            {/* footer / small note */}
            <div className="mt-6 text-xs" style={{ color: isCosmic ? "rgba(212, 175, 55, 0.8)" : "var(--color-gold-dark)" }}>
              {t.aiForm.footer}
            </div>
          </section>

          {/* ====== Top Astrologers Online / Featured (NEW) ====== */}

          <section className="card mt-12 astrologers-section">
            <div className="astrologers-header p-6 mx-auto flex flex-col items-center text-center gap-6">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-100 to-yellow-50 flex items-center justify-center ring-1 ring-amber-100">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {t.astrologers.title}
                </h2>
              </div>

              <p className="text-gray-800 text-base md:text-lg max-w-3xl" style={{ color: isCosmic ? '#d4af37' : '#1f2937' }}>
                {t.astrologers.description}
                <strong style={{ color: isCosmic ? '#fbbf24' : '#111827' }}> {t.astrologers.available247}</strong> {t.astrologers.instantConsult}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-2xl mt-2">
                <button
                  onClick={() => fastNavigate(router, "/talk-to-astrologer")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'var(--color-gold)' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>{t.astrologers.viewAll}</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => fastNavigate(router, "/auth/astrologer")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-gold text-gray-800 font-semibold shadow-md transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  <span>{t.astrologers.becomeAstrologer}</span>
                  <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {fetchingAstrologers ? (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <div
                  style={{
                    width: "3rem",
                    height: "3rem",
                    border: "3px solid rgba(212, 175, 55, 0.3)",
                    borderTopColor: "#d4af37",
                    borderRadius: "50%",
                    margin: "0 auto 1rem",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <p style={{ color: "#6b7280" }}>Loading astrologers...</p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6"
                role="list"
                aria-label="Top astrologers list"
              >
                {(onlineAstrologers.length > 0
                  ? onlineAstrologers
                  : featuredAstrologers
                ).map((ast) => (
                  <div
                    key={ast.id}
                    className="card astrologer-card"
                    role="listitem"
                    style={{
                      padding: "1.5rem",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 20px rgba(212, 175, 55, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 20px rgba(212, 175, 55, 0.15)";
                    }}
                  >
                    {/* Top Row: Avatar + Name + Info */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "1rem",
                        marginBottom: "1rem",
                        position: "relative",
                        zIndex: 20,
                      }}
                    >
                      {/* Avatar + Online Indicator */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div
                          style={{
                            width: "4rem",
                            height: "4rem",
                            background:
                              "linear-gradient(135deg, #4f46e5, #7c3aed)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "1.25rem",
                          }}
                        >
                          {ast.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            bottom: "-0.25rem",
                            right: "-0.25rem",
                            width: "1.25rem",
                            height: "1.25rem",
                            borderRadius: "50%",
                            border: "2px solid white",
                            background: ast.online || ast.isOnline
                              ? "#10b981"
                              : "var(--color-gray-400)",
                            animation: (ast.online || ast.isOnline) ? "pulse 2s infinite" : "none",
                          }}
                        />
                      </div>

                      {/* Name, Spec, Experience, Rating */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: 700,
                                color: "var(--color-gray-900)",
                                margin: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontFamily: "var(--font-heading)",
                                lineHeight: 1.3,
                              }}
                              title={ast.name}
                            >
                              {ast.name}
                            </h3>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "var(--color-indigo)",
                                margin: "0.125rem 0 0",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontFamily: "var(--font-body)",
                              }}
                              title={ast.specialization ?? "Astrology"}
                            >
                              {ast.specialization ?? "Astrology"}
                            </p>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--color-gray-500)",
                                margin: "0.25rem 0 0",
                                fontWeight: 500,
                                fontFamily: "Courier New, monospace",
                              }}
                            >
                              {ast.experience ?? "Experienced in astrology"}
                            </p>
                          </div>

                          {/* Rating Badge + Review Button */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                background: "var(--color-amber-50)",
                                color: "var(--color-amber-700)",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "9999px",
                                fontFamily: "Courier New, monospace",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Star
                                style={{
                                  width: "0.875rem",
                                  height: "0.875rem",
                                  fill: "#f59e0b",
                                  color: "#f59e0b",
                                }}
                              />
                              {ast.rating ?? 4.7}{" "}
                              <span
                                style={{
                                  color: "var(--color-gray-500)",
                                  marginLeft: "0.125rem",
                                  fontFamily: "Courier New, monospace",
                                }}
                              >
                                ({ast.reviews ?? 0})
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenReview(ast);
                              }}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.75rem",
                                height: "1.75rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                background: "white",
                                color: "#374151",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                            >
                              Review
                            </button>
                          </div>
                        </div>

                        {/* Status and Verified Badges */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          {/* Status Badge */}
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              background: (ast.online || ast.isOnline)
                                ? "#d1fae5"
                                : ast.status === "busy"
                                  ? "#fef3c7"
                                  : "#f3f4f6",
                              color: (ast.online || ast.isOnline)
                                ? "#065f46"
                                : ast.status === "busy"
                                  ? "#92400e"
                                  : "#6b7280",
                              padding: "0.35rem 0.65rem",
                              borderRadius: "9999px",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              border: `1px solid ${(ast.online || ast.isOnline)
                                ? "#6ee7b7"
                                : ast.status === "busy"
                                  ? "#fbbf24"
                                  : "#d1d5db"
                                }`,
                            }}
                          >
                            <div
                              style={{
                                width: "0.5rem",
                                height: "0.5rem",
                                borderRadius: "50%",
                                background: (ast.online || ast.isOnline)
                                  ? "#10b981"
                                  : ast.status === "busy"
                                    ? "#f59e0b"
                                    : "#9ca3af",
                                boxShadow: (ast.online || ast.isOnline)
                                  ? "0 0 6px rgba(16, 185, 129, 0.6)"
                                  : ast.status === "busy"
                                    ? "0 0 6px rgba(245, 158, 11, 0.6)"
                                    : "none",
                                animation: (ast.online || ast.isOnline || ast.status === "busy")
                                  ? "pulse 2s infinite"
                                  : "none",
                              }}
                            />
                            {(ast.online || ast.isOnline) ? "Online" : ast.status === "busy" ? "Busy" : "Offline"}
                          </div>

                          {ast.verified && (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                background: "var(--color-indigo-light)",
                                color: "var(--color-indigo)",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                              }}
                            >
                              ✓ Verified
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    {ast.perMinuteCharge && (
                      <div
                        style={{
                          marginBottom: "0.75rem",
                          position: "relative",
                          zIndex: 20,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "1.125rem",
                            fontWeight: 700,
                            color: "#059669",
                            fontFamily: "Courier New, monospace",
                          }}
                        >
                          ₹{ast.perMinuteCharge}/min
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontFamily: "var(--font-body)",
                        color: "var(--color-gray-600)",
                        marginBottom: "0.75rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        position: "relative",
                        zIndex: 20,
                      }}
                    >
                      {ast.bio ??
                        `Expert in ${ast.specialization ?? "astrology"}`}
                    </p>

                    {/* Languages */}
                    {ast.languages?.length > 0 && (
                      <div
                        style={{
                          marginBottom: "0.75rem",
                          position: "relative",
                          zIndex: 20,
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--color-gray-600)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Speaks:
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.375rem",
                          }}
                        >
                          {ast.languages.map((l, i) => (
                            <span
                              key={l + i}
                              style={{
                                padding: "0.25rem 0.625rem",
                                background: "var(--color-indigo-light)",
                                color: "var(--color-indigo)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                borderRadius: "9999px",
                              }}
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action button – Bottom */}
                    <div
                      style={{
                        display: "flex",
                        marginTop: "auto",
                        position: "relative",
                        zIndex: 30,
                      }}
                    >
                      <button
                        className="btn btn-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fastNavigate(router, `/account/astrologer/${ast.id}`);
                        }}
                        style={{
                          width: "100%",
                          height: "3rem",
                          padding: "0 1.5rem",
                          fontSize: "1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          fontWeight: 600,
                        }}
                        type="button"
                        aria-label={`Connect with ${ast.name}`}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Connect with {ast.name.split(" ")[0]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ====== Partner Matching / Loyalty Detector (UPGRADED) ====== */}
          <section className="mt-12">
            <div
              role="region"
              aria-labelledby="loyalty-title"
              className="max-w-7xl mx-auto bg-gradient-to-br from-white to-indigo-50/40 border border-gray-100 rounded-2xl p-6 md:p-8 shadow-lg flex flex-col md:flex-row gap-6 items-center"
              style={{
                background: isCosmic
                  ? "rgba(22, 33, 62, 0.85)"
                  : undefined,
                borderColor: isCosmic
                  ? "rgba(212, 175, 55, 0.3)"
                  : undefined,
              }}
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
                  <h3 id="loyalty-title" className="text-4xl text-gold">
                    {t.compatibility.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    {t.compatibility.description}
                  </p>

                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    <li className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-50 text-emerald-600 font-semibold" style={{
                        background: isCosmic ? "rgba(16, 185, 129, 0.2)" : undefined,
                        color: isCosmic ? "#10b981" : undefined
                      }}>
                        ✓
                      </span>
                      {t.compatibility.quickResults}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-50 text-amber-600 font-semibold" style={{
                        background: isCosmic ? "rgba(212, 175, 55, 0.2)" : undefined,
                        color: isCosmic ? "#d4af37" : undefined
                      }}>
                        ★
                      </span>
                      {t.compatibility.learnKoot}
                    </li>
                  </ul>

                  <p className="mt-3 text-xs text-slate-500" style={{ color: isCosmic ? "rgba(212, 175, 55, 0.8)" : undefined }}>
                    {t.compatibility.prefillNote}
                  </p>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="flex-shrink-0 flex flex-col items-stretch gap-3">
                <button
                  type="button"
                  onClick={() => fastNavigate(router, "/matching")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold shadow-md hover:scale-[1.01] active:translate-y-0.5 transition transform"
                  aria-label="Check compatibility now — go to matching page"
                  style={{
                    backgroundColor: isCosmic ? "rgba(22, 33, 62, 0.9)" : "var(--color-gold)",
                    color: isCosmic ? "#d4af37" : "white",
                    borderColor: isCosmic ? "rgba(212, 175, 55, 0.3)" : "transparent",
                    borderWidth: isCosmic ? "1px" : "0",
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isCosmic ? "#d4af37" : "currentColor"}
                    strokeWidth="1.5"
                    aria-hidden="true"
                    style={{ color: isCosmic ? "#d4af37" : "currentColor" }}
                  >
                    <path d="M20.8 7.2a4.6 4.6 0 00-6.5 0L12 9.5l-2.3-2.3a4.6 4.6 0 10-6.5 6.5L12 22l8.8-8.8a4.6 4.6 0 000-6z" />
                  </svg>
                  {t.compatibility.checkNow}
                </button>
              </div>
            </div>
          </section>

          {/* Main content sections wrapper */}
          <div className="content-sections-wrapper">
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

            {/* PANCHANG GRID (Auspicious/Inauspicious moved to full Panchang page) */}
            <section className="mt-12" id="panchang-section">
              <div
                role="region"
                aria-labelledby="panchang-title"
                className="max-w-7xl mx-auto bg-gradient-to-br from-white to-blue-50/40 border border-gray-100 rounded-2xl p-6 md:p-8 shadow-lg"
                style={{
                  background: isCosmic
                    ? "rgba(22, 33, 62, 0.85)"
                    : undefined,
                  borderColor: isCosmic
                    ? "rgba(212, 175, 55, 0.3)"
                    : undefined,
                }}
              >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
                  {/* Left: icon + copy */}
                  <div className="flex items-start gap-4 md:gap-6 flex-1">
                    <div
                      className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-tr from-blue-100 to-indigo-50 ring-1 ring-blue-100"
                      aria-hidden="true"
                    >
                      <Calendar className="w-8 h-8 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <h3 id="panchang-title" className="text-4xl text-gold">
                        {selectedDate === new Date().toISOString().split("T")[0]
                          ? t.panchang.title
                          : `${t.panchang.titleFor} ${new Date(selectedDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )}`}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                        {t.panchang.description}
                      </p>

                      {/* Date Selector */}
                      <div
                        className={`mt-4 inline-flex items-center gap-3 px-5 py-2.5 rounded-full border shadow-sm ${isCosmic
                          ? "bg-gradient-to-r from-yellow-500/10 via-yellow-400/10 to-yellow-500/10 border-yellow-500/30"
                          : "bg-gradient-to-r from-gold/5 via-gold/10 to-gold/5 border-gold/30"
                          }`}
                      >
                        <Calendar className={`w-4 h-4 ${isCosmic ? "text-yellow-400" : "text-gold"}`} />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className={`appearance-none bg-transparent border-none outline-none text-center text-sm font-medium cursor-pointer transition-colors ${isCosmic
                            ? "text-yellow-100 hover:text-yellow-300 placeholder-yellow-200/50"
                            : "text-gray-700 hover:text-gold"
                            }`}
                          style={{
                            colorScheme: isCosmic ? "dark" : "light",
                            background: 'transparent'
                          }}
                        />
                      </div>

                      <p className="mt-3 text-xs text-slate-500" style={{ color: isCosmic ? "rgba(212, 175, 55, 0.8)" : undefined }}>
                        {t.panchang.selectDateHelper}
                      </p>
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <div className="flex-shrink-0 flex flex-col items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => fastNavigate(router, "/panchang")}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold shadow-md hover:scale-[1.01] active:translate-y-0.5 transition transform"
                      aria-label="View full Panchang details"
                      style={{
                        backgroundColor: isCosmic ? "rgba(22, 33, 62, 0.9)" : "var(--color-gold)",
                        color: isCosmic ? "#d4af37" : "white",
                        borderColor: isCosmic ? "rgba(212, 175, 55, 0.3)" : "transparent",
                        borderWidth: isCosmic ? "1px" : "0",
                      }}
                    >
                      <Calendar className="w-4 h-4" style={{ color: isCosmic ? "#d4af37" : "currentColor" }} />
                      {t.panchang.viewFull}
                    </button>
                  </div>
                </div>

                {/* Panchang Details Cards - All cards inside the same container */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {panchangItems.map((item, i) => (
                      <PanchangCard
                        key={i}
                        label={item.label}
                        value={item.value}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ASTROLOGY OPTIONS GRID */}
            <section className="mt-12" id="astrology-options">
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-50 flex items-center justify-center ring-1 ring-purple-100">
                      <Star className="w-6 h-6 text-purple-600" />
                    </div>
                    <h2 className="text-4xl font-bold text-gold" style={{ fontFamily: 'var(--font-heading)' }}>
                      {t.tools.title}
                    </h2>
                  </div>
                  <p className="text-slate-600 text-lg max-w-3xl mx-auto">
                    {t.tools.description}
                  </p>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {astrologyOptions.map((option) => (
                    <AstrologyOptionCard
                      key={option.id}
                      option={option}
                      onClick={handleOptionClick}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* FOOTER */}
          <footer className="home-footer">
            <p>
              {t.footer.madeBy} ✨ by <span className="footer-brand">{t.footer.team}</span> - <span className="text-gold font-semibold">{t.footer.company}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              🌟 {t.footer.tagline}
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

      {/* REVIEW MODAL */}
      {isReviewModalOpen && selectedAstrologerForReview && (
        <ReviewModal
          open={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedAstrologerForReview(null);
          }}
          astrologerId={selectedAstrologerForReview.id}
          astrologerName={selectedAstrologerForReview.name}
          onSubmit={handleSubmitReview}
        />
      )}

      {/* CALL CONNECTING NOTIFICATION */}
      {connectingCallType && (
        <CallConnectingNotification
          callType={connectingCallType}
          status={callStatus}
          onCancel={async () => {
            const callId = localStorage.getItem("tgs:currentCallId");
            if (callId) {
              await fetch("/api/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel-call", callId }),
              }).catch(() => { });

              await fetch("/api/calls", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callId,
                  status: "cancelled",
                }),
              }).catch(() => { });
            }
            setConnectingCallType(null);
            setCallStatus("connecting");
            setLoading(false);
          }}
        />
      )}
    </>
  );
}
