import React from 'react'
import HinduDateCard from './HinduDateCard'
import CalendarCell from './CalendarCell'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Props: data { header, weekdays, month, onPrev?, onNext? }
export default function MonthlyCalendar({ header, weekdays, month, onPrev, onNext, nakshatraMap, sunMap, tithiMap }) {
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

  return (
    <div className="w-full">
      

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
              return (
                <CalendarCell key={`${ri}-${ci}`} cell={mergedCell} nakshatra={nakshatraName} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
