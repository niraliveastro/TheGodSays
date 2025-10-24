'use client'

import { useMemo, useRef, useState } from 'react'
import Modal from '@/components/Modal'
import {
  Sparkles, Calendar, Clock, MapPin, TrendingUp, Star, Orbit,
  Moon, Sun, ChevronRight, X, Loader2, RotateCcw
} from 'lucide-react'
import { astrologyAPI, geocodePlace, getTimezoneOffsetHours } from '@/lib/api'

export default function PredictionsPage() {
  const [dob, setDob] = useState('')
  const [tob, setTob] = useState('')
  const [place, setPlace] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggesting, setSuggesting] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState(null)
  const suggestTimer = useRef(null)

  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [result, setResult] = useState(null)
  const [selectedMaha, setSelectedMaha] = useState(null)

  const [antarOpen, setAntarOpen] = useState(false)
  const [antarLoading, setAntarLoading] = useState(false)
  const [antarError, setAntarError] = useState('')
  const [antarRows, setAntarRows] = useState([])

  // ---- helpers ---------------------------------------------------------
  const getZodiacSign = (signNumber) => {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ]
    return signs[(signNumber - 1) % 12]
  }

  // ---- geolocation ------------------------------------------------------
  async function reverseGeocodeCoords(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=0`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      if (!res.ok) throw new Error()
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
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000
        })
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

  // ---- validation -------------------------------------------------------
  function validate() {
    if (!dob) return 'Please enter your Date of Birth.'
    if (!tob) return 'Please enter your Time of Birth.'
    if (!place.trim()) return 'Please enter your Place of Birth.'
    return ''
  }

  const fmtTime = (h, m, s = 0) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const safeParse = (v) => {
    try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return v }
  }

  // ---- autocomplete ------------------------------------------------------
  const fetchSuggestions = (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return }
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    suggestTimer.current = setTimeout(async () => {
      try {
        setSuggesting(true)
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(q)}`
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'TheGodSays/1.0 (education)' }
        })
        const arr = await res.json()
        const opts = (arr || []).map(it => ({
          label: it.display_name,
          latitude: parseFloat(it.lat),
          longitude: parseFloat(it.lon)
        }))
        setSuggestions(opts)
      } catch {
        setSuggestions([])
      } finally {
        setSuggesting(false)
      }
    }, 250)
  }

  // ---- submit -----------------------------------------------------------
  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    try {
      const geo = selectedCoords || (await geocodePlace(place))
      if (!geo) throw new Error('Unable to find location. Try a more specific place name (e.g., City, Country).')

      const [Y, M, D] = dob.split('-').map(n => parseInt(n, 10))
      const tparts = tob.split(':').map(n => parseInt(n, 10))
      const [H, Min, S = 0] = tparts

      const tz = await getTimezoneOffsetHours(geo.latitude, geo.longitude)

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
        config: { observation_point: 'geocentric', ayanamsha: 'lahiri' }
      }

      const { results, errors } = await astrologyAPI.getMultipleCalculations([
        'shadbala/summary',
        'vimsottari/dasa-information',
        'vimsottari/maha-dasas',
        'planets'
      ], payload)

      const vimsRaw = results?.['vimsottari/dasa-information']
      const shadbalaRaw = results?.['shadbala/summary']
      const mahaRaw = results?.['vimsottari/maha-dasas']

      const vimsParsed = vimsRaw ? safeParse(safeParse(vimsRaw.output ?? vimsRaw)) : null
      let mahaParsed = mahaRaw ? safeParse(safeParse(mahaRaw.output ?? mahaRaw)) : null
      if (mahaParsed && typeof mahaParsed === 'object' && mahaParsed.output) {
        mahaParsed = safeParse(mahaParsed.output)
      }
      let shadbalaParsed = shadbalaRaw ? safeParse(safeParse(shadbalaRaw.output ?? shadbalaRaw)) : null
      if (shadbalaParsed && typeof shadbalaParsed === 'object' && shadbalaParsed.output) {
        shadbalaParsed = safeParse(shadbalaParsed.output)
      }

      let finalShadbala = shadbalaParsed
      const looksEmpty = !shadbalaParsed || (typeof shadbalaParsed === 'object' && Object.keys(shadbalaParsed).length === 0)
      if (looksEmpty) {
        const altPayload = { ...payload, config: { ...payload.config, observation_point: 'topocentric' } }
        try {
          const alt = await astrologyAPI.getSingleCalculation('shadbala/summary', altPayload)
          let altParsed = safeParse(safeParse(alt.output ?? alt))
          if (altParsed && typeof altParsed === 'object' && altParsed.output) altParsed = safeParse(altParsed.output)
          if (altParsed && Object.keys(altParsed).length) finalShadbala = altParsed
        } catch {}
      }

      setResult({
        input: { dob, tob: fmtTime(H, Min, S), place: geo.label || place, tz },
        coords: { latitude: geo.latitude, longitude: geo.longitude },
        configUsed: { observation_point: 'geocentric', ayanamsha: 'lahiri' },
        vimsottari: vimsParsed,
        planets: results?.['planets'] ? safeParse(safeParse(results['planets'].output ?? results['planets'])) : [],
        maha: mahaParsed,
        shadbala: finalShadbala,
        apiErrors: { ...errors }
      })
    } catch (err) {
      setError(err?.message || 'Failed to compute predictions.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- UI helpers -------------------------------------------------------
  const currentDashaChain = useMemo(() => {
    const v = result?.vimsottari
    if (!v) return null
    const current = v.current || v.running || v.now || v?.mahadasha?.current
    if (current && (current.md || current.mahadasha)) {
      const md = current.md || current.mahadasha
      const ad = current.ad || current.antardasha
      const pd = current.pd || current.pratyantar
      return [md, ad, pd]
        .filter(Boolean)
        .map(x => (x.name || x.planet || x).toString().trim())
        .join(' > ')
    }
    const md = (v.mahadasha_list || v.mahadasha || v.md || [])[0]
    const adList = v.antardasha_list || v.antardasha || v.ad || {}
    const firstMdKey = md?.key || md?.planet || md?.name
    const ad = Array.isArray(adList[firstMdKey]) ? adList[firstMdKey][0] : Array.isArray(adList) ? adList[0] : null
    const pdList = v.pratyantar_list || v.pd || {}
    const firstAdKey = ad?.key || ad?.planet || ad?.name
    const pd = Array.isArray(pdList[firstAdKey]) ? pdList[firstAdKey][0] : Array.isArray(pdList) ? pdList[0] : null
    return [md?.name || md?.planet, ad?.name || ad?.planet, pd?.name || pd?.planet]
      .filter(Boolean)
      .join(' > ')
  }, [result])

  function buildPayloadForApi() {
    const inp = result?.input
    const coords = result?.coords
    if (!inp || !coords) return null
    const [Y, M, D] = String(inp.dob || '').split('-').map(n => parseInt(n, 10))
    const [H, Min, S = 0] = String(inp.tob || '').split(':').map(n => parseInt(n, 10))
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
        ayanamsha: result?.configUsed?.ayanamsha || 'lahiri'
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
      const sub = out?.[mahaLord] || out?.[String(mahaLord).toLowerCase()] || out?.[String(mahaLord).toUpperCase()] || {}
      const rows = Object.entries(sub).map(([k, v]) => ({
        lord: k,
        start: v.start_time || v.start,
        end: v.end_time || v.end
      }))
      rows.sort((a, b) => new Date(a.start) - new Date(b.start))
      setAntarRows(rows)
    } catch (e) {
      setAntarError(e?.message || 'Failed to load Antar Dasha.')
    } finally {
      setAntarLoading(false)
    }
  }

  const mahaRows = useMemo(() => {
    const m = result?.maha
    if (!m) return []
    const obj = typeof m === 'string' ? safeParse(m) : m
    const entries = Object.entries(obj || {})
    return entries
      .map(([k, v]) => ({
        key: k,
        lord: v.Lord || v.lord || v.planet || k,
        start: v.start_time || v.start,
        end: v.end_time || v.end
      }))
      .sort((a, b) => new Date(a.start) - new Date(b.start))
  }, [result])

  const shadbalaRows = useMemo(() => {
    let sb = result?.shadbala
    if (!sb) return []
    if (sb && typeof sb === 'object') {
      const out = sb.output ?? sb.Output ?? sb.data
      if (out) sb = typeof out === 'string' ? safeParse(out) : out
    }
    if (Array.isArray(sb)) {
      const merged = sb.reduce((acc, it) => (typeof it === 'object' ? { ...acc, ...it } : acc), {})
      sb = merged
    }
    const maybePlanets = sb.planets || sb || {}
    const keys = Object.keys(maybePlanets)
    return keys
      .filter(k => typeof maybePlanets[k] === 'object')
      .map(k => {
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

    const SIGN_NAMES = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ]

    if (Array.isArray(pl) && pl.length >= 2 && typeof pl[1] === 'object' && !Array.isArray(pl[1])) {
      const map = pl[1]
      return Object.keys(map).map(name => {
        const v = map[name] || {}
        const signNum = v.current_sign != null ? Number(v.current_sign) : undefined
        const currentSign = signNum ? `${getZodiacSign(signNum)} (${signNum})` : (v.sign_name || v.sign || v.rashi)
        return {
          name,
          currentSign,
          house: v.house_number,
          retro: (String(v.isRetro).toLowerCase() === 'true') || v.is_retro || v.retrograde || false,
          fullDegree: typeof v.fullDegree === 'number' ? v.fullDegree : (typeof v.longitude === 'number' ? v.longitude : undefined),
          normDegree: typeof v.normDegree === 'number' ? v.normDegree : undefined
        }
      })
    }

    const arr = Array.isArray(pl) ? pl : (pl.planets || pl.planet_positions || [])
    const list = Array.isArray(arr) ? arr : Object.values(arr || {})
    return list.map(p => {
      const signNum = p.current_sign != null ? Number(p.current_sign) : undefined
      const currentSign = signNum ? `${getZodiacSign(signNum)} (${signNum})` : (p.sign || p.rashi || p.sign_name)
      return {
        name: p.name || p.planet,
        currentSign,
        house: p.house || p.house_number,
        retro: p.retrograde || p.is_retro || String(p.isRetro).toLowerCase() === 'true',
        fullDegree: typeof p.fullDegree === 'number' ? p.fullDegree : (typeof p.longitude === 'number' ? p.longitude : undefined),
        normDegree: typeof p.normDegree === 'number' ? p.normDegree : undefined
      }
    })
  }, [result])

  const ProgressBar = ({ value = 0 }) => (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-2 bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )

  // ------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="border-b border-purple-200 bg-white/70 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center gap-3">
          {/* <Sparkles className="w-8 h-8 text-gold" /> */}
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gold via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Cosmic Insights
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span>Warning</span> {error}
          </div>
        )}

        {/* Form */}
{/* ==== FORM ==== */}
<form onSubmit={onSubmit}
      className="card bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-xl border border-gold/20 max-w-4xl mx-auto">

  {/* Header */}
{/* ==== FORM HEADER ==== */}
<div className="form-header">
  <div className="form-header-icon">
    <Moon className="w-6 h-6 text-gold" />
  </div>

  <div className="form-header-text">
    <h3 className="form-title">Birth Details</h3>
    <p className="form-subtitle">Enter your cosmic coordinates</p>
  </div>
