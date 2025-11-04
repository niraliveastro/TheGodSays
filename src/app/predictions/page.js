'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Modal from '@/components/Modal'
import {
  Sparkles, Calendar, Clock, MapPin, Orbit,
  Moon, Sun, X, Loader2, Cpu , RotateCcw
} from 'lucide-react'
import { astrologyAPI, geocodePlace } from '@/lib/api'

export default function PredictionsPage() {
  const [dob, setDob] = useState('')
  const [tob, setTob] = useState('')
  const [place, setPlace] = useState('')

  // Timezone (UTC offset hours) — default IST 5.5
  const [tzHours, setTzHours] = useState(5.5)

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

  const [predictionsOpen, setPredictionsOpen] = useState(false)
  const [predictionsLoading, setPredictionsLoading] = useState(false)
  const [predictionsError, setPredictionsError] = useState('')
  const [aiPredictions, setAiPredictions] = useState('')
  const [selectedPlanetForPredictions, setSelectedPlanetForPredictions] = useState(null)

  // ref to Planet Placements section & auto-scroll when results arrive =====
  const placementsSectionRef = useRef(null)
  const setPlacementsRef = (el) => { placementsSectionRef.current = el; };
  useEffect(() => {
    if (result && placements.length > 0 && placementsSectionRef.current) {
      const t = setTimeout(() => {
        placementsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return () => clearTimeout(t)
    }
  }, [result]) // placements depends on result; recompute happens right after

  const getZodiacSign = (signNumber) => {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ]
    return signs[(signNumber - 1) % 12]
  }

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

  function validate() {
    if (!dob) return 'Please enter your Date of Birth.'
    if (!tob) return 'Please enter your Time of Birth.'
    if (!place.trim()) return 'Please enter your Place of Birth.'
    if (!Number.isFinite(Number(tzHours))) return 'Please select a valid timezone.'
    return ''
  }

  const fmtTime = (h, m, s = 0) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const safeParse = (v) => {
    try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return v }
  }

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

      const tz = Number.isFinite(Number(tzHours)) ? Number(tzHours) : 5.5

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
        config: {
          observation_point: 'topocentric',
          ayanamsha: 'lahiri',
          house_system: 'Placidus',
          language: 'en'
        }
      }

      const { results, errors } = await astrologyAPI.getMultipleCalculations([
        'shadbala/summary',
        'vimsottari/dasa-information',
        'vimsottari/maha-dasas',
        'planets',
        'western/natal-wheel-chart',
        'planets/extended'
      ], payload)

      const vimsRaw = results?.['vimsottari/dasa-information']
      const shadbalaRaw = results?.['shadbala/summary']
      const mahaRaw = results?.['vimsottari/maha-dasas']
      const planetsRaw = results?.['planets/extended']

      const westernChartSvgRaw = results?.['western/natal-wheel-chart']
      const westernChartSvg = westernChartSvgRaw
        ? (typeof westernChartSvgRaw.output === 'string'
            ? westernChartSvgRaw.output
            : typeof westernChartSvgRaw === 'string'
            ? westernChartSvgRaw
            : null)
        : null

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

      let planetsParsed = planetsRaw ? safeParse(safeParse(planetsRaw.output ?? planetsRaw)) : null
      if (planetsParsed && typeof planetsParsed === 'object' && planetsParsed.output) {
        planetsParsed = safeParse(planetsParsed.output)
      }

      let finalPlanetParsed = planetsParsed
      const looksEmptyPlanets = !planetsParsed || (typeof planetsParsed === 'object' && Object.keys(planetsParsed).length === 0)
      if (looksEmptyPlanets) {
        const altPayload = { ...payload, config: { ...payload.config, observation_point: 'topocentric' } }
        try {
          const alt = await astrologyAPI.getSingleCalculation('planets/extended', altPayload)
          let altParsed = safeParse(safeParse(alt.output ?? alt))
          if (altParsed && typeof altParsed === 'object' && altParsed.output) altParsed = safeParse(altParsed.output)
          if (altParsed && Object.keys(altParsed).length) finalPlanetParsed = altParsed
        } catch {}
      }

      setResult({
        input: { dob, tob: fmtTime(H, Min, S), place: geo.label || place, tz },
        coords: { latitude: geo.latitude, longitude: geo.longitude },
        configUsed: { observation_point: 'geocentric', ayanamsha: 'lahiri' },
        vimsottari: vimsParsed,
        planets: finalPlanetParsed,
        maha: mahaParsed,
        shadbala: finalShadbala,
        westernChartSvg,
        apiErrors: { ...errors }
      })
    } catch (err) {
      setError(err?.message || 'Failed to compute predictions.')
    } finally {
      setSubmitting(false)
    }
  }

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

  async function openAiPredictionsFor(planetLord) {
    setSelectedPlanetForPredictions(planetLord)
    setPredictionsOpen(true)
    setPredictionsLoading(true)
    setPredictionsError('')
    setAiPredictions('')
    try {
      const inp = result?.input
      if (!inp) throw new Error('Missing birth details for predictions.')
      const mahaPeriod = mahaRows.find(row => row.lord === planetLord)
      if (!mahaPeriod) throw new Error('Maha Dasha period not found.')
      const predictions = await generateAiPredictions(planetLord, mahaPeriod, inp)
      setAiPredictions(predictions)
    } catch (e) {
      setPredictionsError(e?.message || 'Failed to generate AI predictions.')
    } finally {
      setPredictionsLoading(false)
    }
  }

  async function generateAiPredictions(planet, mahaPeriod) {
    return `Predictions for ${planet} during the period from ${mahaPeriod.start} to ${mahaPeriod.end} based on your data.`
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

    if (typeof pl === 'object' && !Array.isArray(pl)) {
      return Object.entries(pl)
        .filter(([name]) => name.toLowerCase() !== 'ascendant') 
        .map(([name, v]) => {
          const signNum = v.current_sign != null ? Number(v.current_sign) : undefined
          const currentSign = signNum
            ? `${SIGN_NAMES[signNum - 1]} (${signNum})`
            : (v.zodiac_sign_name || v.sign_name || v.sign)

          return {
            name,
            currentSign,
            house: v.house_number,
            nakshatra: v.nakshatra_name,
            pada: v.nakshatra_pada,
            retro:
              v.isRetro === "true" ||
              v.retrograde === true ||
              v.is_retro === true,
            fullDegree: v.fullDegree ?? v.longitude,
            normDegree: v.normDegree,
          }
        })
    }

    const arr = Array.isArray(pl)
      ? pl
      : pl.planets || pl.planet_positions || Object.values(pl || {})

    return arr
      .filter(p => (p.name || p.planet)?.toLowerCase() !== 'ascendant')
      .map(p => {
        const signNum = p.current_sign != null ? Number(p.current_sign) : undefined
        const currentSign = signNum
          ? `${SIGN_NAMES[signNum - 1]} (${signNum})`
          : (p.sign || p.rashi || p.sign_name)

        return {
          name: p.name || p.planet,
          currentSign,
          house: p.house || p.house_number,
          nakshatra: p.nakshatra_name,
          pada: p.nakshatra_pada,
          retro:
            p.retrograde || p.is_retro || p.isRetro === "true",
          fullDegree: p.fullDegree ?? p.longitude,
          normDegree: p.normDegree,
        }
      })
  }, [result])

  return (
    <div className="app">

           {/* Orbs */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

{/* Header */}
      <header className="header">

            <Sparkles className='headerIcon' style={{  color: '#ffff' , padding:'0.4rem', width: 36, height: 36,}} />
            <h1 className="title" >
              Cosmic Insights
            </h1>
  

      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span>Warning</span> {error}
          </div>
        )}

        {/* ==== FORM ==== */}
        <form onSubmit={onSubmit}
              className="card bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-xl border border-gold/20 max-w-4xl mx-auto">
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
            {/* Date */}
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

            {/* Time */}
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
                  step="60"
                  required
                  className="form-field-input"
                />
                <p className="form-field-helper">24-hour format</p>
              </div>
            </div>

            {/* Place */}
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



           {/* Action Buttons with Timezone */}
          <style jsx>{`
            @media (max-width: 767px) {
              .submit-col, .tz-col, .reset-col {
                grid-column: span 12;
              }
            }
            @media (min-width: 768px) {
              .submit-col {
                grid-column: span 3;
              }
              .tz-col {
                grid-column: span 8;
              }
              .reset-col {
                grid-column: span 1;
              }
            }
          `}</style>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(12, 1fr)', 
            gap: '1rem', 
            alignItems: 'end',
            marginTop: '1.5rem'
          }}>
            {/* Submit Button */}
            <div className="submit-col">
              <button type="submit" disabled={submitting} className="btn btn-primary w-full">
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
            </div>

            {/* Timezone */}
            <div className="tz-col">
              <div className="form-field">
                <label className="form-field-label">
                  <Clock className="w-5 h-5 text-gold" />
                  Timezone (UTC offset)
                </label>
                <select
                  value={tzHours}
                  onChange={(e) => setTzHours(parseFloat(e.target.value))}
                  className="form-field-input timezone-select w-full"
                >
                  {[
                    -12,-11,-10,-9.5,-9,-8,-7,-6,-5,-4.5,-4,-3.5,-3,-2,-1,0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,5.75,6,6.5,7,7.5,8,8.75,9,9.5,10,10.5,11,12,12.75,13,14
                  ].map(v => {
                    const sign = v >= 0 ? '+' : ''
                    const labelHours = Math.trunc(Math.abs(v))
                    const mins = Math.round((Math.abs(v) - labelHours) * 60)
                    const hhmm = `${sign}${labelHours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`
                    const pretty = `UTC${hhmm}`
                    return <option key={v} value={v}>{pretty}{v===5.5 ? ' (IST default)' : ''}</option>
                  })}
                </select>
              </div>
            </div>

            {/* Reset Button */}
            <div className="reset-col">
              <button
                type="reset"
                onClick={() => {
                  setDob('')
                  setTob('')
                  setPlace('')
                  setResult(null)
                  setError('')
                  setSelectedMaha(null)
                  setTzHours(5.5) // default
                }}
                className="btn btn-ghost w-full"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
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
                  { icon: Orbit, label: 'Running Dasa', value: currentDashaChain || '—' },
                  // show timezone used
                  { icon: Clock, label: 'Timezone', value: `UTC${(() => {
                      const v = Number(result.input.tz)
                      const sign = v >= 0 ? '+' : ''
                      const ah = Math.trunc(Math.abs(v))
                      const mins = Math.round((Math.abs(v) - ah) * 60)
                      return `${sign}${String(ah).padStart(2,'0')}:${String(mins).padStart(2,'0')}`
                  })()}` }
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

            {/* Western Natal Wheel Chart */}
            {result?.westernChartSvg && result.westernChartSvg.trim().startsWith('<svg') ? (
              <div
                className="chart-container bg-gray-900 rounded-xl overflow-hidden shadow-lg"
                style={{ maxWidth: '640px', margin: '0 auto' }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: result.westernChartSvg }}
                  className="w-full"
                  style={{ aspectRatio: '1 / 1' }}
                />
              </div>
            ) : result && !result.westernChartSvg ? (
              <div className="card mt-8 p-6 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">
                  Western chart not available.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Check: API key, internet, or try different birth details.
                </p>
              </div>
            ) : null}

            {/* Planet Placements */}
            {placements.length > 0 ? (
              <div
                ref={setPlacementsRef}
                id="planet-placements"
                className="card"
                style={{ scrollMarginTop: '96px' }}  // keeps it nicely below your fixed header when scrolled
              >
                <div className="results-header">
                  <Orbit style={{ color: '#7c3aed' }} />
                  <h3 className="results-title">Planet Placements (D1)</h3>
                </div>

                <div className="table-scroll-container">
                  <table className="planet-table">
                    <thead>
                      <tr>
                        <th>Planet</th>
                        <th>Sign</th>
                        <th>House</th>
                        <th>Nakshatra &amp; Pada</th>
                        <th>Full Degree</th>
                        <th>Norm Degree</th>
                        <th>Retro</th>
                        <th>Strength</th>
                        <th>Ishta</th>
                        <th>Kashta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placements.map(p => {
                        const pname = (p.name || '').toString().trim()
                        const lname = pname.toLowerCase()

                        // match shadbala row
                        let row = shadbalaRows.find(r => (r.name || '').toLowerCase() === lname)
                        if (!row) row = shadbalaRows.find(r => (r.name || '').toLowerCase().startsWith(lname))
                        if (!row) row = shadbalaRows.find(r => (r.name || '').toLowerCase().includes(lname))

                        const parsePct = (v) => {
                          const n = Number(v)
                          return Number.isFinite(n) ? n : null
                        }
                        const pctVal   = row ? parsePct(row.percent ?? row.percentage ?? row.percentage_strength ?? row.shadbala_percent ?? row.strength_percent) : null
                        const ishtaVal = row ? parsePct(row.ishta   ?? row.ishta_phala ?? row.ishta_bala ?? row.ishta_percent) : null
                        const kashtaVal= row ? parsePct(row.kashta  ?? row.kashta_phala?? row.kashta_bala?? row.kashta_percent): null

                        return (
                          <tr key={p.name}>
                            <td style={{ fontWeight: 500, color: '#1f2937' }}>{pname}</td>
                            <td>{p.currentSign || '—'}</td>
                            <td>{p.house ?? '—'}</td>
                            <td>{`${p.nakshatra ?? '—'} (Pada:${p.pada ?? '—'})`}</td>
                            <td>{typeof p.fullDegree === 'number' ? `${p.fullDegree.toFixed(2)}°` : '—'}</td>
                            <td>{typeof p.normDegree === 'number' ? `${p.normDegree.toFixed(2)}°` : '—'}</td>
                            <td>{p.retro ? <span style={{ color: '#198754' }}>Retro</span> : <span className="retro-badge">Not Retro</span>}</td>
                            <td>{pctVal != null ? `${pctVal.toFixed(1)}%` : '—'}</td>
                            <td style={{ width: '10rem' }}>
                              {ishtaVal != null ? (
                                <div className="progress-container">
                                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${ishtaVal}%` }} /></div>
                                  <div className="progress-label">{ishtaVal.toFixed(1)}%</div>
                                </div>
                              ) : '—'}
                            </td>
                            <td style={{ width: '10rem' }}>
                              {kashtaVal != null ? (
                                <div className="progress-container">
                                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${kashtaVal}%` }} /></div>
                                  <div className="progress-label">{kashtaVal.toFixed(1)}%</div>
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
            ) : (
              <div className="card">
                <div className="empty-state">No planet data found. Submit the form or try a different timezone.</div>
              </div>
            )}

            {/* Vimshottari Maha Dasha */}
            <div className="card">
              <div className="results-header">
                <Moon style={{ color: '#4f46e5' }} />
                <h3 className="results-title">Vimshottari Maha Dasha</h3>
              </div>

              {mahaRows.length > 0 ? (
                <div className="table-scroll-container">
                  <table className="planet-table">
                    <thead>
                      <tr>
                        <th>Planet</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>AI Predictions</th>
                        <th>MicroAnalysis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mahaRows.map(row => {
                        const startVal = row.start ? new Date(row.start) : null
                        const endVal   = row.end   ? new Date(row.end)   : null
                        const fmt = (d) => d ? d.toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' }) : '—'
                        return (
                          <tr key={row.key} onClick={() => openAntarModalFor(row.lord)} style={{ cursor:'pointer' }}>
                            <td style={{ fontWeight: 500, color: '#1f2937' }}>{row.lord || '—'}</td>
                            <td>{fmt(startVal)}</td>
                            <td>{fmt(endVal)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize:'0.75rem', padding:'0.25rem 0.75rem' }}
                                onClick={(e) => { e.stopPropagation(); openAiPredictionsFor(row.lord); }}>
                                Predict <Cpu />
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ fontSize:'0.75rem', padding:'0.25rem 0.75rem' }}
                                onClick={(e) => { e.stopPropagation(); openAntarModalFor(row.lord); }}>
                                MicroAnalysis
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="maha-note">Note: Click a row to show Antar Dasha periods for that Maha Dasha.</div>
                </div>
              ) : (
                <div className="empty-state">No Maha Dasha data. Submit the form above.</div>
              )}
            </div>
          </div>
        )}

        {/* Antar Dasha Modal */}
        <Modal
          open={antarOpen}
          onClose={() => setAntarOpen(false)}
          title={selectedMaha ? `${selectedMaha} Maha Dasha — Antar Periods` : 'Antar Dasha'}
          position="center"
        >
          {antarLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-4" />
              <div className="text-base text-gray-600 font-medium">Loading Antar Dasha periods...</div>
              <div className="text-sm text-gray-500 mt-1">Calculating planetary sub-periods</div>
            </div>
          ) : antarError ? (
            <div className="py-6 px-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Data</h3>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {antarError}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {antarRows.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Moon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Antar Dasha Data</h3>
                  <p className="text-sm text-gray-500">
                    No sub-periods found for this Maha Dasha. Please submit the form above to generate data.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {antarRows.map((ad, i) => {
                    const startDate = ad.start ? new Date(ad.start).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
                    const endDate = ad.end ? new Date(ad.end).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
                    return (
                      <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gold/20 to-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-purple-700">
                                {ad.lord?.slice(0, 2)?.toUpperCase() || '—'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-base">{ad.lord}</h4>
                              <p className="text-xs text-gray-500">Antar Dasha Lord</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="text-xs text-green-700 font-medium mb-1">START DATE</div>
                            <div className="text-green-800 font-semibold">{startDate}</div>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="text-xs text-red-700 font-medium mb-1">END DATE</div>
                            <div className="text-red-800 font-semibold">{endDate}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* AI Predictions Modal */}
        <Modal
          open={predictionsOpen}
          onClose={() => setPredictionsOpen(false)}
          title={selectedPlanetForPredictions ? `AI Predictions — ${selectedPlanetForPredictions} Maha Dasha` : 'AI Predictions'}
          position="center"
        >
          {predictionsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
              <div className="text-sm text-gray-600">Generating AI predictions...</div>
            </div>
          ) : predictionsError ? (
            <div className="py-4 text-sm text-red-700 bg-red-50 border border-red-300 rounded-lg px-4">
              {predictionsError}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {aiPredictions ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {aiPredictions}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 border border-gray-300">
                  No predictions available.
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setPredictionsOpen(false)}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}