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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-3xl font-semibold mb-1 text-center">💞 Match Making</h1>
      <p className="text-gray-600 mb-6 text-center">Enter birth details for both to get Ashtakoot score. Small cues will guide you as you fill the form.</p>

      {error ? (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={onSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 md:p-6 max-w-5xl mx-auto mb-8">
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
        <div className="max-w-6xl mx-auto">
          {/* Dark Dashboard Wrapper */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 p-5 md:p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Pro Kundali Match</h2>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Quick Verdict */}
              <section className="lg:col-span-1 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="text-sm text-neutral-400 mb-2">Quick Verdict</div>
                <div className="text-5xl font-extrabold tracking-tight mb-2">
                  {Number(result?.total_score ?? 0)}<span className="text-neutral-500">/{Number(result?.out_of ?? 36)}</span>
                </div>
                <div className="text-xs text-neutral-400">Ashtakoot Score</div>

                {/* Compact list of Koot names with numbers */}
                <ul className="mt-6 space-y-2 text-sm">
                  {KOOTS.map((k) => {
                    const sec = result?.[k]
                    const title = k.replace(/_/g, " ")
                    const val = (sec && typeof sec.score === "number") ? sec.score : "—"
                    return (
                      <li key={k} className="flex items-center justify-between py-1 border-b border-neutral-800 last:border-0">
                        <span className="text-neutral-300 capitalize">{title}</span>
                        <span className="text-neutral-400">{val}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              {/* Koot bars / details */}
              <section className="lg:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="text-sm text-neutral-400 mb-4">Koot Breakdown</div>
                <div className="space-y-4">
                  {KOOTS.map((k) => {
                    const sec = result?.[k]
                    const label = k.replace(/_/g, " ")
                    if (!sec || typeof sec.score !== "number" || typeof sec.out_of !== "number" || sec.out_of === 0) {
                      return (
                        <div key={k} className="opacity-60">
                          <div className="flex items-center justify-between mb-2">
                            <span className="capitalize">{label}</span>
                            <span className="text-xs text-neutral-400">No data</span>
                          </div>
                          <div className="h-2 rounded bg-neutral-800" />
                        </div>
                      )
                    }
                    const pct = Math.max(0, Math.min(100, Math.round((sec.score / sec.out_of) * 100)))
                    return (
                      <div key={k}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="capitalize">{label}</span>
                          <span className="text-xs text-neutral-400">{sec.score} / {sec.out_of}</span>
                        </div>
                        <div className="h-2 rounded bg-neutral-800 overflow-hidden">
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
              <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 min-w-0">
                <div className="text-sm text-neutral-400 mb-3">Koot Scores (Bar)</div>
                {kootData.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <div className="inline-block">
                      <BarChart width={520} height={256} data={kootData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="#262626" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
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
              <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 min-w-0">
                <div className="text-sm text-neutral-400 mb-3">Koot Percentage (Line)</div>
                {kootData.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <div className="inline-block">
                      <LineChart width={520} height={256} data={kootData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="#262626" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} domain={[0, 100]} />
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
