import React from 'react'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Props: cell { date, monthOffset, tithiBand, sunrise, sunset, line1, line2, isFestival, isToday, tone, icons }
export default function CalendarCell({ cell }) {
  const isOverflow = cell.monthOffset !== 0
  const bandClasses = classNames(
    'px-2 py-1 text-[11px] border-b flex items-center justify-between',
    cell.isFestival ? 'bg-amber-100/80 border-amber-200 text-amber-800' : 'bg-gray-100 border-gray-200 text-gray-700'
  )
  const containerClasses = classNames(
    'min-h-[140px] rounded-md border overflow-hidden flex flex-col',
    cell.isToday ? 'ring-2 ring-emerald-500' : '',
    isOverflow ? 'bg-gray-50 border-gray-100 text-gray-400' : 'bg-white border-gray-200'
  )
  const dateClasses = classNames(
    'text-2xl font-bold',
    cell.isToday ? 'text-emerald-700' : isOverflow ? 'text-gray-400' : 'text-gray-800'
  )

  return (
    <div className={containerClasses}>
      <div className={bandClasses}>
        <div className="truncate font-medium">{cell.tithiBand || '—'}</div>
        <div className="text-[10px] text-gray-500">IN {cell.date}</div>
      </div>
      <div className="flex-1 px-2 pt-1 pb-2 flex flex-col">
        <div className="flex items-baseline justify-between">
          <div className={dateClasses}>{cell.date}</div>
          {cell.isFestival && (
            <div className="text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">Festival</div>
          )}
        </div>
        {/* Sunrise/Sunset compact row */}
        <div className="mt-1 text-[10px] text-gray-600 flex items-center gap-2">
          <span>↑ {cell.sunrise || '—'}</span>
          <span>↓ {cell.sunset || '—'}</span>
        </div>
        {/* Detail lines */}
        <ul className="mt-1 text-[10px] text-gray-700 space-y-0.5 list-disc list-inside">
          <li>{cell.line1 || '—'}</li>
          <li>{cell.line2 || '—'}</li>
        </ul>
        {/* Icons placeholder */}
        {!!cell.icons?.length && (
          <div className="mt-1 text-xs">{cell.icons.join(' ')}</div>
        )}
        <div className="mt-auto" />
      </div>
    </div>
  )
}
