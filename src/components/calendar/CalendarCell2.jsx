import React from 'react'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Props: cell { date, monthOffset, tithiBand, sunrise, sunset, line1, line2, isFestival, isToday, tone, icons }
// Optional: nakshatra, onClick
export default function CalendarCell2({ cell, nakshatra, onClick }) {
  const isOverflow = cell.monthOffset !== 0
  const bandClasses = classNames(
    'px-2 py-1 text-[11px] border-b flex items-center justify-between',
    cell.isFestival ? 'bg-amber-100/80 border-amber-200 text-amber-800' : 'bg-gray-100 border-gray-200 text-gray-700'
  )
  const containerClasses = classNames(
    'min-h-[150px] rounded-lg border-4 border-gray-400 overflow-hidden flex flex-col transition-all duration-150',
    cell.isToday ? 'ring-2 ring-emerald-500' : '',
    isOverflow ? 'bg-gray-50 text-gray-400' : 'bg-white hover:shadow-sm hover:-translate-y-[1px] cursor-pointer'
  )

  const dateClasses = classNames(
    'text-2xl font-extrabold flex items-center gap-1',
    cell.isToday ? 'text-emerald-700' : isOverflow ? 'text-gray-400' : 'text-gray-800'
  )

  if (isOverflow) {
    return (
      <div
        className={classNames(
          'min-h-[150px] rounded-lg bg-gray-50 border-4 border-gray-400',
          onClick ? 'cursor-pointer hover:shadow-sm hover:-translate-y-[1px] transition-all duration-150' : ''
        )}
        style={{ border: '3px solid #9CA3AF' }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick()
        }}
      />
    )
  }

  return (
    <div
      className={containerClasses}
      style={{ border: '3px solid #9CA3AF' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick()
      }}
    >
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
        <div className="mt-0.5 text-gray-600 space-y-0.5">
          <div className="text-[9px] leading-none whitespace-nowrap">🌅 {cell.sunrise || '—'}</div>
          <div className="text-[9px] leading-none whitespace-nowrap">🌇 {cell.sunset || '—'}</div>
        </div>
        <ul className="mt-1 text-[10px] text-gray-700 space-y-0.5 list-disc list-inside">
          <li>{nakshatra || cell.line1 || '—'}</li>
          <li>{cell.line2 || '—'}</li>
        </ul>
        <div className="mt-auto" />
      </div>
    </div>
  )
}