</div>

<div className="form-grid">

  {/* ---------- Date of Birth ---------- */}
  <div className="col-span-5">
    <div className="form-field">
      <label className="form-field-label">
        <Calendar className="w-5 h-5 text-gold" />
        Date of Birth
      </label>
      <input
        type="date"
        value={dob}
        onChange={e => setDob(e.target.value)}
        required
        className="form-field-input"
      />
      <p className="form-field-helper">Format: YYYY-MM-DD</p>
    </div>
  </div>

  {/* ---------- Time of Birth ---------- */}
  <div className="col-span-3">
    <div className="form-field">
      <label className="form-field-label">
        <Clock className="w-5 h-5 text-gold" />
        Time
      </label>
      <input
        type="time"
        value={tob}
        onChange={e => setTob(e.target.value)}
        step="1"
        required
        className="form-field-input"
      />
      <p className="form-field-helper">24-hour format</p>
    </div>
  </div>

  {/* ---------- Place of Birth ---------- */}
  <div className="col-span-4" style={{ position: 'relative' }}>
    <div className="form-field">
      <label className="form-field-label">
        <MapPin className="w-5 h-5 text-gold" />
        Place of Birth
      </label>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          placeholder="City, Country"
          value={place}
          onChange={e => {
            const q = e.target.value
            setPlace(q)
            setSelectedCoords(null)
            fetchSuggestions(q)
          }}
          autoComplete="off"
          required
          className="form-field-input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="place-btn"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          <span className="hidden md:inline">Use Location</span>
        </button>
      </div>

      <p className="form-field-helper">e.g., Mumbai, India</p>
    </div>

    {/* Suggestions */}
    {suggestions.length > 0 && (
      <div className="suggestions">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setPlace(s.label)
              setSelectedCoords(s)
              setSuggestions([])
            }}
            className="suggestion-item"
          >
            <MapPin className="w-3.5 h-3.5 text-gold" />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
