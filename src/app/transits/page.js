"use client"

import { useEffect, useMemo, useState } from "react"

// CSV-style transit entries provided by user (single long string)
const RAW_CSV = `Mercury,Scorpio,"October 24, 2025",12:33:14 Mercury,Libra,"November 23, 2025",20:6:52 Mercury,Scorpio,"December 6, 2025",20:45:10 Mercury,Sagittarius,"December 29, 2025",7:23:43 Mercury,Capricorn,"January 17, 2026",10:23:52 Mercury,Aquarius,"February 3, 2026",21:51:49 Mercury,Pisces,"April 11, 2026",1:15:51 Mercury,Aries,"April 30, 2026",6:52:20 Mercury,Taurus,"May 15, 2026",0:31:50 Mercury,Gemini,"May 29, 2026",11:11:39 Mercury,Cancer,"June 22, 2026",15:30:22 Mercury,Gemini,"July 7, 2026",10:46:16 Mercury,Cancer,"August 5, 2026",19:54:1 Mercury,Leo,"August 22, 2026",19:31:38 Mercury,Virgo,"September 7, 2026",13:32:41 Mercury,Libra,"September 26, 2026",12:38:19 Mercury,Scorpio,"December 2, 2026",17:27:16 Mercury,Sagittarius,"December 22, 2026",7:39:27 Mercury,Capricorn,"January 10, 2027",0:37:8 Mercury,Aquarius,"January 28, 2027",3:33:49 Mercury,Capricorn,"February 24, 2027",4:40:13 Mercury,Aquarius,"March 12, 2027",5:7:0 Mercury,Pisces,"April 5, 2027",16:16:14 Mercury,Aries,"April 22, 2027",8:12:17 Mercury,Taurus,"May 6, 2027",12:36:9 Mercury,Gemini,"May 23, 2027",18:31:59 Mercury,Cancer,"July 30, 2027",18:31:9 Mercury,Leo,"August 14, 2027",11:53:2 Mercury,Virgo,"August 31, 2027",2:0:44 Mercury,Libra,"September 21, 2027",18:20:25 Mercury,Virgo,"October 21, 2027",8:12:13 Mercury,Libra,"November 5, 2027",17:11:5 Mercury,Scorpio,"November 26, 2027",0:28:55 Mercury,Sagittarius,"December 15, 2027",2:6:23 Mercury,Capricorn,"January 2, 2028",20:54:58 Mercury,Aquarius,"March 9, 2028",10:6:18 Mercury,Pisces,"March 28, 2028",13:50:27 Mercury,Aries,"April 12, 2028",23:48:30 Mercury,Taurus,"April 27, 2028",20:18:27 Mercury,Gemini,"July 5, 2028",17:2:13 Mercury,Cancer,"July 21, 2028",14:38:9 Mercury,Leo,"August 5, 2028",7:40:36 Mercury,Virgo,"August 23, 2028",13:23:47 Mercury,Libra,"October 30, 2028",8:29:53 Mercury,Scorpio,"November 17, 2028",18:45:1 Mercury,Sagittarius,"December 6, 2028",22:3:36 Mercury,Capricorn,"December 26, 2028",22:13:32 Mercury,Sagittarius,"January 18, 2029",6:39:43 Mercury,Capricorn,"February 8, 2029",17:12:48 Mercury,Aquarius,"March 3, 2029",9:37:46 Mercury,Pisces,"March 20, 2029",18:27:1 Mercury,Aries,"April 4, 2029",17:17:55 Mercury,Taurus,"April 24, 2029",23:45:56 Mercury,Aries,"May 10, 2029",3:24:31 Mercury,Taurus,"June 8, 2029",16:32:27 Mercury,Gemini,"June 28, 2029",21:38:28 Mercury,Cancer,"July 13, 2029",1:22:2 Mercury,Leo,"July 28, 2029",17:19:24 Mercury,Virgo,"August 19, 2029",20:37:58 Mercury,Leo,"September 15, 2029",4:17:50 Mercury,Virgo,"October 4, 2029",19:14:16 Mercury,Libra,"October 23, 2029",2:20:18 Mercury,Scorpio,"November 10, 2029",11:30:27 Mercury,Sagittarius,"November 30, 2029",5:8:14 Venus,Virgo,"October 9, 2025",10:49:2 Venus,Libra,"November 2, 2025",13:15:33 Venus,Scorpio,"November 26, 2025",11:21:59 Venus,Sagittarius,"December 20, 2025",7:45:15 Venus,Capricorn,"January 13, 2026",3:57:50 Venus,Aquarius,"February 6, 2026",1:11:25 Venus,Pisces,"March 2, 2026",0:56:53 Venus,Aries,"March 26, 2026",5:9:5 Venus,Taurus,"April 19, 2026",15:46:39 Venus,Gemini,"May 14, 2026",10:53:38 Venus,Cancer,"June 8, 2026",17:42:46 Venus,Leo,"July 4, 2026",19:13:41 Venus,Virgo,"August 1, 2026",9:28:3 Venus,Libra,"September 2, 2026",13:44:14 Venus,Virgo,"November 6, 2026",1:4:18 Venus,Libra,"November 22, 2026",17:20:45 Venus,Scorpio,"January 1, 2027",23:22:36 Venus,Sagittarius,"January 29, 2027",18:41:36 Venus,Capricorn,"February 24, 2027",15:16:2 Venus,Aquarius,"March 21, 2027",18:51:29 Venus,Pisces,"April 15, 2027",15:20:18 Venus,Aries,"May 10, 2027",8:48:38 Venus,Taurus,"June 4, 2027",0:40:51 Venus,Gemini,"June 28, 2027",14:39:27 Venus,Cancer,"July 23, 2027",1:46:38 Venus,Leo,"August 16, 2027",9:34:33 Venus,Virgo,"September 9, 2027",14:40:38 Venus,Libra,"October 3, 2027",18:24:9 Venus,Scorpio,"October 27, 2027",21:57:5 Venus,Sagittarius,"November 21, 2027",2:8:3 Venus,Capricorn,"December 15, 2027",8:10:54 Venus,Aquarius,"January 8, 2028",19:16:33 Venus,Pisces,"February 2, 2028",18:24:19 Venus,Aries,"February 28, 2028",20:14:42 Venus,Taurus,"March 28, 2028",18:21:32 Venus,Gemini,"August 1, 2028",12:32:54 Venus,Cancer,"August 31, 2028",21:34:2 Venus,Leo,"September 27, 2028",17:13:29 Venus,Virgo,"October 23, 2028",1:30:47 Venus,Libra,"November 16, 2028",15:5:3 Venus,Scorpio,"December 10, 2028",18:56:52 Venus,Sagittarius,"January 3, 2029",18:30:6 Venus,Capricorn,"January 27, 2029",16:47:36 Venus,Aquarius,"February 20, 2029",15:34:54 Venus,Pisces,"March 16, 2029",16:9:2 Venus,Aries,"April 9, 2029",19:34:18 Venus,Taurus,"May 4, 2029",2:31:21 Venus,Gemini,"May 28, 2029",13:12:45 Venus,Cancer,"June 22, 2029",3:51:15 Venus,Leo,"July 16, 2029",23:27:28 Venus,Virgo,"August 11, 2029",2:25:56 Venus,Libra,"September 5, 2029",17:11:58 Venus,Scorpio,"October 2, 2029",4:58:46 Venus,Sagittarius,"October 30, 2029",18:57:5 Sun,Libra,"October 17, 2025",13:46:3 Sun,Scorpio,"November 16, 2025",13:37:18 Sun,Sagittarius,"December 16, 2025",4:19:51 Sun,Capricorn,"January 14, 2026",15:7:6 Sun,Aquarius,"February 13, 2026",4:8:45 Sun,Pisces,"March 15, 2026",1:2:52 Sun,Aries,"April 14, 2026",9:32:27 Sun,Taurus,"May 15, 2026",6:21:47 Sun,Gemini,"June 15, 2026",12:52:47 Sun,Cancer,"July 16, 2026",23:39:6 Sun,Leo,"August 17, 2026",7:58:28 Sun,Virgo,"September 17, 2026",7:52:40 Sun,Libra,"October 17, 2026",19:51:21 Sun,Scorpio,"November 16, 2026",19:42:53 Sun,Sagittarius,"December 16, 2026",10:24:45 Sun,Capricorn,"January 14, 2027",21:10:11 Sun,Aquarius,"February 13, 2027",10:8:51 Sun,Pisces,"March 15, 2027",6:59:51 Sun,Aries,"April 14, 2027",15:28:6 Sun,Taurus,"May 15, 2027",12:19:32 Sun,Gemini,"June 15, 2027",18:55:42 Sun,Cancer,"July 17, 2027",5:48:39 Sun,Leo,"August 17, 2027",14:13:24 Sun,Virgo,"September 17, 2027",14:10:11 Sun,Libra,"October 18, 2027",2:8:36 Sun,Scorpio,"November 17, 2027",1:58:15 Sun,Sagittarius,"December 16, 2027",16:38:38 Sun,Capricorn,"January 15, 2028",3:23:45 Sun,Aquarius,"February 13, 2028",16:22:59 Sun,Pisces,"March 14, 2028",13:14:50 Sun,Aries,"April 13, 2028",21:44:1 Sun,Taurus,"May 14, 2028",18:36:28 Sun,Gemini,"June 15, 2028",1:13:36 Sun,Cancer,"July 16, 2028",12:6:5 Sun,Leo,"August 16, 2028",20:28:20 Sun,Virgo,"September 16, 2028",20:21:5 Sun,Libra,"October 17, 2028",8:15:8 Sun,Scorpio,"November 16, 2028",8:1:24 Sun,Sagittarius,"December 15, 2028",22:40:25 Sun,Capricorn,"January 14, 2029",9:26:29 Sun,Aquarius,"February 12, 2029",22:28:27 Sun,Pisces,"March 14, 2029",19:23:17 Sun,Aries,"April 14, 2029",3:53:52 Sun,Taurus,"May 15, 2029",0:45:41 Sun,Gemini,"June 15, 2029",7:20:56 Sun,Cancer,"July 16, 2029",18:12:24 Sun,Leo,"August 17, 2029",2:35:19 Sun,Virgo,"September 17, 2029",2:29:37 Sun,Libra,"October 17, 2029",14:24:45 Sun,Scorpio,"November 16, 2029",14:11:15 Sun,Sagittarius,"December 16, 2029",4:49:48 Mars,Scorpio,"October 27, 2025",15:42:39 Mars,Sagittarius,"December 7, 2025",20:17:34 Mars,Capricorn,"January 16, 2026",4:28:18 Mars,Aquarius,"February 23, 2026",11:50:8 Mars,Pisces,"April 2, 2026",15:29:27 Mars,Aries,"May 11, 2026",12:38:25 Mars,Taurus,"June 20, 2026",23:59:20 Mars,Gemini,"August 2, 2026",22:51:13 Mars,Cancer,"September 18, 2026",16:35:20 Mars,Leo,"November 12, 2026",20:18:16 Mars,Cancer,"March 10, 2027",0:13:26 Mars,Leo,"April 26, 2027",11:46:39 Mars,Virgo,"July 5, 2027",4:34:17 Mars,Libra,"August 24, 2027",9:51:23 Mars,Scorpio,"October 8, 2027",1:28:34 Mars,Sagittarius,"November 18, 2027",8:45:34 Mars,Capricorn,"December 27, 2027",13:4:44 Mars,Aquarius,"February 3, 2028",15:44:0 Mars,Pisces,"March 12, 2028",16:37:33 Mars,Aries,"April 20, 2028",13:25:54 Mars,Taurus,"May 31, 2028",0:23:46 Mars,Gemini,"July 12, 2028",15:15:18 Mars,Cancer,"August 26, 2028",20:17:31 Mars,Leo,"October 14, 2028",10:21:31 Mars,Virgo,"December 8, 2028",22:20:44 Mars,Libra,"July 28, 2029",22:52:19 Mars,Scorpio,"September 15, 2029",4:5:40 Mars,Sagittarius,"October 27, 2029",13:6:4 Mars,Capricorn,"December 6, 2029",2:19:8 Jupiter,Cancer,"October 18, 2025",19:47:55 Jupiter,Gemini,"December 5, 2025",17:25:16 Jupiter,Cancer,"June 2, 2026",1:49:47 Jupiter,Leo,"October 31, 2026",12:2:2 Jupiter,Cancer,"January 25, 2027",1:31:44 Jupiter,Leo,"June 26, 2027",5:18:36 Jupiter,Virgo,"November 26, 2027",18:44:14 Jupiter,Leo,"February 28, 2028",19:17:19 Jupiter,Virgo,"July 24, 2028",15:36:15 Jupiter,Libra,"December 26, 2028",13:38:52 Jupiter,Virgo,"March 29, 2029",14:32:19 Jupiter,Libra,"August 25, 2029",1:0:51 Saturn,Aries,"June 3, 2027",5:27:27 Saturn,Pisces,"October 20, 2027",7:12:39 Saturn,Aries,"February 23, 2028",19:23:7 Saturn,Taurus,"August 8, 2029",12:30:33 Saturn,Aries,"October 5, 2029",16:53:35 Moon,Taurus,"October 10, 2025",1:23:19 Moon,Gemini,"October 12, 2025",2:24:24 Moon,Cancer,"October 14, 2025",5:58:55 Moon,Leo,"October 16, 2025",12:42:8 Moon,Virgo,"October 18, 2025",22:11:45 Rahu,Capricorn,"December 5, 2026",22:33:8 Rahu,Sagittarius,"June 24, 2028",1:30:46`;

