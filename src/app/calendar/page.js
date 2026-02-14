"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import MonthlyCalendar from "@/components/calendar/MonthlyCalendar";
import {
  WEEKDAYS as weekdays,
  staticMonth as staticSep,
} from "@/lib/staticCalendarSep2025";
import astrologyAPI from "@/lib/api";
import { postSamvatInfo, getRealtimeSamvatInfo, geocodePlace } from "@/lib/api";
import PageSEO from "@/components/PageSEO";
import PlaceInputWithSuggestions from "@/components/PlaceInputWithSuggestions";

// Default location: Ujjain (no geolocation permission asked)
const UJJAIN_COORDS = { lat: 23.1765, lon: 75.7885 };

// --- Caching Logic (Unchanged) ---
const monthDataCache = new Map();
const samvatCache = new Map();
const DAY_CACHE_NS = "calendarDayCache_v1";

function readDayCache() {
  try {
    return JSON.parse(localStorage.getItem(DAY_CACHE_NS) || "{}");
  } catch {
    return {};
  }
}
function writeDayCache(obj) {
  try {
    localStorage.setItem(DAY_CACHE_NS, JSON.stringify(obj));
  } catch {}
}
function getDayCacheEntry(key) {
  const all = readDayCache();
  return all[key];
}
function setDayCacheEntry(key, value) {
  const all = readDayCache();
  all[key] = { ...value, savedAt: Date.now() };
  const keys = Object.keys(all);
  if (keys.length > 400) {
    keys.sort((a, b) => (all[a].savedAt || 0) - (all[b].savedAt || 0));
    for (let i = 0; i < keys.length - 400; i++) delete all[keys[i]];
  }
  writeDayCache(all);
}

function monthLabelFrom(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function weekdayName(date) {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  if (year === 2025 && month === 8) {
    const today = new Date();
    const isSameDay = (d) =>
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();

    const rows = staticSep.rows.map((row) =>
      row.map((cell) => {
        const cellDate = new Date(2025, 8 + cell.monthOffset, cell.date);
        const icons = Array.isArray(cell.icons) ? cell.icons : [];
        if (!icons.length) {
          const weekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
          if (weekend && cell.monthOffset === 0) icons.push("party");
          if (cellDate.getDate() === 1 && cell.monthOffset === 0)
            icons.push("calendar");
          if (cellDate.getDate() === 15 && cell.monthOffset === 0)
            icons.push("moon");
          if (!icons.length) icons.push("prayer");
        }
        return { ...cell, isToday: isSameDay(cellDate), icons };
      })
    );

    return { monthLabel: "September 2025", weekStart: 0, rows };
  }

  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date();
  const isSameDay = (d) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const rows = [];
  let dayCounter = 1;
  let nextMonthCounter = 1;

  for (let r = 0; r < 6; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      let dateNum, monthOffset;
      if (r === 0 && c < firstWeekday) {
        dateNum = daysInPrev - (firstWeekday - c - 1);
        monthOffset = -1;
      } else if (dayCounter <= daysInMonth) {
        dateNum = dayCounter++;
        monthOffset = 0;
      } else {
        dateNum = nextMonthCounter++;
        monthOffset = 1;
      }

      const cellDate = new Date(year, month + monthOffset, dateNum);
      const weekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
      const icons = [];
      if (weekend && monthOffset === 0) icons.push("party");
      if (cellDate.getDate() === 1 && monthOffset === 0) icons.push("calendar");
      if (cellDate.getDate() === 15 && monthOffset === 0) icons.push("moon");
      if (!icons.length) icons.push("prayer");

      row.push({
        date: dateNum,
        monthOffset,
        tithiBand: "—",
        sunrise: "—",
        sunset: "—",
        line1: "—",
        line2: "—",
        isFestival: weekend && monthOffset === 0,
        isToday: isSameDay(cellDate),
        icons,
      });
    }
    rows.push(row);
  }

  return { monthLabel: monthLabelFrom(viewDate), weekStart: 0, rows };
}

