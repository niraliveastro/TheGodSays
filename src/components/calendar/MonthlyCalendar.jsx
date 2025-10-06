"use client"
import React, { useCallback, useMemo, useState, useEffect } from 'react'
import HinduDateCard from './HinduDateCard'
import CalendarCell from './CalendarCell2'
import Modal from '@/components/Modal'
import astrologyAPI from '@/lib/api'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Props: data { header, weekdays, month, onPrev?, onNext? }
export default function MonthlyCalendar({ header, weekdays, month, onPrev, onNext, nakshatraMap, sunMap, tithiMap }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDateKey, setModalDateKey] = useState(null)
  const [modalCell, setModalCell] = useState(null)
  const [modalNakshatra, setModalNakshatra] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreData, setMoreData] = useState(null)
  const [detailsCache, setDetailsCache] = useState({}) // { [dateKey]: mergedResults }

  // Local storage helpers (safe in browser only)
  const STORAGE_PREFIX = 'tgs:date-details:'
  const readFromStorage = (key) => {
    try {
      if (typeof window === 'undefined') return null
      const raw = localStorage.getItem(STORAGE_PREFIX + key)
      if (!raw) return null
      return JSON.parse(raw)
    } catch { return null }
  }
  const writeToStorage = (key, value) => {
    try {
      if (typeof window === 'undefined') return
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    } catch {}
  }
  const formatTime = (val) => {
    try {
      if (!val) return '-'
      // If it's already like HH:MM AM/PM, return as is
      if (typeof val === 'string' && /am|pm|AM|PM/.test(val)) return val
      const dt = new Date(val)
      if (!isNaN(dt)) {
        return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
      // Fallback: try to slice HH:MM from strings
      if (typeof val === 'string' && /\d{2}:\d{2}/.test(val)) {
        const m = val.match(/\d{2}:\d{2}/)
        return m ? m[0] : val
      }
      return String(val)
    } catch { return String(val || '-') }
  }

  const formatRange = (item) => {
    try {
      if (!item) return '-'
      // If already a string, return as is
      if (typeof item === 'string') return item
      // Common shapes: { start_time, end_time } or { start, end }
      const s = item.start_time || item.start || item.startTime || item.starts_at || item.startsAt
      const e = item.end_time || item.end || item.endTime || item.ends_at || item.endsAt
      if (s || e) return `${formatTime(s) || '-'} — ${formatTime(e) || '-'}`
      // Arrays of ranges
      if (Array.isArray(item)) {
        return item.map((x, i) => `${i + 1}. ${formatRange(x)}`).join('\n')
      }
      // Unknown object: stringify compactly
      return JSON.stringify(item)
    } catch {
      return '-'
    }
  }
  const parseOutput = (val) => {
    // Handles shapes like { statusCode: 200, output: "{...}" }
    try {
      if (!val) return null
      if (val.output && typeof val.output === 'string') {
        try { return JSON.parse(val.output) } catch (_) { return val.output }
      }
      return val
    } catch { return val }
  }
  const isSuccess = (val) => {
    if (!val) return false
    if (typeof val === 'object' && 'statusCode' in val) return Number(val.statusCode) === 200
    return true
  }
  const extractRanges = (val) => {
    // Returns an array of { start: ?, end: ? }
    const v = parseOutput(val)
    if (!v) return []
    // Already an array of ranges or objects
    if (Array.isArray(v)) {
      return v.map((x) => ({ start: x.starts_at || x.start_time || x.start || x.startTime, end: x.ends_at || x.end_time || x.end || x.endTime })).filter(r => r.start || r.end)
    }
    // Object with numeric keys like {"1":{...}, "2":{...}}
    const keys = Object.keys(v)
    if (keys.some(k => /^(\d+)$/.test(k))) {
      return keys
        .map(k => v[k])
        .map(x => ({ start: x?.starts_at || x?.start_time || x?.start || x?.startTime, end: x?.ends_at || x?.end_time || x?.end || x?.endTime }))
        .filter(r => r.start || r.end)
    }
    // Single object with start/end
    if (typeof v === 'object') {
      const s = v.starts_at || v.start_time || v.start || v.startTime
      const e = v.ends_at || v.end_time || v.end || v.endTime
      if (s || e) return [{ start: s, end: e }]
    }
    return []
  }
  // Pick the highlighted cell: today if present, else first current-month cell
  const flatCells = month.rows.flat()
  const selectedCell = flatCells.find(c => c.isToday) || flatCells.find(c => c.monthOffset === 0) || flatCells[0]
  const baseDate = new Date()
  // Try to reconstruct the actual Gregorian date for the selected cell
  // We infer current view month from month.monthLabel
  let viewYear = baseDate.getFullYear()
  let viewMonth = baseDate.getMonth()
  try {
    const parts = String(month.monthLabel).split(' ')
    const mName = parts[0]
    const yVal = parseInt(parts[1], 10)
    const monthIndex = new Date(`${mName} 1, ${isNaN(yVal) ? baseDate.getFullYear() : yVal}`).getMonth()
    viewMonth = monthIndex
    viewYear = isNaN(yVal) ? baseDate.getFullYear() : yVal
  } catch {}
  const selectedGregorian = new Date(viewYear, viewMonth + (selectedCell?.monthOffset || 0), selectedCell?.date || 1)

  const tithi = (selectedCell?.tithiBand || '-').split(' ')[0] || '-'
  const gregDate = selectedGregorian.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
  const weekday = selectedGregorian.toLocaleDateString('en-US', { weekday: 'long' })
  const dayNumber = String(selectedGregorian.getDate()).padStart(1, '0')
  const eraLine = header?.selectedBanner?.era || '-'
  const shakaLine = header?.selectedBanner?.leftSubtitle || '-'
  const y = selectedGregorian.getFullYear()
  const m = String(selectedGregorian.getMonth() + 1).padStart(2, '0')
  const d = String(selectedGregorian.getDate()).padStart(2, '0')
  const dateKey = `${y}-${m}-${d}`
  const nakshatraName = nakshatraMap?.[dateKey]?.name || nakshatraMap?.[dateKey]?.nakshatra_name || nakshatraMap?.[dateKey]?.nakshatra?.name
  const primaryTitle = nakshatraName || header?.selectedBanner?.leftSubtitle?.replace(', ', ' ') || header?.selectedBanner?.leftTitle || month.monthLabel

  // Auto-fetch detailed data when modal opens
  useEffect(() => {
    let cancelled = false
    const fetchDetails = async () => {
      if (!modalOpen || !modalDateKey) return
      // 1) Serve from in-memory cache immediately if available
      let cached = detailsCache?.[modalDateKey]
      if (cached) {
        setMoreData(cached)
        return
      }
      // 2) Try localStorage cache
      const stored = readFromStorage(modalDateKey)
      if (stored) {
        setMoreData(stored)
        setDetailsCache(prev => ({ ...prev, [modalDateKey]: stored }))
        return
      }
      try {
        setLoadingMore(true)
        // Try geolocation; fall back to 0,0 if denied
        let latitude = 0
        let longitude = 0
        try {
          const pos = await new Promise((res, rej) => {
            if (!navigator.geolocation) return rej(new Error('Geolocation not supported'))
            navigator.geolocation.getCurrentPosition(res, rej)
          })
          latitude = pos.coords.latitude
          longitude = pos.coords.longitude
        } catch (_) {
          // keep defaults
        }
        const date = new Date(modalDateKey)
        const payload = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          date: date.getDate(),
          hours: 12,
          minutes: 0,
          seconds: 0,
          latitude,
          longitude,
          timezone: -new Date().getTimezoneOffset() / 60,
          config: {
            observation_point: 'topocentric',
            ayanamsha: 'lahiri',
            lunar_month_definition: 'amanta',
          },
        }
        const [{ results: pResults }, { results: aResults }] = await Promise.all([
          astrologyAPI.getPanchangData(payload),
          astrologyAPI.getAuspiciousData(payload),
        ])
        if (!cancelled) {
          let merged = { ...pResults, ...aResults }

          // Fallback: if amrit-kaal or varjyam are missing or failed (statusCode!=200), retry individually
          const needsAmrit = !merged['amrit-kaal'] || (merged['amrit-kaal'] && merged['amrit-kaal'].statusCode && Number(merged['amrit-kaal'].statusCode) !== 200)
          const needsVarjyam = !merged['varjyam'] || (merged['varjyam'] && merged['varjyam'].statusCode && Number(merged['varjyam'].statusCode) !== 200)

          try {
            if (needsAmrit) {
              const amrit = await astrologyAPI.getSingleCalculation('amrit-kaal', payload)
              merged['amrit-kaal'] = amrit
            }
            if (needsVarjyam) {
              const varj = await astrologyAPI.getSingleCalculation('varjyam', payload)
              merged['varjyam'] = varj
            }
          } catch (_) {}

          // If still not successful and geolocation defaulted to 0,0, retry with a sensible India default (Ujjain) and IST timezone
          const usedFallbackGeo = latitude === 0 && longitude === 0
          const amritBad = !merged['amrit-kaal'] || (merged['amrit-kaal'] && merged['amrit-kaal'].statusCode && Number(merged['amrit-kaal'].statusCode) !== 200)
          const varjBad = !merged['varjyam'] || (merged['varjyam'] && merged['varjyam'].statusCode && Number(merged['varjyam'].statusCode) !== 200)
          if (usedFallbackGeo && (amritBad || varjBad)) {
            const altPayload = { ...payload, latitude: 23.1765, longitude: 75.7885, timezone: 5.5 }
            try {
              if (amritBad) {
                const amrit2 = await astrologyAPI.getSingleCalculation('amrit-kaal', altPayload)
                merged['amrit-kaal'] = amrit2
              }
              if (varjBad) {
                const varj2 = await astrologyAPI.getSingleCalculation('varjyam', altPayload)
                merged['varjyam'] = varj2
              }
            } catch (_) {}
          }

          setMoreData(merged)
          setDetailsCache(prev => ({ ...prev, [modalDateKey]: merged }))
          writeToStorage(modalDateKey, merged)
        }
      } catch (e) {
        console.warn('Auto-fetch details failed', e)
      } finally {
        if (!cancelled) setLoadingMore(false)
      }
    }
    fetchDetails()
    return () => {
      cancelled = true
    }
  }, [modalOpen, modalDateKey, detailsCache])

  return (
    <div className="w-full">
      {modalOpen ? (
        <div
          style={{ position: 'fixed', right: 8, bottom: 8, zIndex: 10000 }}
          className="px-2 py-1 text-xs rounded bg-emerald-600 text-white shadow"
        >
          Modal Open
        </div>
      ) : null}
      

      {/* Top-left Hindu date card */}
      <div className="mt-2">
        <HinduDateCard
          heading="Today's Hindu Date"
          primaryTitle={primaryTitle}
          tithi={tithi}
          dayNumber={dayNumber}
          gregDate={gregDate}
          weekday={weekday}
          eraLine={eraLine}
          shakaLine={shakaLine}
          rightExtra={header?.selectedBanner?.rightExtra}
        />
      </div>

      {/* Month controls */}
      <div className="flex items-center justify-between bg-white/90 backdrop-blur border-x border-b border-gray-200 rounded-b-xl px-3 py-2 mt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className={classNames(
              'w-8 h-8 rounded-full border text-sm flex items-center justify-center transition-all',
              onPrev ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:shadow' : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
            )}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className={classNames(
              'w-8 h-8 rounded-full border text-sm flex items-center justify-center transition-all',
              onNext ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:shadow' : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
            )}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div className="text-base font-semibold text-gray-800 tracking-wide">
          {month.monthLabel}
        </div>
      </div>

      {/* Weekday header row */}
      <div className="grid grid-cols-8 gap-1 mt-1">
        <div />
        {weekdays.map((w) => (
          <div key={w.en} className="bg-gray-100/80 border border-gray-200 rounded text-center py-2">
            <div className="text-[12px] font-semibold text-gray-700">{w.en}</div>
            <div className="text-[10px] text-gray-500">{w.hi}</div>
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="space-y-1 mt-1">
        {month.rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-8 gap-1">
            {/* Left weekday column */}
            <div className="bg-gray-200/90 text-gray-800 border border-gray-300 rounded flex flex-col items-center justify-center p-2">
              <div className="text-xs font-bold">{weekdays[ri]?.en || ''}</div>
              <div className="text-[10px]">{weekdays[ri]?.hi || ''}</div>
            </div>
            {row.map((cell, ci) => {
              // Compute the ISO date key for this cell relative to the current view month/year
              const cellDate = new Date(viewYear, viewMonth + (cell?.monthOffset || 0), cell?.date || 1)
              const y = cellDate.getFullYear()
              const m = String(cellDate.getMonth() + 1).padStart(2, '0')
              const d = String(cellDate.getDate()).padStart(2, '0')
              const dateKey = `${y}-${m}-${d}`
              const nm = nakshatraMap?.[dateKey]
              const nakshatraName = nm?.name || nm?.nakshatra_name || nm?.nakshatra?.name
              const sm = sunMap?.[dateKey] || {}
              const tm = tithiMap?.[dateKey] || null
              const tithiText = tm && tm.name ? `${tm.name}${tm.paksha ? ` (${tm.paksha})` : ''}` : undefined
              const mergedCell = {
                ...cell,
                ...(sm.sunrise || sm.sunset ? { sunrise: sm.sunrise || cell.sunrise, sunset: sm.sunset || cell.sunset } : {}),
                ...(tithiText ? { tithiBand: tithiText } : {}),
              }
              const openModal = () => {
                try { console.log('[Calendar] Cell click', { dateKey, mergedCell, nakshatraName }) } catch {}
                setModalDateKey(dateKey)
                setModalCell(mergedCell)
                setModalNakshatra(nakshatraName)
                // Prime from cache if present (in-memory or localStorage), so UI shows instantly
                const cached = detailsCache?.[dateKey] || readFromStorage(dateKey)
                setMoreData(cached || null)
                // Defer opening to next tick to avoid the click bubbling to the backdrop and closing immediately
                setTimeout(() => setModalOpen(true), 0)
              }
              return (
                <CalendarCell key={`${ri}-${ci}`} cell={mergedCell} nakshatra={nakshatraName} onClick={openModal} />
              )
            })}
          </div>
        ))}
      </div>

      {/* Auto-fetch details when modal opens */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalDateKey ? new Date(modalDateKey).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : 'Date details'}
      >
        {(() => { try { if (modalOpen) console.log('[Modal] rendering', { modalOpen, modalDateKey, hasCell: !!modalCell }) } catch {} return null })()}
        {modalCell ? (
          <div className="space-y-4">
            {/* Quick summary - vertical stack */}
            <div className="grid grid-cols-1 gap-3">
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-[12px] text-gray-500">Tithi</div>
                <div className="text-sm font-semibold">{modalCell.tithiBand || '-'}</div>
              </div>
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-[12px] text-gray-500">Nakshatra</div>
                <div className="text-sm font-semibold">{modalNakshatra || '-'}</div>
              </div>
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-[12px] text-gray-500">Sunrise</div>
                <div className="text-sm font-semibold">{modalCell.sunrise || '-'}</div>
              </div>
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-[12px] text-gray-500">Sunset</div>
                <div className="text-sm font-semibold">{modalCell.sunset || '-'}</div>
              </div>
            </div>

            {/* Detailed sections - two columns: left Panchang, right Auspicious */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg">
                <div className="px-3 py-2 border-b bg-white font-semibold text-sm">Panchang</div>
                <div className="p-3 text-sm">
                  <ul className="divide-y">
                    <li className="py-2 flex justify-between"><span className="text-gray-500">Weekday</span><span>{new Date(modalDateKey).toLocaleDateString('en-US', { weekday: 'long' })}</span></li>
                    <li className="py-2 flex justify-between"><span className="text-gray-500">Nakshatra</span><span>{modalNakshatra || '-'}</span></li>
                    <li className="py-2 flex justify-between"><span className="text-gray-500">Tithi</span><span>{modalCell.tithiBand || '-'}</span></li>
                    <li className="py-2 flex justify-between"><span className="text-gray-500">Sunrise</span><span>{modalCell.sunrise || '-'}</span></li>
                    <li className="py-2 flex justify-between"><span className="text-gray-500">Sunset</span><span>{modalCell.sunset || '-'}</span></li>
                  </ul>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="px-3 py-2 border-b bg-white font-semibold text-sm">Auspicious Details</div>
                <div className="p-3 text-sm">
                  {loadingMore && !moreData ? (
                    <div className="text-xs text-gray-500">Loading…</div>
                  ) : (
                    <>
                      <ul className="divide-y">
                        {moreData?.['rahu-kalam'] ? (
                          <li className="py-2 flex justify-between"><span>Rahu</span><span className="text-xs text-gray-700">{formatRange(parseOutput(moreData['rahu-kalam']))}</span></li>
                        ) : null}
                        {moreData?.['gulika-kalam'] ? (
                          <li className="py-2 flex justify-between"><span>Gulika</span><span className="text-xs text-gray-700">{formatRange(parseOutput(moreData['gulika-kalam']))}</span></li>
                        ) : null}
                        {moreData?.['yama-gandam'] ? (
                          <li className="py-2 flex justify-between"><span>Yamaganda</span><span className="text-xs text-gray-700">{formatRange(parseOutput(moreData['yama-gandam']))}</span></li>
                        ) : null}
                      </ul>
                      {moreData?.['abhijit-muhurat'] ? (
                        <div className="mt-3">
                          <div className="font-semibold text-sm">Abhijit Muhurat</div>
                          <div className="text-xs text-gray-700">{formatRange(parseOutput(moreData['abhijit-muhurat']))}</div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Important Timings */}
            <div className="border rounded-lg">
              <div className="px-3 py-2 border-b bg-white font-semibold text-sm">Important Timing's</div>
              <div className="p-3 text-sm space-y-3">
                {loadingMore && !moreData ? (
                  <div className="text-xs text-gray-500">Loading…</div>
                ) : (
                  <>
                    {(() => {
                      const val = moreData?.['dur-muhurat']
                      if (!val || !isSuccess(val)) return null
                      const ranges = extractRanges(val)
                      if (!ranges.length) return null
                      return (
                        <div>
                          <div className="font-semibold">Dur Muhurat</div>
                          <ul className="text-xs text-gray-700">
                            {ranges.map((r, i) => (
                              <li key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    })()}
                    {(() => {
                      const val = moreData?.['amrit-kaal']
                      if (!val || !isSuccess(val)) return (
                        <div><div className="font-semibold">Amrit Kaal</div><div className="text-xs text-gray-500">Not available</div></div>
                      )
                      const ranges = extractRanges(val)
                      if (!ranges.length) return null
                      return (
                        <div>
                          <div className="font-semibold">Amrit Kaal</div>
                          <ul className="text-xs text-gray-700">
                            {ranges.map((r, i) => (
                              <li key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    })()}
                    {(() => {
                      const val = moreData?.['varjyam']
                      if (!val || !isSuccess(val)) return (
                        <div><div className="font-semibold">Varjyam</div><div className="text-xs text-gray-500">Not available</div></div>
                      )
                      const ranges = extractRanges(val)
                      if (!ranges.length) return null
                      return (
                        <div>
                          <div className="font-semibold">Varjyam</div>
                          <ul className="text-xs text-gray-700">
                            {ranges.map((r, i) => (
                              <li key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm text-gray-600">Loading date details…</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
