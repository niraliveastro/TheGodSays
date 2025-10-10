"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from "@/lib/api"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts"

export default function MatchingPage() {
  const [female, setFemale] = useState({ dob: "", tob: "", place: "" })
  const [male, setMale] = useState({ dob: "", tob: "", place: "" })

  const [fCoords, setFCoords] = useState(null) // { latitude, longitude, label }
  const [mCoords, setMCoords] = useState(null)
  const [fSuggest, setFSuggest] = useState([])
  const [mSuggest, setMSuggest] = useState([])
  const fTimer = useRef(null)
  const mTimer = useRef(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)
  const [fDetails, setFDetails] = useState(null)
  const [mDetails, setMDetails] = useState(null)
  const [mounted, setMounted] = useState(false)

  // Chart: viewport-based sizes for alignment and responsiveness
  const [vw, setVw] = useState(1024)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Track viewport width for responsive chart sizing
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setVw(window.innerWidth || 1024)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Simple completion meter for micro-feedback
  const countFilled = (p) => [p.dob, p.tob, p.place].filter(Boolean).length
  const fFilled = countFilled(female)
  const mFilled = countFilled(male)

  function onChangePerson(setter, coordsSetter, suggestSetter, timerRef, key) {
    return (e) => {
      const v = e.target.value
      setter((prev) => ({ ...prev, [key]: v }))
      if (key === "place") {
        coordsSetter(null)
        // Debounced suggestions
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(async () => {
          if (!v || v.length < 2) {
            suggestSetter([])
            return
          }
          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(v)}`
            const res = await fetch(url, { headers: { "Accept-Language": "en" } })
            const arr = await res.json()
            suggestSetter(
              (arr || []).map((it) => ({ label: it.display_name, latitude: parseFloat(it.lat), longitude: parseFloat(it.lon) }))
            )
          } catch {
            suggestSetter([])
          }
        }, 250)
      }
    }
  }

  function parseDateTime(dob, tob) {
    const [Y, M, D] = String(dob).split("-").map((n) => parseInt(n, 10))
    const [H, Min, S = 0] = String(tob).split(":").map((n) => parseInt(n, 10))
    return { year: Y, month: M, date: D, hours: H, minutes: Min, seconds: S }
  }

  async function ensureCoords(person, coords) {
    if (coords && coords.latitude && coords.longitude) return coords
    if (!person.place) return null
    return geocodePlace(person.place)
  }

  async function buildPayload() {
    const fC = await ensureCoords(female, fCoords)
    const mC = await ensureCoords(male, mCoords)
    if (!fC || !mC) throw new Error("Please pick/place valid locations for both.")

    const fTz = await getTimezoneOffsetHours(fC.latitude, fC.longitude)
    const mTz = await getTimezoneOffsetHours(mC.latitude, mC.longitude)

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
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError("")
    setResult(null)
    setFDetails(null)
    setMDetails(null)
    if (!female.dob || !female.tob || !female.place || !male.dob || !male.tob || !male.place) {
      setError("Please complete all fields for both.")
      return
    }
    setSubmitting(true)
    try {
      const payload = await buildPayload()
      const res = await astrologyAPI.getSingleCalculation("match-making/ashtakoot-score", payload)
      const out = typeof res?.output === "string" ? JSON.parse(res.output) : (res?.output || res)
      setResult(out)

      // Build individual payloads for per-person APIs
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
      })

      const fPayload = mkSinglePayload(payload.female)
      const mPayload = mkSinglePayload(payload.male)

      // Fetch planets, vimsottari and shadbala for both
      const endpoints = [
        'shadbala/summary',
        'vimsottari/dasa-information',
        'vimsottari/maha-dasas',
        'planets',
      ]

      const [fCalc, mCalc] = await Promise.all([
        astrologyAPI.getMultipleCalculations(endpoints, fPayload),
        astrologyAPI.getMultipleCalculations(endpoints, mPayload),
      ])

      const safeParse = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return v } }

      const parseShadbala = (raw) => {
        if (!raw) return null
        let sb = safeParse(safeParse(raw.output ?? raw))
        if (sb && typeof sb === 'object' && sb.output) sb = safeParse(sb.output)
        return sb
      }

      const parseMaha = (raw) => {
        if (!raw) return null
        let v = safeParse(safeParse(raw.output ?? raw))
        if (v && typeof v === 'object' && v.output) v = safeParse(v.output)
        return v
      }

      const parsePlanets = (raw) => safeParse(safeParse(raw?.output ?? raw))

      const currentDashaChain = (v) => {
        if (!v) return null
        const cur = v.current || v.running || v.now || v?.mahadasha?.current
        if (cur && (cur.md || cur.mahadasha)) {
          const md = cur.md || cur.mahadasha
          const ad = cur.ad || cur.antardasha
          const pd = cur.pd || cur.pratyantar
          return [md, ad, pd].filter(Boolean).map((x) => (x.name || x.planet || x).toString().trim()).join(' > ')
        }
        const md = (v.mahadasha_list || v.mahadasha || v.md || [])[0]
        const adList = v.antardasha_list || v.antardasha || v.ad || {}
        const firstMdKey = md?.key || md?.planet || md?.name
        const ad = Array.isArray(adList[firstMdKey]) ? adList[firstMdKey][0] : Array.isArray(adList) ? adList[0] : null
        const pdList = v.pratyantar_list || v.pd || {}
        const firstAdKey = ad?.key || ad?.planet || ad?.name
        const pd = Array.isArray(pdList[firstAdKey]) ? pdList[firstAdKey][0] : Array.isArray(pdList) ? pdList[0] : null
        return [md?.name || md?.planet, ad?.name || ad?.planet, pd?.name || pd?.planet].filter(Boolean).join(' > ')
      }

      const toShadbalaRows = (sb) => {
        if (!sb) return []
        if (sb && typeof sb === 'object') {
          const out = sb.output ?? sb.Output ?? sb.data
          if (out) sb = typeof out === 'string' ? safeParse(out) : out
        }
        if (Array.isArray(sb)) sb = sb.reduce((acc, it) => (typeof it === 'object' ? { ...acc, ...it } : acc), {})
        const maybePlanets = sb.planets || sb || {}
        return Object.keys(maybePlanets)
          .filter((k) => typeof maybePlanets[k] === 'object')
          .map((k) => {
            const p = maybePlanets[k]
            const percent = p.percentage_strength ?? p.percentage ?? p.percent ?? p.shadbala_percent ?? p.strength_percent
            const ishta = p.ishta_phala ?? p.ishta ?? p.ishta_bala ?? p.ishta_percent
            const kashta = p.kashta_phala ?? p.kashta ?? p.kashta_bala ?? p.kashta_percent
            const retro = p.retrograde || p.is_retro
            return { name: (p.name || k), percent, ishta, kashta, retro }
          })
          .sort((a, b) => (Number(b.percent ?? 0) - Number(a.percent ?? 0)))
      }

      const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
      const toPlacements = (pl) => {
        if (!pl) return []
        if (Array.isArray(pl) && pl.length >= 2 && typeof pl[1] === 'object' && !Array.isArray(pl[1])) {
          const map = pl[1]
          return Object.keys(map).map((name) => {
            const v = map[name] || {}
            const signNum = v.current_sign != null ? Number(v.current_sign) : undefined
            const currentSign = signNum ? `${SIGN_NAMES[(signNum - 1) % 12]} (${signNum})` : (v.sign_name || v.sign || v.rashi)
            return {
              name,
              currentSign,
              house: v.house_number,
              retro: (String(v.isRetro).toLowerCase() === 'true') || v.is_retro || v.retrograde || false,
              fullDegree: typeof v.fullDegree === 'number' ? v.fullDegree : (typeof v.longitude === 'number' ? v.longitude : undefined),
              normDegree: typeof v.normDegree === 'number' ? v.normDegree : undefined,
            }
          })
        }
        const arr = Array.isArray(pl) ? pl : (pl.planets || pl.planet_positions || [])
        const list = Array.isArray(arr) ? arr : Object.values(arr || {})
        return list.map((p) => {
          const signNum = p.current_sign != null ? Number(p.current_sign) : undefined
          const currentSign = signNum ? `${SIGN_NAMES[(signNum - 1) % 12]} (${signNum})` : (p.sign || p.rashi || p.sign_name)
          return {
            name: p.name || p.planet,
            currentSign,
            house: p.house || p.house_number,
            retro: p.retrograde || p.is_retro || String(p.isRetro).toLowerCase() === 'true',
            fullDegree: typeof p.fullDegree === 'number' ? p.fullDegree : (typeof p.longitude === 'number' ? p.longitude : undefined),
            normDegree: typeof p.normDegree === 'number' ? p.normDegree : undefined,
          }
        })
      }

      const buildUserDetails = (calc) => {
        const r = calc?.results || {}
        const shadbala = parseShadbala(r['shadbala/summary'])
        const vims = r['vimsottari/dasa-information'] ? safeParse(safeParse(r['vimsottari/dasa-information'].output ?? r['vimsottari/dasa-information'])) : null
        const maha = parseMaha(r['vimsottari/maha-dasas'])
        const planets = parsePlanets(r['planets'])
        return {
          currentDasha: currentDashaChain(vims) || null,
          shadbalaRows: toShadbalaRows(shadbala),
          placements: toPlacements(planets),
        }
      }

      setFDetails(buildUserDetails(fCalc))
      setMDetails(buildUserDetails(mCalc))
    } catch (err) {
      setError(err?.message || "Failed to compute matching score.")
    } finally {
      setSubmitting(false)
    }
  }

  const KOOTS = [
    "varna_kootam",
    "vasya_kootam",
    "tara_kootam",
    "yoni_kootam",
    "graha_maitri_kootam",
    "gana_kootam",
    "rasi_kootam",
    "nadi_kootam",
  ]

  const fmtDate = (iso) => {
    if (!iso) return "—"
    try {
      const [y, m, d] = iso.split("-")
      const dt = new Date(Number(y), Number(m) - 1, Number(d))
      return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    } catch {
      return iso
    }
  }

  const fmtTime = (hms) => {
    if (!hms) return "—"
    try {
      const [h, m, s = 0] = hms.split(":").map((n) => parseInt(n, 10))
      const dt = new Date()
      dt.setHours(h || 0, m || 0, s || 0, 0)
      return dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    } catch {
      return hms
    }
  }

  const kootData = (result ? KOOTS.map((k) => {
    const sec = result?.[k]
    const score = typeof sec?.score === "number" ? sec.score : 0
    const outOf = typeof sec?.out_of === "number" && sec.out_of > 0 ? sec.out_of : 0
    const pct = outOf ? Math.round((score / outOf) * 100) : 0
    return { name: k.replace(/_/g, " "), score, outOf, pct }
  }) : [])

  // Responsive, smaller sizes
  const BAR_W = vw < 640 ? 260 : vw < 1024 ? 320 : 380
  const LINE_W = vw < 640 ? 260 : vw < 1024 ? 320 : 380
  const BAR_H = Math.round(BAR_W * 0.44)
  const LINE_H = Math.round(LINE_W * 0.44)

  // Tiny UI helpers
  const ProgressBar = ({ value = 0, color = 'bg-cyan-500' }) => {
    const v = Math.max(0, Math.min(200, Number(value) || 0)) // allow >100 for strong planets
    const barColor = v >= 120 ? 'bg-emerald-500' : v >= 100 ? 'bg-blue-500' : 'bg-amber-500'
    return (
      <div className="h-2 w-full bg-blue-950/50 rounded-full overflow-hidden">
        <div className={`h-2 ${color || barColor}`} style={{ width: `${Math.min(100, v)}%` }} />
      </div>
    )
  }

  const Badge = ({ children, tone = 'neutral' }) => {
    const tones = {
      neutral: 'bg-blue-900/40 text-blue-100 border border-blue-800',
      info: 'bg-blue-900/40 text-blue-200 border border-blue-800',
      success: 'bg-emerald-900/40 text-emerald-200 border border-emerald-800',
      warn: 'bg-amber-900/40 text-amber-200 border border-amber-800',
    }
    return <span className={`text-[11px] px-2 py-1 rounded-full ${tones[tone] || tones.neutral}`}>{children}</span>
  }

  const PersonDetails = ({ title, d }) => (
    <section className="rounded-xl border border-blue-800 bg-blue-900/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-base text-neutral-200 font-medium">{title}</div>
        <div className="text-xs text-neutral-400">{(d?.placements?.length || 0)} planets</div>
      </div>
      <div className="text-sm text-neutral-400 mb-1">Current Dasha</div>
      <div className="text-base mb-4 text-neutral-100">{d?.currentDasha || '—'}</div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shadbala block */}
        <div>
          <div className="text-base text-blue-200 mb-2 font-medium">Shadbala & Ishta/Kashta</div>
          <div className="space-y-2">
            {(d?.shadbalaRows || []).map((r) => {
              const pct = r?.percent != null ? Number(r.percent) : null
              const ishta = r?.ishta != null ? Number(r.ishta) : null
              const kashta = r?.kashta != null ? Number(r.kashta) : null
              const tone = pct >= 120 ? 'success' : pct >= 100 ? 'info' : 'warn'
              return (
                <div key={`${title}-sb-${r.name}`} className="rounded-lg border border-blue-800 bg-blue-950/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{r.retro ? 'ℝ' : '★'}</span>
                      <span className="text-base text-neutral-100 font-medium">{r.name}</span>
                    </div>
                    <Badge tone={tone}>{pct != null ? `${pct.toFixed(1)} %` : '—'}</Badge>
                  </div>
                  <ProgressBar value={pct ?? 0} />
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-neutral-400 mb-1">Ishta</div>
                      <ProgressBar value={ishta ?? 0} color="bg-emerald-500" />
                      <div className="text-xs text-neutral-500 mt-1">{ishta != null ? `${ishta.toFixed(1)}%` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400 mb-1">Kashta</div>
                      <ProgressBar value={kashta ?? 0} color="bg-rose-500" />
                      <div className="text-xs text-neutral-500 mt-1">{kashta != null ? `${kashta.toFixed(1)}%` : '—'}</div>
                    </div>
                  </div>
                </div>
              )
            })}
            {(!d?.shadbalaRows || d.shadbalaRows.length === 0) && (
              <div className="text-neutral-500 text-sm">No shadbala data</div>
            )}
          </div>
        </div>
        {/* Planet placements block */}
        <div>
          <div className="text-base text-blue-200 mb-2 font-medium">Planet Placements (D1)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(d?.placements || []).map((p) => (
              <div key={`${title}-pl-${p.name}`} className="rounded-lg border border-blue-800 bg-blue-950/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-neutral-100 text-base">{p.name}</div>
                  {p.retro ? (<Badge tone="warn">Retro</Badge>) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge tone="neutral">Sign: {p.currentSign || '—'}</Badge>
                  <Badge tone="info">House: {p.house ?? '—'}</Badge>
                  {typeof p.fullDegree === 'number' && (
                    <Badge tone="neutral">{p.fullDegree.toFixed(2)}°</Badge>
                  )}
                </div>
              </div>
            ))}
            {(!d?.placements || d.placements.length === 0) && (
              <div className="text-neutral-500 text-sm">No planet data</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-3xl font-semibold mb-1 text-center">💞 Match Making</h1>
      <p className="text-gray-600 mb-6 text-center">Enter birth details for both to get Ashtakoot score. Small cues will guide you as you fill the form.</p>

      {error ? (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={onSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 md:p-6 max-w-2xl mx-auto mb-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Female */}
          <div className="relative rounded-xl border border-pink-100 bg-pink-50/40 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">👩 Female</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${fFilled === 3 ? "bg-green-100 text-green-700" : "bg-pink-100 text-pink-700"}`}>{fFilled}/3 filled</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎂 Date of Birth</label>
                <Input type="date" value={female.dob} onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, "dob")} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">⏰ Time of Birth</label>
                <Input type="time" step="1" value={female.tob} onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, "tob")} required />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">📍 Place</label>
                <Input
                  placeholder="City, Country"
                  value={female.place}
                  onChange={onChangePerson(setFemale, setFCoords, setFSuggest, fTimer, "place")}
                  autoComplete="off"
                  required
                />
                {fSuggest.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto animate-fade-in">
                    {fSuggest.map((s, i) => (
                      <button
                        type="button"
                        key={`${s.label}-${i}`}
                        onClick={() => {
                          setFemale((p) => ({ ...p, place: s.label }))
                          setFCoords(s)
                          setFSuggest([])
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-pink-50 text-sm"
                      >
                        <span className="mr-2">🗺️</span>{s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Male */}
          <div className="relative rounded-xl border border-blue-100 bg-blue-50/40 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">👨 Male</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${mFilled === 3 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{mFilled}/3 filled</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎂 Date of Birth</label>
                <Input type="date" value={male.dob} onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, "dob")} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">⏰ Time of Birth</label>
                <Input type="time" step="1" value={male.tob} onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, "tob")} required />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">📍 Place</label>
                <Input
                  placeholder="City, Country"
                  value={male.place}
                  onChange={onChangePerson(setMale, setMCoords, setMSuggest, mTimer, "place")}
                  autoComplete="off"
                  required
                />
                {mSuggest.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto animate-fade-in">
                    {mSuggest.map((s, i) => (
                      <button
                        type="button"
                        key={`${s.label}-${i}`}
                        onClick={() => {
                          setMale((p) => ({ ...p, place: s.label }))
                          setMCoords(s)
                          setMSuggest([])
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                      >
                        <span className="mr-2">🗺️</span>{s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 justify-end">
          <Button
            type="reset"
            variant="outline"
            onClick={() => { setFemale({ dob: "", tob: "", place: "" }); setMale({ dob: "", tob: "", place: "" }); setFCoords(null); setMCoords(null); setFSuggest([]); setMSuggest([]); setError(""); setResult(null) }}
          >
            🔁 Reset
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={submitting || fFilled < 3 || mFilled < 3}
          >
            {submitting ? "🔮 Calculating…" : "❤️ Get Match Score"}
          </Button>
        </div>
      </form>

      {result && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Dark Dashboard Wrapper */}
          <div className="rounded-2xl border border-gray-200 bg-white text-gray-900 p-6 md:p-7 max-w-2xl mx-auto dark:border-blue-900 dark:bg-blue-950 dark:text-neutral-100">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold">Pro Kundali Match</h2>
            </div>

            {/* Inputs snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-neutral-400 mb-2">Female</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm">{fmtDate(female.dob)}</span>
                  <span className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm">{fmtTime(female.tob)}</span>
                  <span className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm truncate max-w-[240px]" title={female.place}>{female.place || "—"}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 mb-2">Male</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm">{fmtDate(male.dob)}</span>
                  <span className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm">{fmtTime(male.tob)}</span>
                  <span className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm truncate max-w-[240px]" title={male.place}>{male.place || "—"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick Verdict */}
              <section className="lg:col-span-1 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/40">
                <div className="text-base text-blue-800 mb-2 font-medium dark:text-blue-200">Quick Verdict</div>
                <div className="text-5xl md:text-6xl font-extrabold tracking-tight mb-1">
                  {Number(result?.total_score ?? 0)}<span className="text-neutral-500">/{Number(result?.out_of ?? 36)}</span>
                </div>
                <div className="text-sm text-blue-700 mb-2 dark:text-blue-200/80">Ashtakoot Score</div>

                {/* Compact list of Koot names with numbers */}
                <ul className="mt-4 space-y-2 text-base">
                  {KOOTS.map((k) => {
                    const sec = result?.[k]
                    const title = k.replace(/_/g, " ")
                    const val = (sec && typeof sec.score === "number") ? sec.score : "—"
                    return (
                      <li key={k} className="flex items-center justify-between py-1 border-b border-blue-100 last:border-0 dark:border-neutral-800">
                        <span className="text-blue-900 capitalize font-medium dark:text-blue-100">{title}</span>
                        <span className="text-blue-900 font-semibold dark:text-blue-50">{val}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              {/* Koot bars / details */}
              <section className="lg:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/40">
                <div className="text-base text-blue-800 mb-4 font-medium dark:text-blue-200">Koot Breakdown</div>
                <div className="space-y-4">
                  {KOOTS.map((k) => {
                    const sec = result?.[k]
                    const label = k.replace(/_/g, " ")
                    if (!sec || typeof sec.score !== "number" || typeof sec.out_of !== "number" || sec.out_of === 0) {
                      return (
                        <div key={k} className="opacity-90">
                          <div className="flex items-center justify-between mb-2">
                            <span className="capitalize text-base text-blue-900 dark:text-blue-100">{label}</span>
                            <span className="text-sm text-blue-700 dark:text-blue-200/80">No data</span>
                          </div>
                          <div className="h-2 rounded bg-blue-100 dark:bg-blue-950/50" />
                        </div>
                      )
                    }
                    const pct = Math.max(0, Math.min(100, Math.round((sec.score / sec.out_of) * 100)))
                    return (
                      <div key={k}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="capitalize text-base text-blue-900 dark:text-blue-100">{label}</span>
                          <span className="text-sm text-blue-700 dark:text-blue-200/80 font-medium">{sec.score} / {sec.out_of}</span>
                        </div>
                        <div className="h-2 rounded bg-blue-100 dark:bg-blue-950/50 overflow-hidden">
                          <div className="h-full bg-cyan-500" style={{ width: pct + "%" }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>

            {/* Charts */}
            {mounted && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
              {/* Bar chart of raw scores */}
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 min-w-0 dark:border-blue-800 dark:bg-blue-900/40">
                <div className="text-sm text-neutral-400 mb-3">Koot Scores (Bar)</div>
                {kootData.length > 0 ? (
                  <div className="w-full flex justify-center">
                    <div className="max-w-[400px]" style={{ width: BAR_W }}>
                      <BarChart width={BAR_W} height={BAR_H} data={kootData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                        <CartesianGrid stroke="#262626" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={36} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', color: '#E5E7EB' }} />
                        <Bar dataKey="score" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                      </BarChart>
                      </div>
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">No chart data</div>
                )}
              </section>

              {/* Line chart of percentage contribution */}
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 min-w-0 dark:border-blue-800 dark:bg-blue-900/40">
                <div className="text-sm text-neutral-400 mb-3">Koot Percentage (Line)</div>
                {kootData.length > 0 ? (
                  <div className="w-full flex justify-center">
                    <div className="max-w-[400px]" style={{ width: LINE_W }}>
                      <LineChart width={LINE_W} height={LINE_H} data={kootData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                        <CartesianGrid stroke="#262626" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={36} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', color: '#E5E7EB' }} />
                        <Line type="monotone" dataKey="pct" stroke="#A78BFA" strokeWidth={2} dot={false} />
                      </LineChart>
                      </div>
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">No chart data</div>
                )}
              </section>
            </div>
            )}

            {/* Individual Details */}
            {(fDetails || mDetails) && (
              <div className="mt-6 max-w-3xl mx-auto w-full flex items-center justify-center px-3 sm:px-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                  <PersonDetails title="Female Details" d={fDetails} />
                  <PersonDetails title="Male Details" d={mDetails} />
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-end">
              <Button type="button" variant="outline" className="border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800">
                📄 Download PDF
              </Button>
              <Button type="button" className="bg-neutral-100 text-neutral-900 hover:bg-white">
                🔗 Share
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
