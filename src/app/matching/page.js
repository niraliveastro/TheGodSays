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
  const [female, setFemale] = useState({ dob: "", tob: "", place: "" });
  const [male, setMale] = useState({ dob: "", tob: "", place: "" });

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

    if (!female.dob || !female.tob || !female.place || !male.dob || !male.tob || !male.place) {
      setError("Please complete all fields for both.");
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
        config: { observation_point: "geocentric", ayanamsha: "lahiri" },
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
        /* ------------------------------------------------------ */
        /*  Root variables – minimalistic professional palette    */
        /* ------------------------------------------------------ */
        :root {
          --font-body: "Inter", system-ui, sans-serif;
          --font-heading: "Cormorant Garamond", Georgia, serif;

          --c-bg: #fafafa;
          --c-card: #ffffff;
          --c-border: #e2e8f0;
          --c-text: #1a1a1a;
          --c-muted: #64748b;
          --c-primary: #3b82f6;
          --c-success: #10b981;
          --c-warn: #f59e0b;
          --c-danger: #ef4444;
          --c-gold: #d4af37;
          --c-purple: #7c3aed;
          --c-cyan: #22d3ee;
          --c-pink: #ec4899;
        }


        h1, h2, h3, h4 { font-family: var(--font-heading); margin-bottom: .75rem; }
        h1 { font-size: 2.25rem; text-align:center; }
        h2 { font-size: 1.75rem; }
        h3 { font-size: 1.35rem; }

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
        <h1 className="title">Match Making</h1>
        <p className="subtitle">
          Enter birth details for both to get Ashtakoot score.
        </p>
        </header>

        {error && <div className="error">{error}</div>}

        <form onSubmit={onSubmit} className="form-wrapper">
          <div className="form-grid">
            {/* ---------- Female ---------- */}
            <div className="person-box female">
              <div className="person-header">
                <h3>Female</h3>
                <span style={{ fontSize: ".75rem", opacity: .7 }}>
                  {fFilled}/3 filled
                </span>
              </div>

              <div className="field">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={female.dob}
                  onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, "dob")}
                  required
                />
              </div>

              <div className="field">
                <label>Time of Birth</label>
                <input
                  type="time"
                  step="1"
                  value={female.tob}
                  onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, "tob")}
                  required
                />
              </div>

  {/* ---------- Female Place ---------- */}
<div className="field" style={{ position: "relative" }}>
  <label>Place</label>
  <input
    placeholder="City, Country"
    value={female.place}
    onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, "place")}
    autoComplete="off"
    required
    style={{ position: "relative", zIndex: 1 }}
  />
  {fSuggest.length > 0 && (
    <div
      className="suggest-list"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 30,
        maxHeight: "12rem",
        overflowY: "auto",
      }}
    >
      {fSuggest.map((s, i) => (
        <div
          key={`${s.label}-${i}`}
          className="suggest-item"
          onClick={() => {
            setFemale((p) => ({ ...p, place: s.label }));
            setFCoords(s);
            setFSuggest([]);
          }}
        >
          {s.label}
        </div>
      ))}
    </div>
  )}
</div>
            </div>

            {/* ---------- Male ---------- */}
            <div className="person-box male">
              <div className="person-header">
                <h3>Male</h3>
                <span style={{ fontSize: ".75rem", opacity: .7 }}>
                  {mFilled}/3 filled
                </span>
              </div>

              <div className="field">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={male.dob}
                  onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, "dob")}
                  required
                />
              </div>

              <div className="field">
                <label>Time of Birth</label>
                <input
                  type="time"
                  step="1"
                  value={male.tob}
                  onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, "tob")}
                  required
                />
              </div>

<div className="field" style={{ position: "relative" }}>
  <label>Place</label>
  <input
    placeholder="City, Country"
    value={male.place}
    onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, "place")}
    autoComplete="off"
    required
    style={{ position: "relative", zIndex: 1 }}
  />
  {mSuggest.length > 0 && (
    <div
      className="suggest-list"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 30,
        maxHeight: "12rem",
        overflowY: "auto",
      }}
    >
      {mSuggest.map((s, i) => (
        <div
          key={`${s.label}-${i}`}
          className="suggest-item"
          onClick={() => {
            setMale((p) => ({ ...p, place: s.label }));
            setMCoords(s);
            setMSuggest([]);
          }}
        >
          {s.label}
        </div>
      ))}
    </div>
  )}
</div>
            </div>
          </div>

<div className="btn-group">
  <button
    type="reset"
    className="btn btn-reset"
    onClick={() => {
      setFemale({ dob: "", tob: "", place: "" });
      setMale({ dob: "", tob: "", place: "" });
      setFCoords(null);
      setMCoords(null);
      setFSuggest([]);
      setMSuggest([]);
      setError("");
      setResult(null);
      setFDetails(null);
      setMDetails(null);
    }}
  >
    Reset
  </button>

  <button
    type="submit"
    className="btn submit-btn"  
    disabled={submitting || fFilled < 3 || mFilled < 3}
  >
    {submitting ? "Calculating…" : "Get Match Score"}
  </button>