function buildHeader(viewDate, placeLabel = "Ujjain") {
  return {
    selectedBanner: {
      leftTitle: monthLabelFrom(viewDate),
      leftSubtitle: "Hindu Calendar",
      era: "Vikrama Samvat • Kaliyuga",
      location: placeLabel,
    },
    rightTitle: String(viewDate.getDate()),
    rightSubtitle1: monthLabelFrom(viewDate),
    rightSubtitle2: weekdayName(viewDate),
    ribbons: [],
  };
}

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(new Date());
  const [coords, setCoords] = useState(UJJAIN_COORDS);
  const [placeLabel, setPlaceLabel] = useState("Ujjain");
  const [placeInput, setPlaceInput] = useState("");
  const [placeError, setPlaceError] = useState(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [nakshatraMap, setNakshatraMap] = useState({});
  const [sunMap, setSunMap] = useState({});
  const [tithiMap, setTithiMap] = useState({});
  const [samvat, setSamvat] = useState(null);
  const [samvatLoading, setSamvatLoading] = useState(false);
  const [samvatError, setSamvatError] = useState(null);
  const [samvatRaw, setSamvatRaw] = useState("");

  const header = useMemo(() => buildHeader(viewDate, placeLabel), [viewDate, placeLabel]);
  const headerWithSamvat = useMemo(() => {
    const era = samvat
      ? `Vikrama Samvat ${samvat.number} • ${samvat.yearName}`
      : header.selectedBanner.era;
    const rightExtra = samvat
      ? `V.S. ${samvat.number || ""}${
          samvat.yearName ? ` • ${samvat.yearName}` : ""
        }`.trim()
      : samvatLoading
      ? "Fetching Samvat…"
      : samvatError
      ? samvatRaw
        ? `Samvat? ${samvatRaw}`
        : "Samvat unavailable"
      : header?.selectedBanner?.rightExtra;
    return {
      ...header,
      selectedBanner: { ...header.selectedBanner, era, rightExtra },
    };
  }, [header, samvat, samvatLoading, samvatError]);

  const month = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  // --- Fetch month data using current coords (default Ujjain; no geolocation) ---
  useEffect(() => {
    let cancelled = false;
    const lat = coords.lat;
    const lon = coords.lon;

    async function fetchAll() {
      const tz = -new Date().getTimezoneOffset() / 60;
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const monthKey = `${y}-${m}|${lat.toFixed(3)},${lon.toFixed(3)}|${tz}`;
      const cached = monthDataCache.get(monthKey);
      if (cached && !cancelled) {
        setNakshatraMap(cached.nakshatraMap);
        setSunMap(cached.sunMap);
        setTithiMap(cached.tithiMap);
        return;
      }

      const map = {},
        sun = {},
        tithis = {},
        tasks = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(y, m, day);
        const payload = {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          date: d.getDate(),
          hours: 6,
          minutes: 0,
          seconds: 0,
          latitude: lat,
          longitude: lon,
          timezone: tz,
          config: {
            observation_point: "geocentric",
            ayanamsha: "lahiri",
            lunar_month_definition: "amanta",
          },
        };
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`;
        const locKey = `${lat.toFixed(3)},${lon.toFixed(3)}|${tz}`;
        const dayCacheKey = `${key}|${locKey}`;
        const cachedDay = getDayCacheEntry(dayCacheKey);
        if (cachedDay) {
          if (cachedDay.nakshatra?.name)
            map[key] = { name: cachedDay.nakshatra.name };
          if (cachedDay.tithi?.name)
            tithis[key] = {
              name: cachedDay.tithi.name,
              paksha: cachedDay.tithi.paksha,
            };
          if (cachedDay.sun)
            sun[key] = {
              sunrise: cachedDay.sun.sunrise || "—",
              sunset: cachedDay.sun.sunset || "—",
            };
          continue;
        }

        tasks.push(
          (async (idx) => {
            await new Promise((r) => setTimeout(r, idx * 120));
            try {
              const [nakR, tithiR] = await Promise.allSettled([
                astrologyAPI.getSingleCalculation(
                  "nakshatra-durations",
                  payload
                ),
                astrologyAPI.getSingleCalculation("tithi-durations", payload),
              ]);

              let name = null;
              if (nakR.status === "fulfilled") {
                let out = nakR.value?.output ?? nakR.value;
                try {
                  if (typeof out === "string") out = JSON.parse(out);
                } catch {}
                try {
                  if (typeof out === "string") out = JSON.parse(out);
                } catch {}
                const target = new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate(),
                  6,
                  0,
                  0
                );
                const parseWhen = (v) => {
                  if (!v) return null;
                  const raw = String(v);
                  let normalized = raw
                    .replace(" ", "T")
                    .replace(/\.(\d{1,6})$/, "");
                  const dt = new Date(normalized);
                  if (!isNaN(dt.getTime())) return dt;
                  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                  if (m) {
                    const hh = parseInt(m[1], 10) || 0;
                    const mm = parseInt(m[2], 10) || 0;
                    const ss = parseInt(m[3] || "0", 10) || 0;
                    return new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                      hh,
                      mm,
                      ss
                    );
                  }
                  return null;
                };
                const pickSegmentName = (val) => {
                  if (!val) return null;
                  const list = Array.isArray(val)
                    ? val
                    : typeof val === "object"
                    ? Object.values(val)
                    : [];
                  if (!Array.isArray(list) || !list.length) return null;
                  for (const seg of list) {
                    const st = parseWhen(
                      seg?.starts_at ||
                        seg?.start_time ||
                        seg?.start ||
                        seg?.from
                    );
                    const en = parseWhen(
                      seg?.ends_at || seg?.end_time || seg?.end || seg?.to
                    );
                    if (st && en && st <= target && target <= en) {
                      return (
                        seg?.name || seg?.nakshatra_name || seg?.nakshatra?.name
                      );
                    }
                  }
                  const first = list[0];
                  return (
                    first?.name ||
                    first?.nakshatra_name ||
                    first?.nakshatra?.name ||
                    null
                  );
                };
                name =
                  name ||
                  out?.name ||
                  out?.nakshatra_name ||
                  out?.nakshatra?.name;
                name =
                  name || pickSegmentName(out?.durations || out?.data || out);
              }
              map[key] = name
                ? { name }
                : nakR.status === "rejected"
                ? { error: nakR.reason?.message || "failed" }
                : {};

              if (tithiR.status === "fulfilled") {
                let tout = tithiR.value?.output ?? tithiR.value;
                try {
                  if (typeof tout === "string") tout = JSON.parse(tout);
                } catch {}
                try {
                  if (typeof tout === "string") tout = JSON.parse(tout);
                } catch {}
                const target = new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate(),
                  6,
                  0,
                  0
                );
                const parseWhenT = (v) => {
                  if (!v) return null;
                  const raw = String(v);
                  let normalized = raw
                    .replace(" ", "T")
                    .replace(/\.(\d{1,6})$/, "");
                  const dt = new Date(normalized);
                  if (!isNaN(dt.getTime())) return dt;
                  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                  if (m) {
                    const hh = parseInt(m[1], 10) || 0;
                    const mm = parseInt(m[2], 10) || 0;
                    const ss = parseInt(m[3] || "0", 10) || 0;
                    return new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                      hh,
                      mm,
                      ss
                    );
                  }
                  return null;
                };
                const pickTithi = (val) => {
                  const list = Array.isArray(val)
                    ? val
                    : typeof val === "object"
                    ? Object.values(val)
                    : [];
                  for (const seg of list) {
                    const st = parseWhenT(
                      seg?.starts_at ||
                        seg?.start_time ||
                        seg?.start ||
                        seg?.from
                    );
                    const en = parseWhenT(
                      seg?.ends_at || seg?.end_time || seg?.end || seg?.to
                    );
                    if (st && en && st <= target && target <= en) {
                      const nm =
                        seg?.name || seg?.tithi_name || seg?.tithi?.name;
                      const pk = seg?.paksha || seg?.tithi?.paksha;
                      return { name: nm, paksha: pk };
                    }
                  }
                  const first = list[0] || {};
                  return {
                    name:
                      first?.name || first?.tithi_name || first?.tithi?.name,
                    paksha: first?.paksha || first?.tithi?.paksha,
                  };
                };
                let tval = tout?.name
                  ? { name: tout.name, paksha: tout?.paksha }
                  : pickTithi(tout?.durations || tout?.data || tout);
                if (tval?.name) tithis[key] = tval;
              }

              try {
                const sunData = await astrologyAPI.getSunMoonData(lat, lon, d);
                const astro = sunData?.astronomy || {};
                const fmt = (hhmm) => {
                  if (!hhmm || hhmm === "-:-") return null;
                  try {
                    const [H, M] = String(hhmm)
                      .split(":")
                      .map((v) => parseInt(v, 10));
                    const local = new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                      H || 0,
                      M || 0,
                      0
                    );
                    return local
                      .toLocaleString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .replace(" AM", "AM")
                      .replace(" PM", "PM");
                  } catch {
                    return hhmm;
                  }
                };
                const sunrise = fmt(astro.sunrise);
                const sunset = fmt(astro.sunset);
                if (sunrise || sunset)
                  sun[key] = { sunrise: sunrise || "—", sunset: sunset || "—" };
              } catch (_) {
                sun[key] = { sunrise: "06:00AM", sunset: "06:00PM" };
              }

              setDayCacheEntry(dayCacheKey, {
                nakshatra: map[key]?.name ? { name: map[key].name } : undefined,
                tithi: tithis[key] || undefined,
                sun: sun[key] || undefined,
              });
            } catch (e) {
              if (!map[key]) map[key] = { error: e?.message || "failed" };
            }
          })(day - 1)
        );
      }

      await Promise.all(tasks);
      if (!cancelled) {
        setNakshatraMap(map);
        setSunMap(sun);
        setTithiMap(tithis);
        monthDataCache.set(monthKey, {
          nakshatraMap: map,
          sunMap: sun,
          tithiMap: tithis,
          savedAt: Date.now(),
        });
        if (monthDataCache.size > 8) {
          let oldestKey = null,
            oldestTs = Infinity;
          for (const [k, v] of monthDataCache.entries()) {
            if (v.savedAt < oldestTs) {
              oldestTs = v.savedAt;
              oldestKey = k;
            }
          }
          if (oldestKey) monthDataCache.delete(oldestKey);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [viewDate, coords.lat, coords.lon]);

  useEffect(() => {
    let cancelled = false;
    setSamvatLoading(true);
    setSamvatError(null);
    const lat = coords.lat;
    const lon = coords.lon;

    async function parseSamvat(outLike) {
      let out = outLike;
      try {
        if (typeof out === "string") out = JSON.parse(out);
      } catch {}
      try {
        if (typeof out === "string") out = JSON.parse(out);
      } catch {}
      if (out && typeof out === "object" && out.output) {
        out = out.output;
        try {
          if (typeof out === "string") out = JSON.parse(out);
        } catch {}
        try {
          if (typeof out === "string") out = JSON.parse(out);
        } catch {}
      }
      let number =
        out?.vikram_chaitradi_number ??
        out?.vikram_chaitradi_name_number ??
        out?.vikram_chaitradi?.number ??
        out?.vikrama_samvat_number ??
        out?.vikram_samvat_number ??
        out?.vikrama_samvat?.number;
      let yearName =
        out?.vikram_chaitradi_year_name ??
        out?.vikram_chaitradi?.year_name ??
        out?.vikram_chaitradi_year ??
        out?.vikrama_samvat_year_name ??
        out?.vikram_samvat_year_name ??
        out?.vikrama_samvat?.year_name;

      if ((number == null || yearName == null) && typeof outLike === "string") {
        const s = outLike;
        const nMatch = s.match(
          /\bvikram_chaitradi_(?:number|name_number)\b\s*:\s*(\d{3,4})/i
        );
        const yMatch = s.match(
          /\bvikram_chaitradi_year_name\b\s*:\s*\"?([^\",}]+)\"?/i
        );
        if (nMatch && !number) number = parseInt(nMatch[1], 10);
        if (yMatch && !yearName) yearName = yMatch[1];
      }

      return { number, yearName, raw: out };
    }

    function approxVikramNumber(date) {
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      return y + (m >= 4 ? 57 : 56);
    }

    async function fetchSamvat() {
      const tz = -new Date().getTimezoneOffset() / 60;
      const d = viewDate;
      const payload = {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        date: d.getDate(),
        hours: 6,
        minutes: 0,
        seconds: 0,
        latitude: lat,
        longitude: lon,
        timezone: tz,
        config: {
          observation_point: "topocentric",
          ayanamsha: "lahiri",
          lunar_month_definition: "amanta",
        },
      };

      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      const samvatKey = `${dKey}|${lat.toFixed(3)},${lon.toFixed(3)}|${tz}`;
      const cached = samvatCache.get(samvatKey);
      if (cached && cached.samvat && !cancelled) {
        setSamvat(cached.samvat);
        setSamvatError(null);
        setSamvatLoading(false);
        return;
      }

      try {
        const res = await postSamvatInfo(payload);
        const parsed = await parseSamvat(res?.output ?? res);
        const { number, yearName } = parsed;
        if (!cancelled && (number || yearName)) {
          setSamvat({ number, yearName });
          setSamvatError(null);
          setSamvatRaw("");
          samvatCache.set(samvatKey, {
            samvat: { number, yearName },
            savedAt: Date.now(),
          });
          return;
        }

        const rt = await getRealtimeSamvatInfo();
        const parsedRt = await parseSamvat(rt?.output ?? rt);
        const { number: nR, yearName: yR } = parsedRt;
        if (!cancelled && (nR || yR)) {
          setSamvat({ number: nR, yearName: yR });
          setSamvatError(null);
          setSamvatRaw("");
          samvatCache.set(samvatKey, {
            samvat: { number: nR, yearName: yR },
            savedAt: Date.now(),
          });
          return;
        }

        if (!cancelled) {
          const approx = approxVikramNumber(d);
          setSamvat({ number: approx, yearName: "" });
          setSamvatError("approx");
          const rawStr =
            typeof parsedRt?.raw === "string"
              ? parsedRt.raw
              : JSON.stringify(parsedRt?.raw || parsed?.raw || "").slice(0, 60);
          setSamvatRaw(rawStr);
          samvatCache.set(samvatKey, {
            samvat: { number: approx, yearName: "" },
            savedAt: Date.now(),
          });
        }
      } catch (err) {
        if (!cancelled) {
          const approx = approxVikramNumber(d);
          setSamvat({ number: approx, yearName: "" });
          setSamvatError("approx");
          setSamvatRaw("");
          samvatCache.set(samvatKey, {
            samvat: { number: approx, yearName: "" },
            savedAt: Date.now(),
          });
        }
      }
      if (!cancelled) setSamvatLoading(false);
    }

    fetchSamvat();
    return () => {
      cancelled = true;
    };
  }, [viewDate, coords.lat, coords.lon]);

  const handlePlaceSubmit = async () => {
    const q = (placeInput || "").trim();
    if (!q) return;
    setPlaceLoading(true);
    setPlaceError(null);
    try {
      const result = await geocodePlace(q);
      if (result) {
        setCoords({ lat: result.latitude, lon: result.longitude });
        setPlaceLabel(result.label || q);
      } else {
        setPlaceError("Location not found. Try a different place name.");
      }
    } catch (e) {
      setPlaceError("Could not find location. Try again.");
    } finally {
      setPlaceLoading(false);
    }
  };

  const handlePlaceSelect = (result) => {
    setCoords({ lat: result.latitude, lon: result.longitude });
    setPlaceLabel(result.label || placeInput);
    setPlaceError(null);
  };

  const handlePrev = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const handleNext = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
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

  return (
    <>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap");

        .pageContainer {
          min-height: 100vh;
          background: #f8f5f0;
          padding: 2rem 1rem;
          font-family: "Inter", sans-serif;
        }
        .innerWrapper {
          max-width: 1200px;
          margin: 0 auto;
        }
        .calendarWrapper {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .calendarWrapper:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
        }
        .navContainer {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #fefce8;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }
        .panchang-place-row input,
        .panchang-place-row .btn-primary {
          height: 2.25rem !important;
          min-height: 2.25rem !important;
          box-sizing: border-box;
          line-height: 1.25;
        }
        .panchang-place-row .btn-primary {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .navButton {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #fff;
          border: 1.5px solid #d4af37;
          border-radius: 50%;
          color: #b8972e;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);
        }
        .navButton:hover {
          background: #d4af37;
          color: white;
          transform: scale(1.1);
          box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4);
        }
        .navButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .monthTitle {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #7c2d12;
        }
        .monthlyCalender {
          padding: 1.5rem;
          marging: 0 auto;
        }
      `}</style>

      <div className="pageContainer">
        <div className="innerWrapper">
          <div className="calendarWrapper mb-16">
            <div className="navContainer">
              <div className="panchang-place-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", maxWidth: "min(360px, 100%)", minWidth: 0, flex: "0 1 auto" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <PlaceInputWithSuggestions
                    id="panchang-place"
                    value={placeInput}
                    onChange={(v) => { setPlaceInput(v); setPlaceError(null); }}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="e.g. Mumbai, Delhi"
                    ariaLabel="Location for Panchang"
                    inputStyle={{
                      width: "100%",
                      height: "2.25rem",
                      padding: "0 0.75rem",
                      border: "1px solid rgba(212, 175, 55, 0.4)",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePlaceSubmit}
                  disabled={placeLoading}
                  className="btn-primary"
                  style={{ height: "2.25rem", padding: "0 0.75rem", whiteSpace: "nowrap", fontSize: "0.875rem", flexShrink: 0, boxSizing: "border-box" }}
                >
                  {placeLoading ? "…" : "Update"}
                </button>
              </div>
              <div style={{ width: "100%", maxWidth: "min(360px, 100%)", marginTop: "0.5rem", textAlign: "center" }}>
                {placeError && (
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#b91c1c" }}>{placeError}</p>
                )}
                <p style={{ margin: 0, marginTop: placeError ? "0.25rem" : 0, fontSize: "0.6875rem", color: "#6b7280" }}>
                  Default: Ujjain. Type a city and pick from suggestions.
                </p>
              </div>
            </div>
            <MonthlyCalendar
              header={headerWithSamvat}
              weekdays={weekdays}
              month={month}
              onPrev={handlePrev}
              onNext={handleNext}
              nakshatraMap={nakshatraMap}
              sunMap={sunMap}
              tithiMap={tithiMap}
            />
          </div>

                  <div className="card shadow-xl border ">
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
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      Panchang Calendar – Daily Hindu Panchang with Astrology Insights
    </h1>

    <p className="text-sm mt-1 text-slate-600">
      The Panchang guides daily activities, rituals, and decisions using lunar
      and solar movements.
    </p>

    <div className="flex justify-center mt-4">
      <button className="btn-primary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>View Today’s Panchang</button>
    </div>
  </div>
<Section
  title="What Is Panchang"
  content={[
    "Tithi (lunar day)",
    "Vara (weekday)",
    "Nakshatra (lunar constellation)",
    "Yoga",
    "Karana",
  ]}
>
  Panchang is a traditional Hindu calendar system based on the combined movement
  of the Moon, Sun, and planets. It is used to understand the quality of time on
  a given day and to decide when certain activities are more supportive or less
  favorable.

  Each of the five elements of Panchang reflects a different aspect of time.
  Together, they help explain the natural rhythm of the day, guiding rituals,
  decisions, and important actions with awareness rather than blind belief.
</Section>

<Section
  title="What Our Panchang Calendar Offers"
  content={[
    "Complete daily Panchang information",
    "Festivals, vrat, and important observances",
    "Muhurat and timing guidance",
    "Planetary positions for the day",
    "Clear and simple explanations",
  ]}
>
  Our Panchang calendar is designed for everyday use. Instead of overwhelming
  users with technical terminology, it presents essential information in a
  structured and easy-to-understand format.

  Whether you are checking today’s tithi, planning a ritual, or simply staying
  aware of planetary movements, the focus remains on clarity and usefulness.
</Section>

<Section
  title="Panchang + Astrology for Better Decisions"
  content={[
    "Panchang aligned with daily planetary movements",
    "Checking relevance with your kundli",
    "Guidance focused on timing and preparedness",
  ]}
>
  Panchang shows the nature of time, while astrology shows how that time interacts
  with you personally. When used together, they provide deeper insight into when
  certain actions may feel smoother or more challenging.

  By aligning Panchang details with your birth chart, you gain better awareness
  of whether a particular day or period supports your intentions.
</Section>

<Section
  title="Who Should Use This Panchang"
  content={[
    "Individuals planning important daily activities",
    "Families observing rituals and festivals",
    "Students learning astrology or Panchang basics",
    "NRIs seeking reliable Indian Panchang access",
  ]}
>
  This Panchang is suitable for both regular reference and long-term planning.
  It supports traditional practices while remaining accessible to modern users,
  regardless of location or level of astrological knowledge.
</Section>


  <p className="text-sm mt-6 text-gray-500 text-center mx-auto max-w-2xl">
    Panchang provides traditional guidance and should not replace professional
    advice.
  </p>
  
      {/* SEO: FAQ Schema - Invisible to users */}
      <PageSEO 
        pageType="panchang"
        faqs={[
          {
            question: "What Is Panchang",
            answer: "Panchang is a traditional Hindu calendar system based on the combined movement of the Moon, Sun, and planets. It is used to understand the quality of time on a given day and to decide when certain activities are more supportive or less favorable. Each of the five elements of Panchang reflects a different aspect of time. Together, they help explain the natural rhythm of the day, guiding rituals, decisions, and important actions with awareness rather than blind belief."
          },
          {
            question: "What Our Panchang Calendar Offers",
            answer: "Our Panchang calendar is designed for everyday use. Instead of overwhelming users with technical terminology, it presents essential information in a structured and easy-to-understand format. Whether you are checking today's tithi, planning a ritual, or simply staying aware of planetary movements, the focus remains on clarity and usefulness."
          },
          {
            question: "Panchang + Astrology for Better Decisions",
            answer: "Panchang shows the nature of time, while astrology shows how that time interacts with you personally. When used together, they provide deeper insight into when certain actions may feel smoother or more challenging. By aligning Panchang details with your birth chart, you gain better awareness of whether a particular day or period supports your intentions."
          },
          {
            question: "Who Should Use This Panchang",
            answer: "This Panchang is suitable for both regular reference and long-term planning. It supports traditional practices while remaining accessible to modern users, regardless of location or level of astrological knowledge."
          }
        ]}
      />
</div>
        </div>



      </div>
    </>
  );
}
