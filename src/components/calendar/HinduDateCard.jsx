import React from 'react'

export default function HinduDateCard({
  heading = "Today's Hindu Date",
  primaryTitle = '-', // e.g., "Ashvina Shukla"
  tithi = '-', // e.g., "Navami"
  dayNumber = '-', // e.g., 10
  gregDate = '-', // e.g., "Oct 01"
  weekday = '-', // e.g., "Wednesday"
  eraLine = '-', // e.g., "Vikrama Samvat : 2082 Kaliyukta"
  shakaLine = '-', // e.g., "Shaka Year : 1947, Ashvina 9"
  rightExtra = '', // e.g., "Vikrama Samvat 2082 • Siddhaardhi"
}) {
  return (
    <div className="w-80 border border-black shadow-sm">
      <div className="bg-blue-100 text-black text-sm font-semibold px-3 py-2">
        {heading}
      </div>
      <div className="bg-white">
        <div className="px-3 pt-3 pb-2 border-b">
          <div className="text-2xl font-extrabold tracking-tight">{primaryTitle}</div>
          <div className="mt-1 flex items-start justify-between">
            <div
              className="font-black leading-none -mt-1"
              style={{ fontSize: '8rem', lineHeight: 1 }}
            >
              {dayNumber}
            </div>
            <div className="text-right text-sm max-w-[8rem]">
              <div className="font-semibold">{tithi}</div>
              <div>{gregDate}</div>
              <div className="text-gray-600 text-xs">{weekday}</div>
              {rightExtra ? (
                <div className="text-gray-800 text-xs mt-1">{rightExtra}</div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="px-3 py-2 text-sm">
          <div className="text-gray-800">{eraLine}</div>
          <div className="text-gray-800">{shakaLine}</div>
        </div>
      </div>
    </div>
  )
}