</div>
        </form>

        {/* ---------------------------------------------------------- */}
        {/*  RESULT SECTION                                            */}
        {/* ---------------------------------------------------------- */}
        {result && (
          <div className="result-wrapper">
            <h2>Pro Kundali Match</h2>

            {/* ----- Birth info snapshot ----- */}
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--c-muted)" }}>Female</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".25rem" }}>
                  <span style={{ background: "#1e293b", color: "#e2e8f0", padding: ".25rem .5rem", borderRadius: ".25rem", fontSize: ".875rem" }}>{fmtDate(female.dob)}</span>
                  <span style={{ background: "#1e293b", color: "#e2e8f0", padding: ".25rem .5rem", borderRadius: ".25rem", fontSize: ".875rem" }}>{fmtTime(female.tob)}</span>
                  <span style={{ background: "#1e293b", color: "#e2e8f0", padding: ".25rem .5rem", borderRadius: ".25rem", fontSize: ".875rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={female.place}>{female.place || "—"}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--c-muted)" }}>Male</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".25rem" }}>
                  <span style={{ background: "#1e293b", color: "#e2e8f0", padding: ".25rem .5rem", borderRadius: ".25rem", fontSize: ".875rem" }}>{fmtDate(male.dob)}</span>
                  <span style={{ background: "#1e293b", color: "#e2e8f0", padding: ".25rem .5rem", borderRadius: ".25rem", fontSize: ".875rem" }}>{fmtTime(male.tob)}</span>
                  <span style={{ background: "#1e293b", color: "#e2e8f0", padding: ".25rem .5rem", borderRadius: ".25rem", fontSize: ".875rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={male.place}>{male.place || "—"}</span>
                </div>
              </div>
            </div>

            {/* ----- Quick verdict ----- */}
            <section className="verdict">
              <div className="verdict-score">
                {Number(result?.total_score ?? 0)}
                <span className="verdict-max">/{Number(result?.out_of ?? 36)}</span>
              </div>
              <div style={{ fontSize: ".875rem", marginTop: ".25rem" }}>Ashtakoot Score</div>

              <ul className="koot-list" style={{ marginTop: "1rem" }}>
                {KOOTS.map((k) => {
                  const sec = result?.[k];
                  const title = k.replace(/_/g, " ");
                  const val = typeof sec?.score === "number" ? sec.score : "—";
                  return (
                    <li key={k} className="koot-item">
                      <span style={{ textTransform: "capitalize", fontWeight: "500" }}>{title}</span>
                      <span style={{ fontWeight: "600" }}>{val}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* ----- Koot breakdown (bars) ----- */}
            <section style={{ marginTop: "2rem" }}>
              <h3>Koot Breakdown</h3>
              <div style={{ display: "grid", gap: ".75rem" }}>
                {KOOTS.map((k) => {
                  const sec = result?.[k];
                  const label = k.replace(/_/g, " ");
                  if (!sec || typeof sec.score !== "number" || typeof sec.out_of !== "number" || sec.out_of === 0) {
                    return (
                      <div key={k} style={{ opacity: .7 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".25rem" }}>
                          <span style={{ textTransform: "capitalize" }}>{label}</span>
                          <span style={{ fontSize: ".875rem" }}>No data</span>
                        </div>
                        <div style={{ height: ".5rem", background: "#e2e8f0", borderRadius: ".25rem" }} />
                      </div>
                    );
                  }
                  const pct = Math.round((sec.score / sec.out_of) * 100);
                  return (
                    <div key={k}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".25rem" }}>
                        <span style={{ textTransform: "capitalize" }}>{label}</span>
                        <span style={{ fontSize: ".875rem", fontWeight: "500" }}>{sec.score} / {sec.out_of}</span>
                      </div>
                      <div style={{ height: ".5rem", background: "#e2e8f0", borderRadius: ".25rem", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--c-cyan)", transition: "width .3s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ----- Charts ----- */}
            {mounted && (
              <div className="chart-section">
                {/* Bar chart */}
                <section className="chart-card">
                  <div style={{ marginBottom: ".5rem", fontSize: ".875rem", color: "var(--c-muted)" }}>Koot Scores (Bar)</div>
                  {kootData.length > 0 ? (
                    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                      <div style={{ maxWidth: "400px", width: BAR_W }}>
                        <BarChart width={BAR_W} height={BAR_H} data={kootData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                          <CartesianGrid stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} angle={-30} textAnchor="end" height={36} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }} />
                          <Bar dataKey="score" fill="var(--c-cyan)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "var(--c-muted)" }}>No chart data</div>
                  )}
                </section>

                {/* Line chart */}
                <section className="chart-card">
                  <div style={{ marginBottom: ".5rem", fontSize: ".875rem", color: "var(--c-muted)" }}>Koot Percentage (Line)</div>
                  {kootData.length > 0 ? (
                    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                      <div style={{ maxWidth: "400px", width: LINE_W }}>
                        <LineChart width={LINE_W} height={LINE_H} data={kootData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                          <CartesianGrid stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} angle={-30} textAnchor="end" height={36} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
                          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }} />
                          <Line type="monotone" dataKey="pct" stroke="#a78bfa" strokeWidth={2} dot={false} />
                        </LineChart>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "var(--c-muted)" }}>No chart data</div>
                  )}
                </section>
              </div>
            )}

            {/* ----- Individual details ----- */}
            {(fDetails || mDetails) && (
              <div style={{ marginTop: "2rem", display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                <PersonDetails title="Female Details" d={fDetails} />
                <PersonDetails title="Male Details" d={mDetails} />
              </div>
            )}

            {/* ----- Footer actions ----- */}
            <div style={{ marginTop: "2rem", display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button className="btn btn-reset">Download PDF</button>
              <button className="btn btn-submit">Share</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}