const MONTHS = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
}

function parseCSV(raw) {
  const re = /(Mercury|Venus|Sun|Mars|Jupiter|Saturn|Moon|Rahu)\s*,\s*([^,]+)\s*,\s*"([^"]+)"\s*,\s*([0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2})/g
  const out = []
  let m
  while ((m = re.exec(raw)) !== null) {
    const planet = m[1]
    const sign = m[2]
    const dateStr = m[3] // e.g., October 24, 2025
    const timeStr = m[4] // e.g., 12:33:14
    const dm = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(dateStr)
    const tm = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(timeStr)
    if (!dm || !tm) continue
    const month = MONTHS[dm[1]] ?? 0
    const day = parseInt(dm[2], 10)
    const year = parseInt(dm[3], 10)
    const hh = parseInt(tm[1], 10)
    const mm = parseInt(tm[2], 10)
    const ss = parseInt(tm[3], 10)
    const when = new Date(year, month, day, hh, mm, ss, 0) // local time
    out.push({ planet, sign, when, label: `${planet} → ${sign}` })
  }
  return out
}

const eventsBase = parseCSV(RAW_CSV)

function fmtDate(dt) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    return fmt.format(dt)
  } catch { return dt.toISOString() }
}

function diffParts(ms) {
  let s = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(s / 86400); s -= days * 86400
  const hrs = Math.floor(s / 3600); s -= hrs * 3600
  const mins = Math.floor(s / 60); s -= mins * 60
  const secs = s
  const pad = (n) => String(n).padStart(2, "0")
  return { days, hrs: pad(hrs), mins: pad(mins), secs: pad(secs) }
}

