'use client'

import { useEffect, useMemo, useState } from 'react'
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar'
import { WEEKDAYS as weekdays, staticMonth as staticSep } from '@/lib/staticCalendarSep2025'
import astrologyAPI from '@/lib/api'
import { postSamvatInfo, getRealtimeSamvatInfo } from '@/lib/api'

// --- Simple in-memory caches (reset on reload) ---
// Cache month data by (year, month, lat, lon, tz)
const monthDataCache = new Map() // key -> { nakshatraMap, sunMap, tithiMap, savedAt }
// Cache Samvat by (date, lat, lon, tz)
const samvatCache = new Map() // key -> { samvat, savedAt }

// --- Persistent per-day cache (localStorage) ---
const DAY_CACHE_NS = 'calendarDayCache_v1'
function readDayCache() {
  try { return JSON.parse(localStorage.getItem(DAY_CACHE_NS) || '{}') } catch { return {} }
}
function writeDayCache(obj) {
  try { localStorage.setItem(DAY_CACHE_NS, JSON.stringify(obj)) } catch {}
}
function getDayCacheEntry(key) {
  const all = readDayCache()
  return all[key]
}
function setDayCacheEntry(key, value) {
  const all = readDayCache()
  all[key] = { ...value, savedAt: Date.now() }
  // keep store small (~400 entries max)
  const keys = Object.keys(all)
  if (keys.length > 400) {
    keys.sort((a,b) => (all[a].savedAt||0) - (all[b].savedAt||0))
    for (let i=0;i<keys.length-400;i++) delete all[keys[i]]
  }
  writeDayCache(all)
}

function monthLabelFrom(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function weekdayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

// Build a 6x7 grid for the given viewDate (month)
function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() // 0..11

  // If viewing September 2025, return enriched static dataset to restore all previous fields
  if (year === 2025 && month === 8) {
    const today = new Date()
    const isSameDay = (d) =>
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()

    const rows = staticSep.rows.map((row) =>
      row.map((cell) => {
        const cellDate = new Date(2025, 8 + cell.monthOffset, cell.date)
        // Ensure icons default if missing
        const icons = Array.isArray(cell.icons) ? cell.icons : []
        if (!icons.length) {
          // add soft defaults similar to dynamic view
          const weekend = cellDate.getDay() === 0 || cellDate.getDay() === 6
          if (weekend && cell.monthOffset === 0) icons.push('🎉')
          if (cellDate.getDate() === 1 && cell.monthOffset === 0) icons.push('🗓️')
          if (cellDate.getDate() === 15 && cell.monthOffset === 0) icons.push('🌙')
          if (!icons.length) icons.push('📿')
        }
        return {
          ...cell,
          isToday: isSameDay(cellDate),
          icons,
        }
      })
    )

    return {
      monthLabel: 'September 2025',
      weekStart: 0,
      rows,
    }
  }

  // First day of month and its weekday (0=Sun..6=Sat)
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = firstOfMonth.getDay()

  // Days in current and previous month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  // Today reference
  const today = new Date()
  const isSameDay = (d) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  const rows = []
  let dayCounter = 1
  let nextMonthCounter = 1

  for (let r = 0; r < 6; r++) {
    const row = []
    for (let c = 0; c < 7; c++) {
      let dateNum
      let monthOffset
      if (r === 0 && c < firstWeekday) {
        // Overflow from previous month
        dateNum = daysInPrev - (firstWeekday - c - 1)
        monthOffset = -1
      } else if (dayCounter <= daysInMonth) {
        dateNum = dayCounter++
        monthOffset = 0
      } else {
        dateNum = nextMonthCounter++
        monthOffset = 1
      }

      const cellDate = new Date(year, month + monthOffset, dateNum)
      const weekend = cellDate.getDay() === 0 || cellDate.getDay() === 6

      // Decorative emojis
      const icons = []
      if (weekend && monthOffset === 0) icons.push('🎉')
      if (cellDate.getDate() === 1 && monthOffset === 0) icons.push('🗓️')
      if (cellDate.getDate() === 15 && monthOffset === 0) icons.push('🌙')
      if (!icons.length) icons.push('📿')

      row.push({
        date: dateNum,
        monthOffset,
        tithiBand: '—',
        sunrise: '—',
        sunset: '—',
        line1: '—',
        line2: '—',
        isFestival: weekend && monthOffset === 0,
        isToday: isSameDay(cellDate),
        icons,
      })
    }
    rows.push(row)
  }

  return {
    monthLabel: monthLabelFrom(viewDate),
    weekStart: 0,
    rows,
  }
}

