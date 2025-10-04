import React from 'react'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Props: cell { date, monthOffset, tithiBand, sunrise, sunset, line1, line2, isFestival, isToday, tone, icons } and optional nakshatra
export default function CalendarCell({ cell, nakshatra }) {
  const isOverflow = cell.monthOffset !== 0
  const bandClasses = classNames(
    'px-2 py-1 text-[11px] border-b flex items-center justify-between',
    cell.isFestival ? 'bg-amber-100/80 border-amber-200 text-amber-800' : 'bg-gray-100 border-gray-200 text-gray-700'
  )
  const containerClasses = classNames(
    'min-h-[150px] rounded-lg border overflow-hidden flex flex-col transition-all duration-150',
    cell.isToday ? 'ring-2 ring-emerald-500' : '',
    isOverflow ? 'bg-gray-50 border-gray-100 text-gray-400' : 'bg-white border-gray-200 hover:shadow-sm hover:-translate-y-[1px]'
  )

  const dateClasses = classNames(
    'text-2xl font-extrabold flex items-center gap-1',
    cell.isToday ? 'text-emerald-700' : isOverflow ? 'text-gray-400' : 'text-gray-800'
  )

  // For overflow (previous/next month) cells, render an empty placeholder to ensure only
  // the actual dates of the month are visible (28/29/30/31 as applicable)
  if (isOverflow) {
    return <div className="min-h-[150px] rounded-lg border border-gray-100 bg-gray-50" />
  }

  return (
    <div className={containerClasses}>
      <div className={bandClasses}>
        <div className="truncate font-medium flex items-center gap-1">
          <span>{cell.tithiBand || '—'}</span>
        </div>
        <div className="text-[10px] text-gray-500">IN {cell.date}</div>
      </div>
      <div className="flex-1 px-2 pt-1 pb-2 flex flex-col">
        <div className="flex items-baseline justify-between">
          <div className={dateClasses}>
            <span>{cell.date}</span>
            {!!cell.icons?.length && (
              <span className="text-base">{cell.icons.join(' ')}</span>
            )}
          </div>
        </div>
        {/* Sunrise / Sunset on two lines with emojis */}
        <div className="mt-0.5 text-gray-600 space-y-0.5">
          <div className="text-[9px] leading-none whitespace-nowrap">🌅 {cell.sunrise || '—'}</div>
          <div className="text-[9px] leading-none whitespace-nowrap">🌇 {cell.sunset || '—'}</div>
        </div>
        {/* Detail lines */}
        <ul className="mt-1 text-[10px] text-gray-700 space-y-0.5 list-disc list-inside">
          <li>{nakshatra || cell.line1 || '—'}</li>
          <li>{cell.line2 || '—'}</li>
        </ul>
        <div className="mt-auto" />
      </div>
    </div>
  )
}