</div>

  {/* Action Buttons */}
  <div className="mt-8 flex gap-3">
    <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
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
    <button
      type="reset"
      onClick={() => {
        setDob('')
        setTob('')
        setPlace('')
        setResult(null)
        setError('')
        setSelectedMaha(null)
      }}
      className="btn btn-ghost"
    >
      <RotateCcw className="w-4 h-4" />
    </button>
  </div>
</form>

{/* Results */}
{result && (
  <div style={{ marginTop: '3rem', maxWidth: '90rem', marginLeft: 'auto', marginRight: 'auto' }}>

    {/* Birth Info */}
    <div className="card">
      <div className="results-header">
        <Sun style={{ color: '#ca8a04' }} />
        <h3 className="results-title">Birth Information</h3>
      </div>
      <div className="birth-info-grid">
        {[
          { icon: Calendar, label: 'Date', value: result.input.dob },
          { icon: Clock, label: 'Time', value: result.input.tob },
          { icon: MapPin, label: 'Place', value: result.input.place },
          { icon: Orbit, label: 'Running Dasa', value: currentDashaChain || '—' }
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

    {/* Natal Chart */}
    {result.input && (
      <div className="card">
        <div className="natal-header">
          <div className="natal-header-icon">
            <Star />
          </div>
          <h3 className="results-title">Natal Chart (D1)</h3>
        </div>
        <div className="chart-container">
          <img
            src={`https://api.vedicastroapi.com/v3-json/horoscope/chart-image/D1?dob=${result.input.dob}&tob=${result.input.tob}&lat=${result.coords.latitude}&lon=${result.coords.longitude}&tz=${result.input.tz}&api_key=89fdc2dd-2e22-5d30-ae39-4aba88e96db0&lang=en&chart_style=north-indian&chart_size=600&stroke_width=2`}
            alt="Natal Chart"
            className="chart-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement.innerHTML = '<div style="color:#6b7280;font-size:0.875rem;padding:2rem;">Chart image unavailable</div>'
            }}
          />
        </div>
      </div>
    )}

    {/* Planet Placements */}
    {placements.length > 0 && (
      <div className="card">
        <div className="results-header">
          <Orbit style={{ color: '#7c3aed' }} />
          <h3 className="results-title">Planet Placements (D1)</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="planet-table">
            <thead>
              <tr>
                <th>Planet</th>
                <th>Sign</th>
                <th>House</th>
                <th>Full Degree</th>
                <th>Norm Degree</th>
                <th>Retro</th>
                <th>Strength</th>
                <th style={{ width: '10rem' }}>Ishta</th>
                <th style={{ width: '10rem' }}>Kashta</th>
              </tr>
            </thead>
            <tbody>
              {placements.map(p => {
                const row = shadbalaRows.find(r =>
                  (r.name || '').toLowerCase().startsWith((p.name || '').toLowerCase())
                )
                return (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 500, color: '#1f2937' }}>{p.name}</td>
                    <td style={{ color: '#374151' }}>{p.currentSign || '—'}</td>
                    <td style={{ color: '#374151' }}>{p.house ?? '—'}</td>
                    <td style={{ color: '#374151' }}>
                      {typeof p.fullDegree === 'number' ? p.fullDegree.toFixed(2) + '°' : '—'}
                    </td>
                    <td style={{ color: '#374151' }}>
                      {typeof p.normDegree === 'number' ? p.normDegree.toFixed(2) + '°' : '—'}
                    </td>
                    <td>
                      {p.retro ? (
                        <span className="retro-badge">Retro</span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: '#374151' }}>
                      {row?.percent != null ? `${Number(row.percent).toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ width: '10rem' }}>
                      {row?.ishta != null ? (
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Number(row.ishta)}%` }}></div>
                          </div>
                          <div className="progress-label">{Number(row.ishta).toFixed(1)}%</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ width: '10rem' }}>
                      {row?.kashta != null ? (
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Number(row.kashta)}%` }}></div>
                          </div>
                          <div className="progress-label">{Number(row.kashta).toFixed(1)}%</div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Vimshottari Maha Dasha */}
    <div className="card">
      <div className="results-header">
        <Moon style={{ color: '#4f46e5' }} />
        <h3 className="results-title">Vimshottari Maha Dasha</h3>
      </div>
      {mahaRows.length > 0 ? (
        <div className="maha-list">
          {mahaRows.map(row => {
            const isSel = selectedMaha === row.lord
            const endDate = row.end ? new Date(row.end).toLocaleDateString('en-GB') : '—'
            const abbr = (row.lord || '').slice(0, 2)
            return (
              <button
                type="button"
                key={row.key}
                onClick={() => openAntarModalFor(row.lord)}
                className={`maha-row ${isSel ? 'selected' : ''}`}
              >
                <div className="maha-left">
                  <Orbit style={{ color: '#d4af37' }} />
                  <span className="maha-abbr">{abbr}</span>
                </div>
                <div className="maha-right">
                  <span style={{ color: '#374151' }}>{endDate}</span>
                  <ChevronRight style={{ color: '#d4af37' }} />
                </div>
              </button>
            )
          })}
          <div className="maha-note">
            Note: Dates shown are dasha ending dates. Tap a row to show Antar Dasha.
          </div>
        </div>
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
          title={selectedMaha ? `Antar Dasha — ${selectedMaha}` : 'Antar Dasha'}
          position="center"
        >
          {antarLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
              <div className="text-sm text-gray-600">Loading…</div>
            </div>
          ) : antarError ? (
            <div className="py-4 text-sm text-red-700 bg-red-50 border border-red-300 rounded-lg px-4">
              {antarError}
            </div>
          ) : (
            <div>
              {antarRows.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 border border-gray-300">
                  No Antar Dasha data for this Maha Dasha.
                </div>
              ) : (
                <div className="rounded-lg border border-gray-300 divide-y divide-gray-200 overflow-hidden">
                  {antarRows.map((ad, i) => {
                    const endDate = ad.end ? new Date(ad.end).toLocaleDateString('en-GB') : '—'
                    const abbr = name => (name || '').toString().slice(0, 2)
                    return (
                      <div key={i} className="flex items-center justify-between px-4 py-3 text-sm bg-white hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Star className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-gray-800 w-28">
                            {abbr(selectedMaha)}/{abbr(ad.lord)}
                          </span>
                        </div>
                        <span className="text-gray-700">{endDate}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="mt-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-300">
                Note: Dates shown are dasha ending dates.
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}