function buildHeader(viewDate) {
  return {
    selectedBanner: {
      leftTitle: monthLabelFrom(viewDate),
      leftSubtitle: 'Hindu Calendar',
      era: 'Vikrama Samvat • Kaliyuga',
      location: 'Your Location',
    },
    rightTitle: String(viewDate.getDate()),
    rightSubtitle1: monthLabelFrom(viewDate),
    rightSubtitle2: weekdayName(viewDate),
    ribbons: [],
  }
}

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(new Date())
  const [nakshatraMap, setNakshatraMap] = useState({})
  const [sunMap, setSunMap] = useState({}) // { 'YYYY-MM-DD': { sunrise, sunset } }
  const [tithiMap, setTithiMap] = useState({}) // { 'YYYY-MM-DD': { name, paksha } }
  const [samvat, setSamvat] = useState(null) // { number, yearName }
  const [samvatLoading, setSamvatLoading] = useState(false)
  const [samvatError, setSamvatError] = useState(null)
  const [samvatRaw, setSamvatRaw] = useState('') // short preview for debugging/UX

  const header = useMemo(() => buildHeader(viewDate), [viewDate])
  const headerWithSamvat = useMemo(() => {
    const era = samvat ? `Vikrama Samvat ${samvat.number} • ${samvat.yearName}` : header.selectedBanner.era
    const rightExtra = samvat
      ? `V.S. ${samvat.number || ''}${samvat.yearName ? ` • ${samvat.yearName}` : ''}`.trim()
      : (samvatLoading
          ? 'Fetching Samvat…'
          : (samvatError
              ? (samvatRaw ? `Samvat? ${samvatRaw}` : 'Samvat unavailable')
              : (header?.selectedBanner?.rightExtra)))
    return {
      ...header,
      selectedBanner: {
        ...header.selectedBanner,
        era,
        rightExtra,
      },
    }
  }, [header, samvat, samvatLoading, samvatError])
  const month = useMemo(() => buildMonthGrid(viewDate), [viewDate])

  // Fetch nakshatra and sunrise/sunset for each date in the current (selected) month
  useEffect(() => {
    let cancelled = false

    async function getGeo() {
      try {
        const pos = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'))
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
          })
        })
        return { lat: pos.coords.latitude, lon: pos.coords.longitude }
      } catch (_) {
        // Fallback: Delhi, IN
        return { lat: 28.6139, lon: 77.2090 }
      }
    }

    async function fetchAll() {
      const { lat, lon } = await getGeo()
      const tz = -new Date().getTimezoneOffset() / 60

      // Determine current visible month range
      const y = viewDate.getFullYear()
      const m = viewDate.getMonth() // 0..11
      const daysInMonth = new Date(y, m + 1, 0).getDate()

      // Cache key for month payloads
      const monthKey = `${y}-${m}|${lat.toFixed(3)},${lon.toFixed(3)}|${tz}`
      const cached = monthDataCache.get(monthKey)
      if (cached && !cancelled) {
        setNakshatraMap(cached.nakshatraMap)
        setSunMap(cached.sunMap)
        setTithiMap(cached.tithiMap)
        try { console.log('[MonthCache] HIT', monthKey) } catch {}
        return
      }
      try { console.log('[MonthCache] MISS', monthKey) } catch {}

      const map = {}
      const sun = {}
      const tithis = {}
      const tasks = []
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(y, m, day)
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
            observation_point: 'geocentric',
            ayanamsha: 'lahiri',
            lunar_month_definition: 'amanta',
          },
        }
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const locKey = `${lat.toFixed(3)},${lon.toFixed(3)}|${tz}`
        const dayCacheKey = `${key}|${locKey}`

        // Try persistent cache first (single fetch per day policy)
        const cachedDay = getDayCacheEntry(dayCacheKey)
        if (cachedDay) {
          if (cachedDay.nakshatra?.name) map[key] = { name: cachedDay.nakshatra.name }
          if (cachedDay.tithi?.name) tithis[key] = { name: cachedDay.tithi.name, paksha: cachedDay.tithi.paksha }
          if (cachedDay.sun) sun[key] = { sunrise: cachedDay.sun.sunrise || '—', sunset: cachedDay.sun.sunset || '—' }
          continue
        }

        tasks.push(
          (async (idx) => {
            // Small stagger to be kind to rate limits
            await new Promise((r) => setTimeout(r, idx * 120))
            try {
              // Fetch both nakshatra and tithi with partial-failure tolerance
              const [nakR, tithiR] = await Promise.allSettled([
                astrologyAPI.getSingleCalculation('nakshatra-durations', payload),
                astrologyAPI.getSingleCalculation('tithi-durations', payload),
              ])
              let name = null
              if (nakR.status === 'fulfilled') {
                const res = nakR.value
                // Parse and find the segment covering 12:00 local time for this date
                let out = res?.output ?? res
                try { if (typeof out === 'string') out = JSON.parse(out) } catch {}
                try { if (typeof out === 'string') out = JSON.parse(out) } catch {}

                const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0)

                const parseWhen = (v) => {
                  if (!v) return null
                  const raw = String(v)
                  // Accept 'YYYY-MM-DD HH:MM:SS(.ffffff)' or ISO
                  let normalized = raw.replace(' ', 'T').replace(/\.(\d{1,6})$/, '')
                  const dt = new Date(normalized)
                  if (!isNaN(dt.getTime())) return dt
                  // Fallback: HH:MM
                  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
                  if (m) {
                    const hh = parseInt(m[1], 10) || 0
                    const mm = parseInt(m[2], 10) || 0
                    const ss = parseInt(m[3] || '0', 10) || 0
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, ss)
                  }
                  return null
                }

                const pickSegmentName = (val) => {
                  if (!val) return null
                  const list = Array.isArray(val) ? val : (typeof val === 'object' ? Object.values(val) : [])
                  if (!Array.isArray(list) || !list.length) return null
                  // try find segment that covers target
                  for (const seg of list) {
                    const st = parseWhen(seg?.starts_at || seg?.start_time || seg?.start || seg?.from)
                    const en = parseWhen(seg?.ends_at || seg?.end_time || seg?.end || seg?.to)
                    if (st && en && st <= target && target <= en) {
                      return seg?.name || seg?.nakshatra_name || seg?.nakshatra?.name
                    }
                  }
                  // otherwise pick the first segment's name
                  const first = list[0]
                  return first?.name || first?.nakshatra_name || first?.nakshatra?.name || null
                }

                // Common shapes from API
                name = name || out?.name || out?.nakshatra_name || out?.nakshatra?.name
                name = name || pickSegmentName(out?.durations || out?.data || out)
              }

              map[key] = name ? { name } : (nakR.status === 'rejected' ? { error: nakR.reason?.message || 'failed' } : {})

              // Tithi
              if (tithiR.status === 'fulfilled') {
                let tout = tithiR.value?.output ?? tithiR.value
                try { if (typeof tout === 'string') tout = JSON.parse(tout) } catch {}
                try { if (typeof tout === 'string') tout = JSON.parse(tout) } catch {}
                const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0)
                const parseWhenT = (v) => {
                  if (!v) return null
                  const raw = String(v)
                  let normalized = raw.replace(' ', 'T').replace(/\.(\d{1,6})$/, '')
                  const dt = new Date(normalized)
                  if (!isNaN(dt.getTime())) return dt
                  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
                  if (m) {
                    const hh = parseInt(m[1], 10) || 0
                    const mm = parseInt(m[2], 10) || 0
                    const ss = parseInt(m[3] || '0', 10) || 0
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, ss)
                  }
                  return null
                }
                const pickTithi = (val) => {
                  const list = Array.isArray(val) ? val : (typeof val === 'object' ? Object.values(val) : [])
                  for (const seg of list) {
                    const st = parseWhenT(seg?.starts_at || seg?.start_time || seg?.start || seg?.from)
                    const en = parseWhenT(seg?.ends_at || seg?.end_time || seg?.end || seg?.to)
                    if (st && en && st <= target && target <= en) {
                      const nm = seg?.name || seg?.tithi_name || seg?.tithi?.name
                      const pk = seg?.paksha || seg?.tithi?.paksha
                      return { name: nm, paksha: pk }
                    }
                  }
                  const first = list[0] || {}
                  return { name: first?.name || first?.tithi_name || first?.tithi?.name, paksha: first?.paksha || first?.tithi?.paksha }
                }
                let tval = tout?.name ? { name: tout.name, paksha: tout?.paksha } : pickTithi(tout?.durations || tout?.data || tout)
                if (tval?.name) tithis[key] = tval
              }

              // Sun data
              try {
                const sunData = await astrologyAPI.getSunMoonData(lat, lon, d)
                const astro = sunData?.astronomy || {}
                const fmt = (hhmm) => {
                  if (!hhmm || hhmm === '-:-') return null
                  try {
                    const [H, M] = String(hhmm).split(':').map((v) => parseInt(v, 10))
                    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate(), H || 0, M || 0, 0)
                    return local.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' AM','AM').replace(' PM','PM')
                  } catch {
                    return hhmm
                  }
                }
                const sunrise = fmt(astro.sunrise)
                const sunset = fmt(astro.sunset)
                if (sunrise || sunset) sun[key] = { sunrise: sunrise || '—', sunset: sunset || '—' }
              } catch (_) {
                // fallback if API fails
                sun[key] = { sunrise: '06:00AM', sunset: '06:00PM' }
              }

              // Persist this day so we don't fetch it again today
              setDayCacheEntry(dayCacheKey, {
                nakshatra: map[key]?.name ? { name: map[key].name } : undefined,
                tithi: tithis[key] || undefined,
                sun: sun[key] || undefined,
              })
            } catch (e) {
              // Record failure minimally so UI doesn't break and continue with other days
              if (!map[key]) map[key] = { error: e?.message || 'failed' }
            }
          })(day - 1)
        )
      }

      await Promise.all(tasks)
      if (!cancelled) {
        setNakshatraMap(map)
        setSunMap(sun)
        setTithiMap(tithis)
        // Save to cache with simple size control (LRU-like purge if > 8 entries)
        monthDataCache.set(monthKey, { nakshatraMap: map, sunMap: sun, tithiMap: tithis, savedAt: Date.now() })
        if (monthDataCache.size > 8) {
          // delete oldest
          let oldestKey = null, oldestTs = Infinity
          for (const [k, v] of monthDataCache.entries()) {
            if (v.savedAt < oldestTs) { oldestTs = v.savedAt; oldestKey = k }
          }
          if (oldestKey) monthDataCache.delete(oldestKey)
        }
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [viewDate])

  // Fetch Samvat (Vikrama) details for the header card using /samvatinfo
  useEffect(() => {
    let cancelled = false
    setSamvatLoading(true)
    setSamvatError(null)

    async function getGeo() {
      try {
        const pos = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'))
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
          })
        })
        return { lat: pos.coords.latitude, lon: pos.coords.longitude }
      } catch (_) {
        return { lat: 28.6139, lon: 77.2090 }
      }
    }

    async function parseSamvat(outLike) {
      let out = outLike
      try { if (typeof out === 'string') out = JSON.parse(out) } catch {}
      try { if (typeof out === 'string') out = JSON.parse(out) } catch {}
      if (out && typeof out === 'object' && out.output) {
        // Nested output field
        out = out.output
        try { if (typeof out === 'string') out = JSON.parse(out) } catch {}
        try { if (typeof out === 'string') out = JSON.parse(out) } catch {}
      }
      let number = out?.vikram_chaitradi_number
      let yearName = out?.vikram_chaitradi_year_name
      // Try alternative keys just in case
      number = number
        ?? out?.vikram_chaitradi_name_number
        ?? out?.vikram_chaitradi?.number
        ?? out?.vikrama_samvat_number
        ?? out?.vikram_samvat_number
        ?? out?.vikrama_samvat?.number
      yearName = yearName
        ?? out?.vikram_chaitradi?.year_name
        ?? out?.vikram_chaitradi_year
        ?? out?.vikrama_samvat_year_name
        ?? out?.vikram_samvat_year_name
        ?? out?.vikrama_samvat?.year_name

      // Regex fallback if still not found and we have a string blob
      if ((number == null || yearName == null) && typeof outLike === 'string') {
        const s = outLike
        const nMatch = s.match(/\bvikram_chaitradi_(?:number|name_number)\b\s*:\s*(\d{3,4})/i)
        const yMatch = s.match(/\bvikram_chaitradi_year_name\b\s*:\s*\"?([^\",}]+)\"?/i)
        if (nMatch && !number) number = parseInt(nMatch[1], 10)
        if (yMatch && !yearName) yearName = yMatch[1]
      }

      return { number, yearName, raw: out }
    }

    function approxVikramNumber(date) {
      const y = date.getFullYear()
      const m = date.getMonth() + 1 // 1..12
      // Approx: Vikram year increments around Chaitra (Mar/Apr). Use April as a simple boundary.
      return y + (m >= 4 ? 57 : 56)
    }

    async function fetchSamvat() {
      const { lat, lon } = await getGeo()
      const tz = -new Date().getTimezoneOffset() / 60
      const d = viewDate
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
          observation_point: 'topocentric',
          ayanamsha: 'lahiri',
          lunar_month_definition: 'amanta',
        },
      }

      // Cache key per date and location
      const dKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const samvatKey = `${dKey}|${lat.toFixed(3)},${lon.toFixed(3)}|${tz}`
      const cached = samvatCache.get(samvatKey)
      if (cached && cached.samvat && !cancelled) {
        try { console.log('[SamvatCache] HIT', samvatKey, cached.samvat) } catch {}
        setSamvat(cached.samvat)
        setSamvatError(null)
        setSamvatLoading(false)
        return
      }
      try { console.log('[SamvatCache] MISS', samvatKey) } catch {}

      try {
        // Prefer server route first to avoid CORS failures in browser
        try { console.log('[Samvat] Payload (/samvatinfo) →', payload) } catch {}
        const res = await postSamvatInfo(payload)
        try { console.log('[Samvat] Response (/samvatinfo) ←', res) } catch {}
        const parsed = await parseSamvat(res?.output ?? res)
        const { number, yearName } = parsed
        if (!cancelled && (number || yearName)) {
          try { console.log('[Samvat] Route OK', { number, yearName }) } catch {}
          setSamvat({ number, yearName })
          setSamvatError(null)
          setSamvatRaw('')
          samvatCache.set(samvatKey, { samvat: { number, yearName }, savedAt: Date.now() })
          return
        }

        // Do NOT call upstream directly from browser to avoid CORS. If route failed, continue to other fallbacks.

        // 3) Realtime helper
        const rt = await getRealtimeSamvatInfo()
        const parsedRt = await parseSamvat(rt?.output ?? rt)
        const { number: nR, yearName: yR } = parsedRt
        if (!cancelled && (nR || yR)) {
          try { console.log('[Samvat] Realtime OK', { nR, yR }) } catch {}
          setSamvat({ number: nR, yearName: yR })
          setSamvatError(null)
          setSamvatRaw('')
          samvatCache.set(samvatKey, { samvat: { number: nR, yearName: yR }, savedAt: Date.now() })
          return
        }

        // None yielded values
        if (!cancelled) {
          // As a last resort, show approximate Vikram Samvat number
          const approx = approxVikramNumber(d)
          setSamvat({ number: approx, yearName: '' })
          setSamvatError('approx')
          const rawStr = typeof parsedRt?.raw === 'string' ? parsedRt.raw : JSON.stringify(parsedRt?.raw || parsed?.raw || parsedD?.raw || '').slice(0, 60)
          setSamvatRaw(rawStr)
          samvatCache.set(samvatKey, { samvat: { number: approx, yearName: '' }, savedAt: Date.now() })
        }
      } catch (err) {
        try { console.warn('[Samvat] All attempts failed', err) } catch {}
        if (!cancelled) {
          const approx = approxVikramNumber(d)
          setSamvat({ number: approx, yearName: '' })
          setSamvatError('approx')
          setSamvatRaw('')
          samvatCache.set(samvatKey, { samvat: { number: approx, yearName: '' }, savedAt: Date.now() })
        }
      }
      if (!cancelled) setSamvatLoading(false)
    }

    fetchSamvat()
    return () => { cancelled = true }
  }, [viewDate])

  const handlePrev = () => {
    const d = new Date(viewDate)
    d.setMonth(d.getMonth() - 1)
    setViewDate(d)
  }

  const handleNext = () => {
    const d = new Date(viewDate)
    d.setMonth(d.getMonth() + 1)
    setViewDate(d)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MonthlyCalendar header={headerWithSamvat} weekdays={weekdays} month={month} onPrev={handlePrev} onNext={handleNext} nakshatraMap={nakshatraMap} sunMap={sunMap} tithiMap={tithiMap} />
      </main>
    </div>
  )
}
