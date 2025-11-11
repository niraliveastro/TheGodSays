"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {Sparkles, Sun, Moon, Orbit, RotateCcw, Calendar, Clock, MapPin, Trash2 } from "lucide-react";
import { IoHeartCircle } from "react-icons/io5";


import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Tiny UI helpers – pure CSS classes                                 */
/* ------------------------------------------------------------------ */
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

const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "badge-neutral",
    info: "badge-info",
    success: "badge-success",
    warn: "badge-warn",
  };
  return <span className={`badge ${tones[tone] || tones.neutral}`}>{children}</span>;
};

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export default function MatchingPage() {
const [female, setFemale] = useState({ fullName: "", dob: "", tob: "", place: "" });
const [male, setMale] = useState({ fullName: "", dob: "", tob: "", place: "" });


  const [fCoords, setFCoords] = useState(null);
  const [mCoords, setMCoords] = useState(null);
  const [fSuggest, setFSuggest] = useState([]);
  const [mSuggest, setMSuggest] = useState([]);
  const fTimer = useRef(null);
  const mTimer = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [fDetails, setFDetails] = useState(null);
  const [mDetails, setMDetails] = useState(null);
  const [mounted, setMounted] = useState(false);
    // === Matching History ===
  const MATCHING_HISTORY_KEY = "matching_history_v1";
  const [history, setHistory] = useState([]);

  const getHistory = () => {
    try {
      const stored = localStorage.getItem(MATCHING_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveToHistory = (entry) => {
    let current = getHistory();
    const key = `${entry.femaleName.toUpperCase()}-${entry.maleName.toUpperCase()}-${entry.femaleDob}-${entry.maleDob}`;
    current = current.filter(
      (it) =>
        `${it.femaleName.toUpperCase()}-${it.maleName.toUpperCase()}-${it.femaleDob}-${it.maleDob}` !==
        key
    );
    current.unshift(entry);
    if (current.length > 10) current = current.slice(0, 10);
    localStorage.setItem(MATCHING_HISTORY_KEY, JSON.stringify(current));
    setHistory(current);
  };

  const deleteHistoryItem = (id) => {
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(MATCHING_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

  const clearHistory = () => {
    localStorage.removeItem(MATCHING_HISTORY_KEY);
    setHistory([]);
  };

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const [vw, setVw] = useState(1024);

  /* -------------------------------------------------------------- */
  /*  Lifecycle / resize                                            */
  /* -------------------------------------------------------------- */
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setVw(window.innerWidth || 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* -------------------------------------------------------------- */
  /*  Helpers                                                       */
  /* -------------------------------------------------------------- */
  const countFilled = (p) =>
    [p.dob, p.tob, p.place].filter(Boolean).length;
  const fFilled = countFilled(female);
  const mFilled = countFilled(male);

  const onChangePerson = (setter, coordsSetter, suggestSetter, timerRef, key) => (e) => {
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
          const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(v)}`;
          const res = await fetch(url, { headers: { "Accept-Language": "en" } });
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

  const parseDateTime = (dob, tob) => {
    const [Y, M, D] = dob.split("-").map(Number);
    const [H, Min, S = 0] = tob.split(":").map(Number);
    return { year: Y, month: M, date: D, hours: H, minutes: Min, seconds: S };
  };

  const ensureCoords = async (person, coords) => {
    if (coords?.latitude && coords?.longitude) return coords;
    if (!person.place) return null;
    return geocodePlace(person.place);
  };

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
  /*  Submit handler                                                */
  /* -------------------------------------------------------------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setFDetails(null);
    setMDetails(null);

if (
  !female.fullName || !female.dob || !female.tob || !female.place ||
  !male.fullName || !male.dob || !male.tob || !male.place
) {
  setError("Please complete all fields for both individuals, including names.");
  return;
}


    setSubmitting(true);
    try {
      const payload = await buildPayload();
      const res = await astrologyAPI.getSingleCalculation(
        "match-making/ashtakoot-score",
        payload
      );
      const out = typeof res?.output === "string" ? JSON.parse(res.output) : res?.output || res;
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
        "planets",
      ];

      const [fCalc, mCalc] = await Promise.all([
        astrologyAPI.getMultipleCalculations(endpoints, fPayload),
        astrologyAPI.getMultipleCalculations(endpoints, mPayload),
      ]);

      const safeParse = (v) => {
        try { return typeof v === "string" ? JSON.parse(v) : v; }
        catch { return v; }
      };

      const parseShadbala = (raw) => {
        if (!raw) return null;
        let sb = safeParse(safeParse(raw.output ?? raw));
        if (sb && typeof sb === "object" && sb.output) sb = safeParse(sb.output);
        return sb;
      };
      const parseMaha = (raw) => {
        if (!raw) return null;
        let v = safeParse(safeParse(raw.output ?? raw));
        if (v && typeof v === "object" && v.output) v = safeParse(v.output);
        return v;
      };
      const parsePlanets = (raw) => safeParse(safeParse(raw?.output ?? raw));

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
        return [md?.name || md?.planet, ad?.name || ad?.planet, pd?.name || pd?.planet]
          .filter(Boolean)
          .join(" > ");
      };

      const toShadbalaRows = (sb) => {
        if (!sb) return [];
        if (sb && typeof sb === "object") {
          const out = sb.output ?? sb.Output ?? sb.data;
          if (out) sb = typeof out === "string" ? safeParse(out) : out;
        }
        if (Array.isArray(sb)) sb = sb.reduce((acc, it) => (typeof it === "object" ? { ...acc, ...it } : acc), {});
        const maybePlanets = sb.planets || sb || {};
        return Object.keys(maybePlanets)
          .filter((k) => typeof maybePlanets[k] === "object")
          .map((k) => {
            const p = maybePlanets[k];
            const percent = p.percentage_strength ?? p.percentage ?? p.percent ?? p.shadbala_percent ?? p.strength_percent;
            const ishta = p.ishta_phala ?? p.ishta ?? p.ishta_bala ?? p.ishta_percent;
            const kashta = p.kashta_phala ?? p.kashta ?? p.kashta_bala ?? p.kashta_percent;
            const retro = p.retrograde || p.is_retro;
            return { name: (p.name || k), percent, ishta, kashta, retro };
          })
          .sort((a, b) => (Number(b.percent ?? 0) - Number(a.percent ?? 0)));
      };

      const SIGN_NAMES = [
        "Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
      ];
      const toPlacements = (pl) => {
        if (!pl) return [];
        if (Array.isArray(pl) && pl.length >= 2 && typeof pl[1] === "object" && !Array.isArray(pl[1])) {
          const map = pl[1];
          return Object.keys(map).map((name) => {
            const v = map[name] || {};
            const signNum = v.current_sign != null ? Number(v.current_sign) : undefined;
            const currentSign = signNum
              ? `${SIGN_NAMES[(signNum - 1) % 12]} (${signNum})`
              : v.sign_name || v.sign || v.rashi;
            return {
              name,
              currentSign,
              house: v.house_number,
              retro: String(v.isRetro).toLowerCase() === "true" || v.is_retro || v.retrograde || false,
              fullDegree: typeof v.fullDegree === "number" ? v.fullDegree : typeof v.longitude === "number" ? v.longitude : undefined,
              normDegree: typeof v.normDegree === "number" ? v.normDegree : undefined,
            };
          });
        }
        const arr = Array.isArray(pl) ? pl : pl.planets || pl.planet_positions || [];
        const list = Array.isArray(arr) ? arr : Object.values(arr || {});
        return list.map((p) => {
          const signNum = p.current_sign != null ? Number(p.current_sign) : undefined;
          const currentSign = signNum
            ? `${SIGN_NAMES[(signNum - 1) % 12]} (${signNum})`
            : p.sign || p.rashi || p.sign_name;
          return {
            name: p.name || p.planet,
            currentSign,
            house: p.house || p.house_number,
            retro: p.retrograde || p.is_retro || String(p.isRetro).toLowerCase() === "true",
            fullDegree: typeof p.fullDegree === "number" ? p.fullDegree : typeof p.longitude === "number" ? p.longitude : undefined,
            normDegree: typeof p.normDegree === "number" ? p.normDegree : undefined,
          };
        });
      };

      const buildUserDetails = (calc) => {
        const r = calc?.results || {};
        const shadbala = parseShadbala(r["shadbala/summary"]);
        const vims = r["vimsottari/dasa-information"]
          ? safeParse(safeParse(r["vimsottari/dasa-information"].output ?? r["vimsottari/dasa-information"]))
          : null;
        const maha = parseMaha(r["vimsottari/maha-dasas"]);
        const planets = parsePlanets(r["planets"]);
        return {
          currentDasha: currentDashaChain(vims) || null,
          shadbalaRows: toShadbalaRows(shadbala),
          placements: toPlacements(planets),
        };
      };

      setFDetails(buildUserDetails(fCalc));
      setMDetails(buildUserDetails(mCalc));
    } catch (err) {
      setError(err?.message || "Failed to compute matching score.");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Formatting helpers                                            */
  /* -------------------------------------------------------------- */
  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      const [y, m, d] = iso.split("-");
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return iso;
    }
  };
  const fmtTime = (hms) => {
    if (!hms) return "—";
    try {
      const [h, m] = hms.split(":").map(Number);
      const dt = new Date();
      dt.setHours(h || 0, m || 0, 0, 0);
      return dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch {
      return hms;
    }
  };

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

  const kootData = result
    ? KOOTS.map((k) => {
        const sec = result?.[k];
        const score = typeof sec?.score === "number" ? sec.score : 0;
        const outOf = typeof sec?.out_of === "number" && sec.out_of > 0 ? sec.out_of : 0;
        const pct = outOf ? Math.round((score / outOf) * 100) : 0;
        return { name: k.replace(/_/g, " "), score, outOf, pct };
      })
    : [];

  const BAR_W = vw < 640 ? 260 : vw < 1024 ? 320 : 380;
  const LINE_W = vw < 640 ? 260 : vw < 1024 ? 320 : 380;
  const BAR_H = Math.round(BAR_W * 0.44);
  const LINE_H = Math.round(LINE_W * 0.44);

  /* -------------------------------------------------------------- */
  /*  Person details component                                      */
  /* -------------------------------------------------------------- */
  const PersonDetails = ({ title, d }) => (
    <section className="person-card">
      <div className="person-header">
        <div className="person-title">{title}</div>
        <div className="person-planets">{(d?.placements?.length || 0)} planets</div>
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
              const tone = pct >= 120 ? "success" : pct >= 100 ? "info" : "warn";
              return (
                <div key={`${title}-sb-${r.name}`} className="shadbala-item">
                  <div className="shadbala-head">
                    <div className="shadbala-name">
                      <span>{r.retro ? "R" : "Star"}</span>
                      <span>{r.name}</span>
                    </div>
                    <Badge tone={tone}>{pct != null ? `${pct.toFixed(1)} %` : "—"}</Badge>
                  </div>
                  <ProgressBar value={pct ?? 0} />
                  <div className="shadbala-sub">
                    <div>
                      <div className="sub-label">Ishta</div>
                      <ProgressBar value={ishta ?? 0} color="bg-emerald-500" />
                      <div className="sub-value">{ishta != null ? `${ishta.toFixed(1)}%` : "—"}</div>
                    </div>
                    <div>
                      <div className="sub-label">Kashta</div>
                      <ProgressBar value={kashta ?? 0} color="bg-rose-500" />
                      <div className="sub-value">{kashta != null ? `${kashta.toFixed(1)}%` : "—"}</div>
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
                  <div className="placement-name">{p.name}</div>
                  {p.retro && <Badge tone="warn">Retro</Badge>}
                </div>
                <div className="placement-badges">
                  <Badge tone="neutral">Sign: {p.currentSign || "—"}</Badge>
                  <Badge tone="info">House: {p.house ?? "—"}</Badge>
                  {typeof p.fullDegree === "number" && (
                    <Badge tone="neutral">{p.fullDegree.toFixed(2)} degrees</Badge>
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
  /*  Render                                                        */
  /* -------------------------------------------------------------- */
  return (
    <>
      {/* ---------------------------------------------------------- */}
      {/*  INTERNAL CSS (styled-jsx) – completely self-contained    */}
      {/* ---------------------------------------------------------- */}
      <style jsx>{`



        h1, h2, h3, h4 { font-family: var(--font-heading); margin-bottom: .75rem; }


        /* ------------------------------------------------------ */
        /*  Form                                                   */
        /* ------------------------------------------------------ */
        .form-wrapper {
          background: var(--c-card);
          border: 1px solid var(--c-border);
          border-radius: .75rem;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,.05);
          max-width: 720px;
          margin: 2rem auto;
        }

        .form-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .form-grid { grid-template-columns: 1fr 1fr; }
        }

        .person-box {
          border: 1px solid var(--c-border);
          border-radius: .75rem;
          padding: 1rem;
          background: #fdfdfd;
        }
        .person-box.female { border-color: #fbcfe8; background: #fdf2f8; }
        .person-box.male   { border-color: #bfdbfe; background: #eff6ff; }

        .person-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: .75rem;
        }
        .person-title { font-weight: 600; font-size: 1.1rem; }

        .field {
          display: flex;
          flex-direction: column;
          gap: .25rem;
          margin-bottom: .75rem;
        }
        label { font-size: .875rem; font-weight: 500; color: var(--c-muted); }
        input {
          padding: .5rem .75rem;
          border: 1px solid var(--c-border);
          border-radius: .5rem;
          font-size: .95rem;
        }
        input:focus { outline: none; border-color: var(--c-primary); }

        .suggest-list {
          position: absolute;
          z-index: 20;
          width: 100%;
          max-height: 12rem;
          overflow-y: auto;
          background: var(--color-cream);
          border: 1px solid var(--c-border);
          border-radius: .5rem;
          margin-top: .25rem;
          box-shadow: 0 4px 12px rgba(0,0,0,.08);
        }
        .suggest-item {
          padding: .5rem .75rem;
          cursor: pointer;
          font-size: .875rem;
        }
        .suggest-item:hover { background: #f1f5f9; }

        .btn-group {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: nowrap;           /* Prevent wrapping */
  margin-top: 1rem;
}

.btn {

  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;         /* Prevent text wrap */
  min-width: 100px;            /* Optional: consistent width */
  text-align: center;
}

        .btn-reset {
          background: transparent;
          border: 1px solid var(--color-gold);
          }
.btn-reset:hover {
color: #fff;
  background: var(--color-gold);
  border-color: var(--color-gold-dark);
  opacity: 0.8;
}

        .submit-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* ------------------------------------------------------ */
        /*  Results                                                */
        /* ------------------------------------------------------ */
        .result-wrapper {
          max-width: 960px;
          margin: 2rem auto;
          background: var(--c-card);
          border: 1px solid var(--c-border);
          border-radius: .75rem;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,.05);
        }

        .verdict {
          text-align: center;
          padding: 1.5rem;
          background: #eff6ff;
          border-radius: .75rem;
          border: 1px solid #bfdbfe;
        }
        .verdict-score {
          font-size: 3rem;
          font-weight: 800;
          color: var(--c-primary);
        }
        .verdict-max { font-size: 1.5rem; color: var(--c-muted); }

        .koot-list {
          display: grid;
          gap: .5rem;
          margin-top: 1rem;
        }
        .koot-item {
          display: flex;
          justify-content: space-between;
          padding: .5rem 0;
          border-bottom: 1px solid var(--c-border);
        }
        .koot-item:last-child { border-bottom: none; }

        .chart-section {
          margin-top: 2rem;
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .chart-section { grid-template-columns: 1fr 1fr; }
        }
        .chart-card {
          background: #f8fafc;
          border: 1px solid var(--c-border);
          border-radius: .75rem;
          padding: 1rem;
        }

        /* ------------------------------------------------------ */
        /*  Person details card                                    */
        /* ------------------------------------------------------ */
        .person-card {
          background: var(--c-card);
          border: 1px solid var(--c-border);
          border-radius: .75rem;
          padding: 1.25rem;
          margin-top: 1.5rem;
        }
        .person-header { display: flex; justify-content: space-between; margin-bottom: .5rem; }
        .person-title { font-weight: 600; }
        .person-dasha-label { font-size: .8rem; color: var(--c-muted); margin-top: .5rem; }
        .person-dasha { font-weight: 600; margin-bottom: 1rem; }
        .person-grid { display: grid; gap: 1rem; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .person-grid { grid-template-columns: 1fr 1fr; } }

        .section-title { font-weight: 600; margin-bottom: .5rem; color: var(--c-primary); }

        .shadbala-list { display: flex; flex-direction: column; gap: .75rem; }
        .shadbala-item {
          border: 1px solid var(--c-border);
          border-radius: .5rem;
          padding: .75rem;
          background: #f8fafc;
        }
        .shadbala-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
        .shadbala-name { display: flex; gap: .25rem; align-items: center; font-weight: 600; }
        .shadbala-sub { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; margin-top: .5rem; }
        .sub-label { font-size: .75rem; color: var(--c-muted); }
        .sub-value { font-size: .75rem; margin-top: .25rem; }

        .placement-grid { display: grid; gap: .5rem; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
        .placement-item {
          border: 1px solid var(--c-border);
          border-radius: .5rem;
          padding: .5rem;
          background: #f8fafc;
        }
        .placement-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .25rem; }
        .placement-name { font-weight: 600; }
        .placement-badges { display: flex; flex-wrap: wrap; gap: .25rem; }

        .empty { font-size: .875rem; color: var(--c-muted); text-align: center; padding: .5rem; }

        /* ------------------------------------------------------ */
        /*  Progress bar & badge                                   */
        /* ------------------------------------------------------ */
        .progress-wrapper {
          height: .5rem;
          background: #e2e8f0;
          border-radius: .25rem;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          transition: width .3s ease;
        }
        .bg-cyan-500 { background: var(--c-cyan); }
        .bg-emerald-500 { background: var(--c-success); }
        .bg-blue-500 { background: var(--c-primary); }
        .bg-amber-500 { background: var(--c-warn); }
        .bg-rose-500 { background: var(--c-pink); }

        .badge {
          font-size: .6875rem;
          padding: .125rem .375rem;
          border-radius: .25rem;
          font-weight: 500;
        }
        .badge-neutral { background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; }
        .badge-info    { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
        .badge-success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .badge-warn    { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }

        /* ------------------------------------------------------ */
        /*  Misc                                                   */
        /* ------------------------------------------------------ */
        .error { background: #fee2e2; color: var(--c-danger); padding: .75rem; border-radius: .5rem; margin-bottom: 1rem; }

            
         `}</style>

      {/* ---------------------------------------------------------- */}
      {/*  PAGE CONTENT                                              */}
      {/* ---------------------------------------------------------- */}
      <div className="app">

        {/* Orbs */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <header className="header">
        <IoHeartCircle className='headerIcon' style={{ color: 'white', padding:'0.4rem', width: 36, height: 36, }}  />
        <h1 className="title">Match Making</h1>
        <p className="subtitle">
          Enter birth details for both to get Ashtakoot score.
        </p>
        </header>

        {error && <div className="error">{error}</div>}

<form
  onSubmit={onSubmit}
  className="card bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-xl border border-gold/20 max-w-6xl mx-auto"
>
  {/* Header */}
  <div className="form-header">
    <div className="form-header-icon">
      <Moon className="w-6 h-6 text-gold" />
    </div>
    <div className="form-header-text">
      <h3 className="form-title">Birth Details</h3>
      <p className="form-subtitle">Enter birth details for both individuals</p>
    </div>
  </div>

  {/* Grid */}
  <div className="grid md:grid-cols-2 gap-8 mt-4">
    {/* ---------- Female ---------- */}
    <div className="form-section border border-pink-200 bg-pink-50 rounded-2xl p-6">
      <div className="results-header mb-3">
        <Moon style={{ color: '#a78bfa' }} />
        <h3 className="results-title">Female Details</h3>
      </div>

<div className="form-grid-2col">
  {/* Row 1: Full Name + Date */}
  <div className="form-field">
    <label className="form-field-label">
      <Sparkles className="w-5 h-5 text-pink-500" />
      Full Name
    </label>
    <input
      type="text"
      placeholder="Enter full name"
      value={female.fullName}
      onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, 'fullName')}
      required
      className="form-field-input"
    />
  </div>

  <div className="form-field">
    <label className="form-field-label">
      <Calendar className="w-5 h-5 text-pink-500" />
      Date of Birth
    </label>
    <input
      type="date"
      value={female.dob}
      onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, 'dob')}
      required
      className="form-field-input"
    />
    <p className="form-field-helper">Format: YYYY-MM-DD</p>
  </div>

  {/* Row 2: Time + Place */}
  <div className="form-field">
    <label className="form-field-label">
      <Clock className="w-5 h-5 text-pink-500" />
      Time of Birth
    </label>
    <input
      type="time"
      step="60"
      value={female.tob}
      onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, 'tob')}
      required
      className="form-field-input"
    />
    <p className="form-field-helper">24-hour format</p>
  </div>

  <div className="form-field relative">
    <label className="form-field-label">
      <MapPin className="w-5 h-5 text-pink-500" />
      Place
    </label>
    <input
      placeholder="City, Country"
      value={female.place}
      onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, 'place')}
      autoComplete="off"
      required
      className="form-field-input"
    />
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
    <div className="form-section border border-blue-200 bg-blue-50 rounded-2xl p-6">
      <div className="results-header mb-3">
        <Sun style={{ color: '#ca8a04' }} />
        <h3 className="results-title">Male Details</h3>
      </div>

<div className="form-grid-2col">
  {/* Row 1: Full Name + Date */}
  <div className="form-field">
    <label className="form-field-label">
      <Sparkles className="w-5 h-5 text-blue-500" />
      Full Name
    </label>
    <input
      type="text"
      placeholder="Enter full name"
      value={male.fullName}
      onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, 'fullName')}
      required
      className="form-field-input"
    />
  </div>

  <div className="form-field">
    <label className="form-field-label">
      <Calendar className="w-5 h-5 text-blue-500" />
      Date of Birth
    </label>
    <input
      type="date"
      value={male.dob}
      onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, 'dob')}
      required
      className="form-field-input"
    />
    <p className="form-field-helper">Format: YYYY-MM-DD</p>
  </div>

  {/* Row 2: Time + Place */}
  <div className="form-field">
    <label className="form-field-label">
      <Clock className="w-5 h-5 text-blue-500" />
      Time of Birth
    </label>
    <input
      type="time"
      step="60"
      value={male.tob}
      onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, 'tob')}
      required
      className="form-field-input"
    />
    <p className="form-field-helper">24-hour format</p>
  </div>

  <div className="form-field relative">
    <label className="form-field-label">
      <MapPin className="w-5 h-5 text-blue-500" />
      Place
    </label>
    <input
      placeholder="City, Country"
      value={male.place}
      onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, 'place')}
      autoComplete="off"
      required
      className="form-field-input"
    />
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
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: '1rem',
      alignItems: 'end',
      marginTop: '2rem',
    }}
  >
    <div className="submit-col col-span-3">
      <button
        type="submit"
        disabled={submitting || fFilled < 3 || mFilled < 3}
        className="btn btn-primary w-full"
      >
        {submitting ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin mr-2" />
            Calculating…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Get Match Score
          </>
        )}
      </button>
    </div>

    <div className="reset-col col-span-2">
      <button
        type="reset"
        onClick={() => {
          setFemale({ dob: '', tob: '', place: '' });
          setMale({ dob: '', tob: '', place: '' });
          setFCoords(null);
          setMCoords(null);
          setFSuggest([]);
          setMSuggest([]);
          setError('');
          setResult(null);
          setFDetails(null);
          setMDetails(null);
        }}
        className="btn btn-ghost w-full"
      >
        <RotateCcw className="w-4 h-4" /> Reset
      </button>
    </div>
  </div>
</form>

{/* Matching History Table */}
<section className="results-section" style={{ marginTop: "3rem" }}>
  <div className="card">
    <div className="results-header">
      <Sparkles style={{ color: "#ca8a04" }} />
      <h3 className="results-title flex items-center gap-2">
        Matching History
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
      <div className="empty-state">No matching history yet.</div>
    ) : (
      <div className="table-scroll-container">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Female Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Place</th>
              <th>Male Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Place</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td>{item.femaleName}</td>
                <td>{item.femaleDob}</td>
                <td>{item.femaleTob}</td>
                <td>{item.femalePlace}</td>
                <td>{item.maleName}</td>
                <td>{item.maleDob}</td>
                <td>{item.maleTob}</td>
                <td>{item.malePlace}</td>
                <td>
                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    className="delete-btn"
                    aria-label={`Delete ${item.femaleName} & ${item.maleName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</section>


        {/* ---------------------------------------------------------- */}
        {/*  RESULT SECTION                                            */}
        {/* ---------------------------------------------------------- */}
{result && (
  <div className="app fade-in">
    {/* Background Orbs */}
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
    </div>

    {/* Header */}
    <header className="header left-align">
      <h1 className="title">Pro Kundali Match</h1>
    </header>

    {/* Birth Info Snapshot */}
<div className="grid md:grid-cols-2 gap-6 mt-4">
  {/* Female Birth Info */}
  <div className="card">
    <div className="results-header">
      <Moon style={{ color: '#a78bfa' }} />
      <h3 className="results-title">Female Birth Information</h3>
    </div>
    <div className="birth-info-grid">
      {[
        { icon: Sparkles, label: 'Full Name', value: female.fullName || '—' },
        { icon: Calendar, label: 'Date', value: fmtDate(female.dob) },
        { icon: Clock, label: 'Time', value: fmtTime(female.tob) },
        { icon: MapPin, label: 'Place', value: female.place || '—' },
      ].map((item, i) => {
        const Icon = item.icon
        return (
          <div key={i} className="info-card">
            <div className="info-label">
              <Icon />
              {item.label}
            </div>
            <div className="info-value">{item.value}</div>
          </div>
        )
      })}
    </div>
  </div>

  {/* Male Birth Info */}
  <div className="card">
    <div className="results-header">
      <Sun style={{ color: '#ca8a04' }} />
      <h3 className="results-title">Male Birth Information</h3>
    </div>
    <div className="birth-info-grid">
      {[
        { icon: Sparkles, label: 'Full Name', value: male.fullName || '—' },
        { icon: Calendar, label: 'Date', value: fmtDate(male.dob) },
        { icon: Clock, label: 'Time', value: fmtTime(male.tob) },
        { icon: MapPin, label: 'Place', value: male.place || '—' },
      ].map((item, i) => {
        const Icon = item.icon
        return (
          <div key={i} className="info-card">
            <div className="info-label">
              <Icon />
              {item.label}
            </div>
            <div className="info-value">{item.value}</div>
          </div>
        )
      })}
    </div>
  </div>
</div>


    {/* Verdict Card */}
    <div className="card">
      <div className="results-header">
        <Sun style={{ color: '#ca8a04' }} />
        <h3 className="results-title">Ashtakoot Compatibility</h3>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl font-bold text-gold">
          {Number(result?.total_score ?? 0)}
          <span className="text-gray-500 text-xl">/{Number(result?.out_of ?? 36)}</span>
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
        const name = k.replace(/_?kootam/i, "").replace(/_/g, " ").trim();
        const score = typeof sec?.score === "number" ? sec.score : "—";
        const outOf = typeof sec?.out_of === "number" ? sec.out_of : "—";

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
  {/* Charts Section */}
    {mounted && (
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Bar Chart */}
        <div className="card">
          <div className="results-header">
            <Sun style={{ color: '#d4af37' }} />
            <h3 className="results-title">Koot Scores (Bar)</h3>
          </div>
          {kootData.length > 0 ? (
            <div className="flex justify-center">
              <BarChart width={400} height={220} data={kootData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} angle={-30} textAnchor="end" height={36} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <Tooltip
  contentStyle={{
    background: "#ffffff",
    border: "1px solid var(--color-gold)",
    color: "#1f2937",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
    padding: "0.5rem 0.75rem",
  }}
  itemStyle={{
    color: "#1f2937",
    fontWeight: 600,
  }}
  labelStyle={{
    color: "var(--color-gold)",
    fontWeight: 700,
    marginBottom: "0.25rem",
  }}
/>

                <Bar dataKey="score" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </div>
          ) : (
            <div className="empty-state">No chart data</div>
          )}
        </div>

        {/* Line Chart */}
        <div className="card">
          <div className="results-header">
            <Moon style={{ color: '#a78bfa' }} />
            <h3 className="results-title">Koot Percentage (Line)</h3>
          </div>
          {kootData.length > 0 ? (
            <div className="flex justify-center">
              <LineChart width={400} height={220} data={kootData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} angle={-30} textAnchor="end" height={36} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
<Tooltip
  contentStyle={{
    background: "#ffffff",
    border: "1px solid var(--color-gold)",
    color: "#1f2937",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
    padding: "0.5rem 0.75rem",
  }}
  itemStyle={{
    color: "#1f2937",
    fontWeight: 600,
  }}
  labelStyle={{
    color: "var(--color-gold)",
    fontWeight: 700,
    marginBottom: "0.25rem",
  }}
/>
                <Line type="monotone" dataKey="pct" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </div>
          ) : (
            <div className="empty-state">No chart data</div>
          )}
        </div>
      </div>
    )}
    {/* Female and Male Details */}
{(fDetails || mDetails) && (
  <div className="grid md:grid-cols-2 gap-6 mt-8">
    {/* Female Details */}
    <div className="card">
      <div className="results-header">
        <Moon style={{ color: '#a78bfa' }} />
        <h3 className="results-title">Female Details</h3>
      </div>

      {/* Shadbala / Ishta-Kashta */}
      <div className="table-scroll-container">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Strength %</th>
              <th>Ishta %</th>
              <th>Kashta %</th>
            </tr>
          </thead>
          <tbody>
            {(fDetails?.shadbalaRows || []).map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{p.name || '—'}</td>
                <td>{p.percent ? `${p.percent.toFixed(1)}%` : '—'}</td>
                <td>
                  {p.ishta != null ? (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${p.ishta}%` }} />
                      </div>
                      <div className="progress-label">{p.ishta.toFixed(1)}%</div>
                    </div>
                  ) : '—'}
                </td>
                <td>
                  {p.kashta != null ? (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${p.kashta}%` }} />
                      </div>
                      <div className="progress-label">{p.kashta.toFixed(1)}%</div>
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Planet Placements */}
      <div className="mt-6 table-scroll-container">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Sign</th>
              <th>House</th>
              <th>Normal Degree</th>
              <th>Full Degree</th>
              <th>Retro</th>
            </tr>
          </thead>
          <tbody>
            {(fDetails?.placements || [])
              .filter(p => (p.name || '').toLowerCase() !== 'ascendant')
              .map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.currentSign || '—'}</td>
                  <td>{p.house ?? '—'}</td>
                  <td>
                    {typeof p.normDegree === 'number' ? `${p.normDegree.toFixed(2)}°` : '—'}
                  </td>
                  <td>
                    {typeof p.fullDegree === 'number' ? `${p.fullDegree.toFixed(2)}°` : '—'}
                  </td>
                  <td>
                    {p.retro ? (
                      <span style={{ color: '#198754' }}>Retro</span>
                    ) : (
                      <span className="retro-badge">Not Retro</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Male Details */}
    <div className="card">
      <div className="results-header">
        <Sun style={{ color: '#d4af37' }} />
        <h3 className="results-title">Male Details</h3>
      </div>

      {/* Shadbala / Ishta-Kashta */}
      <div className="table-scroll-container">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Strength %</th>
              <th>Ishta %</th>
              <th>Kashta %</th>
            </tr>
          </thead>
          <tbody>
            {(mDetails?.shadbalaRows || []).map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{p.name || '—'}</td>
                <td>{p.percent ? `${p.percent.toFixed(1)}%` : '—'}</td>
                <td>
                  {p.ishta != null ? (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${p.ishta}%` }} />
                      </div>
                      <div className="progress-label">{p.ishta.toFixed(1)}%</div>
                    </div>
                  ) : '—'}
                </td>
                <td>
                  {p.kashta != null ? (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${p.kashta}%` }} />
                      </div>
                      <div className="progress-label">{p.kashta.toFixed(1)}%</div>
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Planet Placements */}
      <div className="mt-6 table-scroll-container">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Sign</th>
              <th>House</th>
              <th>Normal Degree</th>
              <th>Full Degree</th>
              <th>Retro</th>
            </tr>
          </thead>
          <tbody>
            {(mDetails?.placements || [])
              .filter(p => (p.name || '').toLowerCase() !== 'ascendant')
              .map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.currentSign || '—'}</td>
                  <td>{p.house ?? '—'}</td>
                  <td>
                    {typeof p.normDegree === 'number' ? `${p.normDegree.toFixed(2)}°` : '—'}
                  </td>
                  <td>
                    {typeof p.fullDegree === 'number' ? `${p.fullDegree.toFixed(2)}°` : '—'}
                  </td>
                  <td>
                    {p.retro ? (
                      <span style={{ color: '#198754' }}>Retro</span>
                    ) : (
                      <span className="retro-badge">Not Retro</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}



    {/* Footer */}
    <div className="actionBar mt-8">
      <button className="btn btn-ghost"><RotateCcw className="w-4 h-4" /> Reset</button>
      <div className="flex gap-3">
        <button className="btn btn-primary">Download PDF</button>
        <button className="btn btn-primary">Share</button>
      </div>
    </div>
  </div>
)}

      </div>
    </>
  );
}