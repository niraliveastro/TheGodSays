'use client'

import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from '@/lib/api'
import Modal from '@/components/Modal'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700'] })

export default function PredictionsPage() {
  const [dob, setDob] = useState('') // yyyy-mm-dd
  const [tob, setTob] = useState('') // HH:MM or HH:MM:SS
  const [place, setPlace] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggesting, setSuggesting] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState(null) // { latitude, longitude, label }
  const suggestTimer = useRef(null)

  // Geolocation state
  const [locating, setLocating] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [result, setResult] = useState(null)
  const [selectedMaha, setSelectedMaha] = useState(null)
  // Antar Dasha modal state
  const [antarOpen, setAntarOpen] = useState(false)
  const [antarLoading, setAntarLoading] = useState(false)
  const [antarError, setAntarError] = useState('')
  const [antarRows, setAntarRows] = useState([])

  // Helper function to convert zodiac sign number to name
  const getZodiacSign = (signNumber) => {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 
      'Leo', 'Virgo', 'Libra', 'Scorpio', 
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    return signs[(signNumber - 1) % 12];
  }

  // Reverse geocode for "Use Current Location"
  async function reverseGeocodeCoords(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=0`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      if (!res.ok) throw new Error('Reverse geocoding failed')
      const data = await res.json()
      return data?.display_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`
    } catch {
      return `${lat.toFixed(3)}, ${lon.toFixed(3)}`
    }
  }

  async function useMyLocation() {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    setLocating(true)
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
      })
      const { latitude, longitude } = pos.coords
      const label = await reverseGeocodeCoords(latitude, longitude)
      setPlace(label)
      setSelectedCoords({ latitude, longitude, label })
      setSuggestions([])
    } catch (e) {
      setError('Could not access your location. Please allow permission or type the city manually.')
    } finally {
      setLocating(false)
    }
  }

  function validate() {
    if (!dob) return 'Please enter your Date of Birth.'
    if (!tob) return 'Please enter your Time of Birth.'
    if (!place.trim()) return 'Please enter your Place of Birth.'
    return ''
  }

  const fmtTime = (h, m, s = 0) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  // Format time as HH:MM (used for displaying/storing input without seconds)
  const fmtHM = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  const safeParse = (v) => {
    try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return v }
  }

  // Debounced suggestions from Nominatim
  const fetchSuggestions = (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return }
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    suggestTimer.current = setTimeout(async () => {
      try {
        setSuggesting(true)
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'TheGodSays/1.0 (education)' } })
        const arr = await res.json()
        const opts = (arr || []).map((it) => ({
          label: it.display_name,
          latitude: parseFloat(it.lat),
          longitude: parseFloat(it.lon),
        }))
        setSuggestions(opts)
      } catch {
        setSuggestions([])
      } finally { setSuggesting(false) }
    }, 250)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    try {
      // 1) Geocode place to lat/lon (use chosen suggestion if available)
      const geo = selectedCoords || (await geocodePlace(place))
      if (!geo) throw new Error('Unable to find location. Try a more specific place name (e.g., City, Country).')

      // 2) Extract date/time parts
      const [Y, M, D] = dob.split('-').map((n) => parseInt(n, 10))
      const tparts = tob.split(':').map((n) => parseInt(n, 10))
      const [H, Min, S = 0] = tparts

      // 3) Timezone offset hours for that coordinate
      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude)

      // 4) Build payload
      const payload = {
        year: Y, month: M, date: D,
        hours: H, minutes: Min, seconds: S,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: tz,
        config: {
          observation_point: 'geocentric',
          ayanamsha: 'lahiri',
        },
      }

      // 5) Call required endpoints (proxy hides key)
      const { results, errors } = await astrologyAPI.getMultipleCalculations([
        'shadbala/summary',
        'vimsottari/dasa-information',
        'vimsottari/maha-dasas',
        'planets',
      ], payload)

      // 6) Parse outputs safely
      const vimsRaw = results?.['vimsottari/dasa-information']
      const shadbalaRaw = results?.['shadbala/summary']
      const mahaRaw = results?.['vimsottari/maha-dasas']

      const vimsParsed = vimsRaw ? safeParse(safeParse(vimsRaw.output ?? vimsRaw)) : null
      let mahaParsed = mahaRaw ? safeParse(safeParse(mahaRaw.output ?? mahaRaw)) : null
      if (mahaParsed && typeof mahaParsed === 'object' && mahaParsed.output) {
        mahaParsed = safeParse(mahaParsed.output)
      }
      let shadbalaParsed = shadbalaRaw ? safeParse(safeParse(shadbalaRaw.output ?? shadbalaRaw)) : null
      // If still wrapped, peel one more layer
      if (shadbalaParsed && typeof shadbalaParsed === 'object' && shadbalaParsed.output) {
        shadbalaParsed = safeParse(shadbalaParsed.output)
      }
      try { console.log('[Predictions] Shadbala parsed →', shadbalaParsed) } catch {}

      // 6b) If inner status indicates failure or we got an empty object, retry with fallbacks
      const looksEmpty = !shadbalaParsed || (typeof shadbalaParsed === 'object' && Object.keys(shadbalaParsed).length === 0)
      const innerStatus = (typeof shadbalaParsed === 'object' && typeof shadbalaParsed.statusCode === 'number') ? shadbalaParsed.statusCode : undefined
      let innerError = undefined
      if (typeof shadbalaParsed === 'object' && shadbalaParsed.error) innerError = shadbalaParsed.error

      let finalShadbala = shadbalaParsed
      if (innerStatus && innerStatus !== 200) {
        innerError = `Upstream statusCode ${innerStatus}${innerError ? `: ${innerError}` : ''}`
      }

      if ((innerStatus && innerStatus !== 200) || looksEmpty) {
        // Retry 1: switch observation_point to topocentric
        const altPayload = { ...payload, config: { ...payload.config, observation_point: 'topocentric' } }
        try {
          const alt = await astrologyAPI.getSingleCalculation('shadbala/summary', altPayload)
          let altParsed = safeParse(safeParse(alt.output ?? alt))
          if (altParsed && typeof altParsed === 'object' && altParsed.output) altParsed = safeParse(altParsed.output)
          if (altParsed && Object.keys(altParsed).length) {
            finalShadbala = altParsed
          }
        } catch (e) {
          // ignore, keep previous
        }
      }

      setResult({
        input: { dob, tob: fmtHM(H, Min), place: geo.label || place, tz },
        coords: { latitude: geo.latitude, longitude: geo.longitude },
        configUsed: { observation_point: 'geocentric', ayanamsha: 'lahiri' },
        vimsottari: vimsParsed,
        planets: results?.['planets'] ? safeParse(safeParse(results['planets'].output ?? results['planets'])) : [],
        maha: mahaParsed,
        shadbala: finalShadbala,
        apiErrors: { ...errors, ...(innerError ? { 'shadbala/summary': innerError } : {}) },
      })
    } catch (err) {
      setError(err?.message || 'Failed to compute predictions.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- UI formatting helpers ---
  const currentDashaChain = useMemo(() => {
    const v = result?.vimsottari
    if (!v) return null
    // Try a few structures commonly seen; fall back to first available
    const current = v.current || v.running || v.now || v?.mahadasha?.current
    if (current && (current.md || current.mahadasha)) {
      const md = current.md || current.mahadasha
      const ad = current.ad || current.antardasha
      const pd = current.pd || current.pratyantar
      return [md, ad, pd].filter(Boolean).map((x) => (x.name || x.planet || x).toString().trim()).join(' > ')
    }
    // Fallback: derive first chain from lists
    const md = (v.mahadasha_list || v.mahadasha || v.md || [])[0]
    const adList = v.antardasha_list || v.antardasha || v.ad || {}
    const firstMdKey = md?.key || md?.planet || md?.name
    const ad = Array.isArray(adList[firstMdKey]) ? adList[firstMdKey][0] : Array.isArray(adList) ? adList[0] : null
    const pdList = v.pratyantar_list || v.pd || {}
    const firstAdKey = ad?.key || ad?.planet || ad?.name
    const pd = Array.isArray(pdList[firstAdKey]) ? pdList[firstAdKey][0] : Array.isArray(pdList) ? pdList[0] : null
    return [md?.name || md?.planet, ad?.name || ad?.planet, pd?.name || pd?.planet].filter(Boolean).join(' > ')
  }, [result])

  // Build payload for API from saved result.input/coords
  function buildPayloadForApi() {
    const inp = result?.input
    const coords = result?.coords
    if (!inp || !coords) return null
    const [Y, M, D] = String(inp.dob || '').split('-').map((n) => parseInt(n, 10))
    const [H, Min, S = 0] = String(inp.tob || '').split(':').map((n) => parseInt(n, 10))
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
        observation_point: result?.configUsed?.observation_point || 'geocentric',
        ayanamsha: result?.configUsed?.ayanamsha || 'lahiri',
      }
    }
  }

  async function openAntarModalFor(mahaLord) {
    setSelectedMaha(mahaLord)
    setAntarOpen(true)
    setAntarLoading(true)
    setAntarError('')
    setAntarRows([])
    try {
      const payload = buildPayloadForApi()
      if (!payload) throw new Error('Missing input. Please submit the form first.')
      const res = await astrologyAPI.getSingleCalculation('vimsottari/maha-dasas-and-antar-dasas', payload)
      const out = typeof res?.output === 'string' ? JSON.parse(res.output) : (res?.output || res)
      const sub = out?.[mahaLord] || out?.[String(mahaLord).toLowerCase?.()] || out?.[String(mahaLord).toUpperCase?.()]
      const rows = sub ? Object.entries(sub).map(([k,v]) => ({ lord: k, start: v.start_time || v.start, end: v.end_time || v.end })) : []
      // sort by start
      rows.sort((a,b) => new Date(a.start) - new Date(b.start))
      setAntarRows(rows)
    } catch (e) {
      setAntarError(e?.message || 'Failed to load Antar Dasha.')
    } finally {
      setAntarLoading(false)
    }
  }

  // --- Vimshottari helpers ---
  const mahaRows = useMemo(() => {
    const m = result?.maha
    if (!m) return []
    const obj = typeof m === 'string' ? safeParse(m) : m
    const entries = Object.entries(obj || {})
    return entries
      .map(([k, v]) => ({ key: k, lord: v.Lord || v.lord || v.planet || k, start: v.start_time || v.start, end: v.end_time || v.end }))
      .sort((a, b) => new Date(a.start) - new Date(b.start))
  }, [result])

  const antarForSelected = useMemo(() => {
    if (!selectedMaha || !result?.vimsottari) return []
    const v = result.vimsottari
    const adList = v.antardasha_list || v.antardasha || v.ad || {}
    const key = selectedMaha
    let list = []
    if (adList && typeof adList === 'object' && !Array.isArray(adList)) {
      const arr = adList[key] || adList[key?.toLowerCase?.()] || adList[key?.toUpperCase?.()]
      if (Array.isArray(arr)) list = arr
    }
    if (!list.length && Array.isArray(adList)) {
      // Some APIs return a flattened list with a parent key
      list = adList.filter((it) => {
        const parent = typeof it.parent === 'string' ? it.parent : (it.md || it.mahadasha || it.owner)
        return (parent === key) || (typeof parent === 'string' && parent.toLowerCase() === String(key).toLowerCase())
      })
    }
    return (list || []).map((it, idx) => ({
      key: `${key}-${idx}`,
      lord: it.name || it.planet || it.lord || it.ad || it.antardasha || `AD ${idx+1}`,
      start: it.start_time || it.start,
      end: it.end_time || it.end,
    }))
  }, [selectedMaha, result])

  const shadbalaRows = useMemo(() => {
    let sb = result?.shadbala
    if (!sb) return []
    // Unwrap common shells
    if (sb && typeof sb === 'object') {
      const out = sb.output ?? sb.Output ?? sb.data
      if (out) {
        sb = typeof out === 'string' ? safeParse(out) : out
      }
    }
    if (Array.isArray(sb)) {
      // If array of objects, merge objects; else bail
      const merged = sb.reduce((acc, it) => (typeof it === 'object' ? { ...acc, ...it } : acc), {})
      sb = merged
    }
    const maybePlanets = sb.planets || sb || {}
    const keys = Object.keys(maybePlanets)
    return keys
      .filter((k) => typeof maybePlanets[k] === 'object')
      .map((k) => {
        const p = maybePlanets[k]
        const pct = p.percentage_strength ?? p.percentage ?? p.percent ?? p.shadbala_percent ?? p.strength_percent
        const ishta = p.ishta_phala ?? p.ishta ?? p.ishta_bala ?? p.ishta_percent
        const kashta = p.kashta_phala ?? p.kashta ?? p.kashta_bala ?? p.kashta_percent
        const retro = p.retrograde || p.is_retro
        return { name: (p.name || k), percent: pct, ishta, kashta, retro }
      })
      .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
  }, [result])

  const placements = useMemo(() => {
    const pl = result?.planets
    if (!pl) return []

    // Sign name map 1..12
    const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

    // If upstream returned the documented array form where index 1 is a name->details map
    if (Array.isArray(pl) && pl.length >= 2 && typeof pl[1] === 'object' && !Array.isArray(pl[1])) {
      const map = pl[1]
      return Object.keys(map).map((name) => {
        const v = map[name] || {}
        const signNum = v.current_sign != null ? Number(v.current_sign) : undefined
        const currentSign = signNum ? `${getZodiacSign(signNum)} (${signNum})` : (v.sign_name || v.sign || v.rashi)
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

    // Fallbacks for other shapes we handled earlier
    const arr = Array.isArray(pl) ? pl : (pl.planets || pl.planet_positions || [])
    const list = Array.isArray(arr) ? arr : Object.values(arr || {})
    return list.map((p) => {
      const signNum = p.current_sign != null ? Number(p.current_sign) : undefined
      const currentSign = signNum ? `${getZodiacSign(signNum)} (${signNum})` : (p.sign || p.rashi || p.sign_name)
      return {
        name: p.name || p.planet,
        currentSign,
        house: p.house || p.house_number,
        retro: p.retrograde || p.is_retro || String(p.isRetro).toLowerCase() === 'true',
        fullDegree: typeof p.fullDegree === 'number' ? p.fullDegree : (typeof p.longitude === 'number' ? p.longitude : undefined),
        normDegree: typeof p.normDegree === 'number' ? p.normDegree : undefined,
      }
    })
  }, [result])

  const ProgressBar = ({ value = 0 }) => (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-2 bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )

  // Overall Ishta/Kashta averages for the top legend bars
  const overallIshtaKashta = useMemo(() => {
    if (!result) return { ishta: null, kashta: null }
    const rows = (result && Array.isArray(shadbalaRows)) ? shadbalaRows : []
    if (!rows.length) return { ishta: null, kashta: null }
    let iSum = 0, kSum = 0, iCount = 0, kCount = 0
    for (const r of rows) {
      if (r?.ishta != null && !Number.isNaN(Number(r.ishta))) { iSum += Number(r.ishta); iCount++ }
      if (r?.kashta != null && !Number.isNaN(Number(r.kashta))) { kSum += Number(r.kashta); kCount++ }
    }
    const ishta = iCount ? iSum / iCount : null
    const kashta = kCount ? kSum / kCount : null
    return { ishta, kashta }
  }, [result, shadbalaRows])

  return (
    <div className={`${inter.className} w-full bg-gradient-to-b from-blue-50 to-white`}>
      {/* Page container with side gaps */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-center bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">Get Your Predictions</h1>
        <p className="text-gray-600 mb-8 text-center text-base">Enter your birth details to generate a personalized analysis.</p>

        {error ? (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        ) : null}

      {/* Centered form card */}
      <form onSubmit={onSubmit} className="mb-10 bg-white/80 backdrop-blur-sm p-5 md:p-7 rounded-2xl shadow-md ring-1 ring-gray-200 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Birth Details</h3>
          <div className="hidden md:flex gap-2">
            <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
              {locating ? 'Detecting…' : 'Use Current Location'}
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm shadow-blue-200" disabled={submitting}>{submitting ? 'Calculating…' : 'Get Predictions'}</Button>
            <Button type="reset" variant="outline" onClick={() => { setDob(''); setTob(''); setPlace(''); setResult(null); setError(''); setSelectedMaha(null) }}>Reset</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="focus:ring-2 focus:ring-blue-100" />
            <p className="mt-1 text-xs text-gray-500">Format: YYYY-MM-DD</p>
          </div>
          <div className="md:col-span-1">
            <label htmlFor="tob" className="block text-sm font-medium text-gray-700 mb-1">Time of Birth</label>
            <Input
              id="tob"
              type="time"
              value={tob}
              onChange={(e) => {
                const v = e.target.value
                const [h = '00', m = '00'] = String(v).split(':')
                const hh = String(h).padStart(2, '0')
                const mm = String(m).padStart(2, '0')
                setTob(`${hh}:${mm}`)
              }}
              step="60"
              required
              className="focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">24h format HH:MM</p>
          </div>
          <div className="md:col-span-2 relative">
            <label htmlFor="place" className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
            <div className="flex gap-2">
              <Input
                id="place"
                placeholder="City, Country"
                value={place}
                onChange={(e) => {
                  const q = e.target.value
                  setPlace(q)
                  setSelectedCoords(null)
                  fetchSuggestions(q)
                }}
                autoComplete="off"
                required
                className="focus:ring-2 focus:ring-blue-100"
              />
              <Button type="button" variant="outline" className="whitespace-nowrap" onClick={useMyLocation} disabled={locating}>{locating ? 'Detecting…' : 'Use My Location'}</Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Tip: Try "Mumbai, India" or "San Francisco, USA".</p>
            {suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                {suggestions.map((s, i) => (
                  <button
                    type="button"
                    key={`${s.label}-${i}`}
                    onClick={() => { setPlace(s.label); setSelectedCoords(s); setSuggestions([]) }}
                    className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                  >
                    {s.label}
                  </button>
                ))}
                {suggesting && (
                  <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile actions */}
        <div className="mt-5 flex md:hidden flex-col gap-2">
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>{locating ? 'Detecting…' : 'Use Current Location'}</Button>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm shadow-blue-200" disabled={submitting}>{submitting ? 'Calculating…' : 'Get Predictions'}</Button>
            <Button type="reset" variant="outline" className="flex-1" onClick={() => { setDob(''); setTob(''); setPlace(''); setResult(null); setError(''); setSelectedMaha(null) }}>Reset</Button>
          </div>
        </div>
      </form>

      {result && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Birth Details */}
          <section className="rounded-2xl p-5 bg-white/90 backdrop-blur ring-1 ring-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Date of Birth</div>
                <div className="font-semibold text-gray-900">{result.input.dob}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Time of Birth</div>
                <div className="font-semibold text-gray-900">{result.input.tob}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Place</div>
                <div className="font-semibold text-gray-900">{result.input.place}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Running Dasa</div>
                <div className="font-semibold text-gray-900">{currentDashaChain || '—'}</div>
              </div>
            </div>
          </section>

          {/* Planet Placements (D1) */}
          {placements.length > 0 && (
          <section className="rounded-2xl p-5 bg-white/90 backdrop-blur ring-1 ring-gray-200 shadow-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Planet Placements (D1)</h3>
            {/* Table for tablet/laptop+ (>=640px) */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Planet</th>
                    <th className="px-6 py-3">Current Sign</th>
                    <th className="px-6 py-3">House</th>
                    <th className="px-6 py-3">Full Degree</th>
                    <th className="px-6 py-3">Norm Degree</th>
                    <th className="px-6 py-3">Retro</th>
                    <th className="px-6 py-3">Strength</th>
                    <th className="px-6 py-3 w-56">Ishta</th>
                    <th className="px-6 py-3 w-56">Kashta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {placements.map((p) => {
                    const row = shadbalaRows.find((r) => (r.name || '').toLowerCase().startsWith((p.name || '').toLowerCase()))
                    return (
                      <tr key={p.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                        <td className="px-6 py-4 text-gray-700">{p.currentSign || '—'}</td>
                        <td className="px-6 py-4 text-gray-700">{p.house ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-700">{typeof p.fullDegree === 'number' ? p.fullDegree.toFixed(2) + '°' : '—'}</td>
                        <td className="px-6 py-4 text-gray-700">{typeof p.normDegree === 'number' ? p.normDegree.toFixed(2) + '°' : '—'}</td>
                        <td className="px-6 py-4 text-gray-700">{p.retro ? 'Yes' : 'No'}</td>
                        <td className="px-6 py-4 text-gray-700">{row?.percent != null ? `${Number(row.percent).toFixed(1)} %` : '—'}</td>
                        <td className="px-6 py-4 w-56">
                          {row?.ishta != null ? (<div className="space-y-1"><ProgressBar value={Number(row.ishta)} /><div className="text-xs text-gray-500">{Number(row.ishta).toFixed(1)}%</div></div>) : '—'}
                        </td>
                        <td className="px-6 py-4 w-56">
                          {row?.kashta != null ? (<div className="space-y-1"><ProgressBar value={Number(row.kashta)} /><div className="text-xs text-gray-500">{Number(row.kashta).toFixed(1)}%</div></div>) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (<640px) */}
            <div className="sm:hidden space-y-3">
              {placements.map((p) => {
                const row = shadbalaRows.find((r) => (r.name || '').toLowerCase().startsWith((p.name || '').toLowerCase()))
                const pct = row?.percent != null ? Number(row.percent) : null
                const ishta = row?.ishta != null ? Math.max(0, Math.min(100, Number(row.ishta))) : null
                const kashta = row?.kashta != null ? Math.max(0, Math.min(100, Number(row.kashta))) : null
                return (
                  <div key={p.name} className="rounded-lg border border-gray-200 p-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      {p.retro ? (<span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Retro</span>) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div className="text-gray-500">Current Sign</div>
                      <div className="text-gray-800">{p.currentSign || '—'}</div>
                      <div className="text-gray-500">House</div>
                      <div className="text-gray-800">{p.house ?? '—'}</div>
                      <div className="text-gray-500">Full Degree</div>
                      <div className="text-gray-800">{typeof p.fullDegree === 'number' ? p.fullDegree.toFixed(2) + '°' : '—'}</div>
                      <div className="text-gray-500">Norm Degree</div>
                      <div className="text-gray-800">{typeof p.normDegree === 'number' ? p.normDegree.toFixed(2) + '°' : '—'}</div>
                      <div className="text-gray-500">Strength</div>
                      <div className="text-gray-800">{pct != null ? `${pct.toFixed(1)} %` : '—'}</div>
                      <div className="text-gray-500">Ishta</div>
                      <div className="text-gray-800">{ishta != null ? `${ishta.toFixed(1)}%` : '—'}</div>
                      <div className="text-gray-500">Kashta</div>
                      <div className="text-gray-800">{kashta != null ? `${kashta.toFixed(1)}%` : '—'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          )}


          {/* Shadbala Table (improved readability & UX) */}
          <section className="rounded-2xl ring-1 ring-gray-200 bg-white/90 backdrop-blur w-full overflow-hidden shadow-sm mb-6">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-semibold text-gray-900">Shadbala & Ishta/Kashta</h3>
            </div>
            <div className="px-0 py-2">
              {shadbalaRows.length === 0 && (
                <div className="px-5 py-3 text-sm text-gray-500">No rows to display. This can happen due to API rate limits or unexpected response shape.</div>
              )}
              {result?.apiErrors && result.apiErrors['shadbala/summary'] && (
                <div className="mx-5 my-3 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-2">API error: {String(result.apiErrors['shadbala/summary'])}</div>
              )}
              {/* Table for tablet/laptop+ (>=640px) */}
              <div className="w-full hidden sm:block px-4 pb-2">
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50 text-xs font-medium text-gray-600">
                      <tr>
                        <th className="px-4 py-2 text-left w-1/2">Planet</th>
                        <th className="px-4 py-2 text-left w-1/6">Strength</th>
                        <th className="px-4 py-2 text-center w-1/6">Ishta</th>
                        <th className="px-4 py-2 text-center w-1/6">Kashta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {shadbalaRows.map((r) => {
                        const pct = r.percent != null ? Number(r.percent) : null
                        const ishta = r.ishta != null ? Math.max(0, Math.min(100, Number(r.ishta))) : null
                        const kashta = r.kashta != null ? Math.max(0, Math.min(100, Number(r.kashta))) : null
                        return (
                          <tr key={r.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{r.retro ? 'ℝ' : '★'}</span>
                                <span className="font-medium text-gray-900">{r.name}</span>
                                {r.retro ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Retro</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              {pct != null ? (
                                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${pct >= 120 ? 'bg-green-50 text-green-700 border border-green-200' : pct >= 100 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{pct.toFixed(1)} %</span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {ishta != null ? `${ishta.toFixed(1)}%` : '—'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {kashta != null ? `${kashta.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Mobile cards (<640px) */}
              <div className="block sm:hidden px-3 pb-2">
                <div className="space-y-3">
                  {shadbalaRows.map((r) => {
                    const pct = r.percent != null ? Number(r.percent) : null
                    const ishta = r.ishta != null ? Math.max(0, Math.min(100, Number(r.ishta))) : null
                    const kashta = r.kashta != null ? Math.max(0, Math.min(100, Number(r.kashta))) : null
                    return (
                      <div key={r.name} className="rounded-lg border border-gray-200 p-3 bg-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{r.retro ? 'ℝ' : '★'}</span>
                            <span className="font-semibold text-gray-900 text-sm">{r.name}</span>
                          </div>
                          <div>
                            {pct != null ? (
                              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${pct >= 120 ? 'bg-green-50 text-green-700 border border-green-200' : pct >= 100 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{pct.toFixed(1)}%</span>
                            ) : (
                              <span className="text-[11px] text-gray-500">—</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">Ishta</div>
                            {ishta != null ? (
                              <div className="space-y-1">
                                <ProgressBar value={ishta} />
                                <div className="text-[11px] text-gray-600">{ishta.toFixed(1)}%</div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-500">—</div>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">Kashta</div>
                            {kashta != null ? (
                              <div className="space-y-1">
                                <ProgressBar value={kashta} />
                                <div className="text-[11px] text-gray-600">{kashta.toFixed(1)}%</div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-500">—</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Vimshottari Dasa summary */}
          <section className="border border-gray-200 rounded-xl p-4 bg-white">
            <h3 className="text-lg font-semibold mb-3">Vimshottari Maha Dasha</h3>
            {mahaRows.length > 0 ? (
              <div className="rounded-lg border border-gray-100">
                <div className="divide-y">
                  {mahaRows.map((row) => {
                    const isSel = selectedMaha === row.lord
                    const endDate = row.end ? new Date(row.end).toLocaleDateString('en-GB') : '—'
                    const abbr = (row.lord || '').slice(0,2)
                    return (
                      <button
                        type="button"
                        key={row.key}
                        onClick={() => openAntarModalFor(row.lord)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${isSel ? 'bg-indigo-50' : ''}`}
                      >
                        <span className="font-medium w-20 text-left">{abbr}</span>
                        <span className="text-gray-800">{endDate}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="px-3 py-2 text-xs text-gray-500">
                  Note: Dates shown are dasha ending dates. Tap a row to show Antar Dasha.
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No Maha Dasha data. Submit the form above.</div>
            )}

            {currentDashaChain && (
              <div className="mt-3 text-xs text-gray-700">Running: <span className="font-semibold">{currentDashaChain}</span></div>
            )}

            {result?.apiErrors && Object.keys(result.apiErrors).length > 0 && (
              <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                Some endpoints returned errors due to rate limits: {Object.entries(result.apiErrors).map(([k,v]) => `${k}: ${v}`).join('; ')}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Antar Dasha Modal */}
      <Modal
        open={antarOpen}
        onClose={() => setAntarOpen(false)}
        title={selectedMaha ? `Vimshottari Antara Dasha — ${selectedMaha}` : 'Vimshottari Antara Dasha'}
        position="center"
      >
        {antarLoading ? (
          <div className="py-8 text-center text-sm text-gray-600">Loading…</div>
        ) : antarError ? (
          <div className="py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3">{antarError}</div>
        ) : (
          <div>
            {antarRows.length === 0 ? (
              <div className="text-sm text-gray-500">No Antar Dasha data for this Maha Dasha.</div>
            ) : (
              <div className="rounded-lg border border-gray-100 divide-y">
                {antarRows.map((ad, i) => {
                  const endDate = ad.end ? new Date(ad.end).toLocaleDateString('en-GB') : '—'
                  const abbr = (name) => (name || '').toString().slice(0,2)
                  return (
                    <div key={`${selectedMaha}-${ad.lord}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="font-medium w-28">{abbr(selectedMaha)}/{abbr(ad.lord)}</span>
                      <span className="text-gray-800">{endDate}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">Note: Dates shown are dasha ending dates.</div>
          </div>
        )}
      </Modal>
      </div>
    </div>
  )
}
