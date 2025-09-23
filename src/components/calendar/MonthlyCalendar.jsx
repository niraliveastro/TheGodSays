import React from 'react'
import CalendarCell from './CalendarCell'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Props: data { header, weekdays, month }
export default function MonthlyCalendar({ header, weekdays, month }) {
  return (
    <div className="w-full">
      {/* Top banner */}
      <div className="bg-gray-700 text-white rounded-t-lg px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold">{header.selectedBanner.leftTitle}</div>
            <div className="text-sm opacity-90">{header.selectedBanner.leftSubtitle}</div>
            <div className="text-xs opacity-80">{header.selectedBanner.era}</div>
            <div className="text-xs mt-1 opacity-80">{header.selectedBanner.location}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{header.rightTitle}</div>
            <div className="text-sm opacity-90">{header.rightSubtitle1}</div>
            <div className="text-xs opacity-80">{header.rightSubtitle2}</div>
          </div>
        </div>
        {/* Ribbons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {header.ribbons.map((r, idx) => (
            <span key={idx} className="inline-block text-[11px] bg-rose-200/90 text-rose-900 px-2 py-0.5 rounded">
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Weekday header row */}
      <div className="grid grid-cols-8 gap-1 mt-1">
        <div />
        {weekdays.map((w) => (
          <div key={w.en} className="bg-gray-100 border border-gray-200 rounded text-center py-2">
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
            {row.map((cell, ci) => (
              <CalendarCell key={`${ri}-${ci}`} cell={cell} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