export default function TransitsPage() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [now, setNow] = useState(0)
  const [filter, setFilter] = useState('All')

  // Hydration + tick every second for countdowns (client only)
  useEffect(() => {
    setIsHydrated(true)
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Sort and filter events
  const planets = useMemo(() => {
    const p = Array.from(new Set(eventsBase.map(e => e.planet)))
    return ['All', ...p]
  }, [])

  const events = useMemo(() => {
    const arr = [...eventsBase].sort((a, b) => a.when - b.when)
    return filter === 'All' ? arr : arr.filter(e => e.planet === filter)
  }, [filter])

  // Explicit ordering for sm & md (3x3 grid)
  const ORDER_SM_MD = [
    'Mercury', 'Venus', 'Sun',
    'Mars', 'Jupiter', 'Saturn',
    'Moon', 'Rahu', 'All',
  ]

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold text-center mb-2 mt-4">✨Transits</h1>
        <p className="text-gray-600 text-center mb-6">Planet sign entries with live countdowns</p>

        {/* Filter pills - unified responsive 3x3 grid */}
        <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-10 px-2 sm:px-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {ORDER_SM_MD.map(p => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`w-full text-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-bold text-sm sm:text-base border transition ${filter === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 md:p-6 dark:border-blue-800 dark:bg-blue-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="text-blue-800 font-medium dark:text-blue-200">Timeline</div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Local time</div>
          </div>

          <ul className="space-y-3">
            {events.map((ev, idx) => {
              const ms = isHydrated ? (ev.when.getTime() - now) : 0
              const future = isHydrated ? ms > 0 : false
              const { days, hrs, mins, secs } = isHydrated ? diffParts(Math.abs(ms)) : { days: '—', hrs: '—', mins: '—', secs: '—' }
              const near = isHydrated && future && (ev.when.getTime() - now) <= 7 * 86400 * 1000
              return (
                <li key={idx} className="rounded-xl border bg-white dark:bg-blue-950/40 border-blue-100 dark:border-blue-800 p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-blue-700 dark:text-blue-200" suppressHydrationWarning>{fmtDate(ev.when)}</div>
                    <div className="text-base font-medium text-gray-900 dark:text-neutral-100">{ev.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Sign: {ev.sign}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${isHydrated ? (future ? (near ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800') : 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-700'} dark:${isHydrated ? (future ? (near ? 'bg-amber-900/40 text-amber-200' : 'bg-blue-900/40 text-blue-200') : 'bg-neutral-800 text-neutral-300') : 'bg-neutral-800 text-neutral-300'}`}>
                      {isHydrated ? (future ? 'Starts in' : 'Passed') : '—'}
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-gray-900 dark:text-neutral-100">
                      {days}d {hrs}:{mins}:{secs}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
