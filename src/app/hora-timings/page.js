'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Download,
  Share,
  RefreshCw,
  MapPin,
  Calendar,
  Clock,
  Sun,
  Moon,
  Zap as ZapIcon,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import astrologyAPI from '@/lib/api';

export default function HoraTimingsPage() {
  const [horaData, setHoraData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const calendarRef = useRef(null);

  // Update clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timezone: -new Date().getTimezoneOffset() / 60,
          });
        },
        () => setUserLocation({ latitude: 28.6139, longitude: 77.2090, timezone: 5.5 })
      );
    } else {
      setUserLocation({ latitude: 28.6139, longitude: 77.2090, timezone: 5.5 });
    }
  }, []);


  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateClick = (day) => {
    const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    setSelectedDate(newDate.toISOString().slice(0, 10));
    setShowCalendar(false);
  };

  // Fetch when location or date changes
  useEffect(() => {
    if (userLocation) fetchHoraData();
  }, [userLocation, selectedDate]);

  const fetchHoraData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const payload = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        date: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        timezone: userLocation.timezone,
        config: { observation_point: 'geocentric', ayanamsha: 'lahiri' },
      };
      const data = await astrologyAPI.getSingleCalculation('hora-timings', payload);
      setHoraData(data);
    } catch (e) {
      setError('Failed to fetch hora timings.');
    } finally {
      setIsLoading(false);
    }
  };

  const parse = (raw) => {
    try { return JSON.parse(raw.output); } catch { return null; }
  };

  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return iso; }
  };

  const planetMood = (lord) => {
    const map = {
      sun: { label: 'Vigorous', bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      moon: { label: 'Gentle', bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      mars: { label: 'Aggressive', bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
      mercury: { label: 'Quick', bg: '#d1fae5', text: '#065f46', border: '#10b981' },
      jupiter: { label: 'Fruitful', bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      venus: { label: 'Beneficial', bg: '#fce7f3', text: '#be185d', border: '#ec4899' },
      saturn: { label: 'Sluggish', bg: '#e5e7eb', text: '#374151', border: '#6b7280' },
    };
    return map[lord.toLowerCase()] || { label: 'Hora', bg: '#e5e7eb', text: '#374151', border: '#6b7280' };
  };

  const getIcon = (lord) => {
    const map = {
      sun: <Sun style={{ width: 20, height: 20 }} />,
      moon: <Moon style={{ width: 20, height: 20 }} />,
      mars: <ZapIcon style={{ width: 20, height: 20 }} />,
      mercury: 'Mercury',
      jupiter: 'Jupiter',
      venus: 'Venus',
      saturn: 'Saturn',
    };
    return map[lord.toLowerCase()] || <Star style={{ width: 20, height: 20 }} />;
  };

  const isCurrent = (h) => {
    const n = Date.now();
    return n >= new Date(h.starts_at) && n < new Date(h.ends_at);
  };


  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const selectedStr = selectedDate;

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedStr;
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            calendar-day
            ${isToday ? 'today' : ''}
            ${isSelected ? 'selected' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const handlePrev = () => setSelectedDate(new Date(Date.parse(selectedDate) - 86400000).toISOString().slice(0, 10));
  const handleNext = () => setSelectedDate(new Date(Date.parse(selectedDate) + 86400000).toISOString().slice(0, 10));
  const handleToday = () => setSelectedDate(new Date().toISOString().slice(0, 10));

  const parsed = horaData ? parse(horaData) : null;
  const entries = parsed ? Object.entries(parsed) : [];
  const day = entries.filter(([k]) => +k <= 12).sort((a, b) => +a[0] - +b[0]);
  const night = entries.filter(([k]) => +k > 12).sort((a, b) => +a[0] - +b[0]);
  const dayStart = day[0] ? fmt(day[0][1].starts_at) : '--';
  const nightStart = night[0] ? fmt(night[0][1].starts_at) : '--';

  return (
    <>
      {/* ====================== CSS ====================== */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        :global(body){margin:0;background:#fdfbf7;font-family:'Inter',sans-serif;}
        .app{max-width:1200px;margin:0 auto;padding:2rem 1rem;position:relative;}
        .orb{position:absolute;border-radius:50%;filter:blur(120px);opacity:.18;animation:float 22s ease-in-out infinite;}
        .orb1{top:10%;left:10%;width:500px;height:500px;background:linear-gradient(135deg,#d4af37,#7c3aed);}
        .orb2{bottom:10%;right:10%;width:600px;height:600px;background:linear-gradient(135deg,#7c3aed,#b8972e);animation-delay:7s;}
        .orb3{top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:radial-gradient(circle,#d4af37,transparent);animation-delay:14s;}
        @keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-30px) scale(1.1)}}

        .header{text-align:center;margin-bottom:2.5rem;}
        .headerIcon{width:64px;height:64px;background:linear-gradient(135deg,#d4af37,#b8972e);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;box-shadow:0 0 30px rgba(212,175,55,.3);}
        .title{font-family:'Cormorant Garamond',serif;font-size:3rem;font-weight:700;background:linear-gradient(135deg,#d4af37,#b8972e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin:0;}
        .subtitle{color:#555;margin-top:.5rem;}

        .infoBar{background:rgba(255,255,255,.9);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,.2);border-radius:1.5rem;padding:1rem;display:flex;flex-wrap:wrap;gap:1.5rem;justify-content:center;margin-bottom:2rem;box-shadow:0 0 30px rgba(212,175,55,.2);}
        .infoItem{display:flex;align-items:center;gap:.5rem;font-size:.95rem;}
        .infoItem svg{width:1.1rem;height:1.1rem;color:#d4af37;}
        .infoLabel{font-weight:500;color:#444;}
        .infoValue{font-weight:600;color:#111;}
        .pulse{animation:pulse 2s infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}

        .dateNav{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;}
        .dateInput{padding:.5rem .75rem;border:1.5px solid #e5e7eb;border-radius:.875rem;font-size:.925rem;}
        .navBtn{padding:.5rem .75rem;background:#fff;border:1.5px solid #e5e7eb;border-radius:.875rem;font-size:.875rem;cursor:pointer;}
        .navBtn:hover{background:#f9fafb;border-color:#d4af37;color:#b8972e;}

        .actionBar{display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:2.5rem;}
        .btn{display:flex;align-items:center;gap:.5rem;padding:.65rem 1.25rem;background:#fff;border:1.5px solid #e5e7eb;border-radius:.875rem;font-size:.925rem;font-weight:500;color:#444;cursor:pointer;transition:all .3s ease;}
        .btn:hover{background:#f9fafb;border-color:#d4af37;color:#b8972e;transform:translateY(-1px);}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .spin{animation:spin 1s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}

        .grid{display:grid;gap:1.5rem;grid-template-columns:1fr;}
        @media (min-width:640px){.grid{grid-template-columns:repeat(2,1fr);}}

        .card{position:relative;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,.25);border-radius:1.5rem;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);transition:transform .3s,box-shadow .3s;}
        .card:hover{transform:translateY(-6px);box-shadow:0 20px 40px rgba(0,0,0,.12);}
        .cardHeader{padding:1rem 1.5rem;background:var(--header-bg,#fefce8);border-bottom:1px solid rgba(212,175,55,.2);}
        .cardTitle{display:flex;justify-content:space-between;align-items:center;font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;color:var(--title-color,#7c2d12);}
        .cardTitle svg{color:var(--title-color,#7c2d12);}
        .horaRow{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;min-height:60px;border-bottom:1px solid #e5e7eb;transition:background .2s;}
        .horaRow:hover{background:#f9fafb;}
        .currentRow{background:var(--current-bg,#fef3c7);border-left:4px solid #f59e0b;}
        .planetBadge{display:flex;align-items:center;gap:.5rem;padding:.375rem .75rem;border-radius:.75rem;font-size:.875rem;font-weight:600;background:var(--badge-bg);color:var(--badge-text);border:1px solid var(--badge-border);}
        .time{font-family:'Courier New',monospace;font-weight:700;color:#111;}
        .liveBadge{display:flex;align-items:center;gap:.4rem;background:rgba(212,175,55,.2);color:#b8972e;padding:.375rem .875rem;border-radius:9999px;font-size:.75rem;font-weight:700;text-transform:uppercase;border:1px solid rgba(212,175,55,.4);}
        .pulseDot{width:9px;height:9px;background:#d4af37;border-radius:50%;animation:pulse 2s infinite;}

        /* === PREMIUM CALENDAR === */
        .datePickerWrapper {
          position: relative;
          display: inline-block;
        }
        .dateTrigger {
          display: flex;
          align-items: center;
          gap: .5rem;
          padding: .65rem 1rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: .875rem;
          font-size: .925rem;
          font-weight: 500;
          color: #444;
          cursor: pointer;
          transition: all .3s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,.1);
        }
        .dateTrigger:hover {
          background: #f9fafb;
          border-color: #d4af37;
          color: #b8972e;
          transform: translateY(-1px);
        }
        .dateTrigger:focus {
          outline: none;
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212,175,55,.3);
        }

        .calendarPopup {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          margin-top: .5rem;
          width: 320px;
          background: rgba(255,255,255,.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(212,175,55,.3);
          border-radius: 1.5rem;
          box-shadow: 0 20px 50px rgba(0,0,0,.15);
          overflow: hidden;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transform: translateX(-50%) translateY(8px) scale(.95);
          transition: all .3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .calendarPopup.open {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0) scale(1);
        }

        .calendarHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          color: white;
          font-weight: 600;
        }
        .calendarNavBtn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background .2s;
        }
        .calendarNavBtn:hover {
          background: rgba(255,255,255,.3);
        }
        .calendarMonthYear {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.25rem;
        }

        .calendarWeekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: .5rem;
          padding: 1rem 1.5rem .5rem;
          background: rgba(212,175,55,.05);
          font-weight: 600;
          color: #7c2d12;
          font-size: .875rem;
        }
        .calendarDays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: .5rem;
          padding: 0 1.5rem 1.5rem;
        }
        .calendar-day {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          color: #444;
          transition: all .2s;
          cursor: pointer;
          background: transparent;
          border: 2px solid transparent;
        }
        .calendar-day:hover {
          background: rgba(212,175,55,.15);
          color: #b8972e;
          transform: scale(1.05);
        }
        .calendar-day.empty {
          cursor: default;
          background: none !important;
          color: transparent !important;
        }
        .calendar-day.today {
          background: #fef3c7;
          color: #92400e;
          font-weight: 700;
          border-color: #f59e0b;
        }
        .calendar-day.selected {
          background: linear-gradient(135deg, #d4af37, #b8972e);
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(212,175,55,.4);
          transform: scale(1.1);
        }
        .calendar-day.selected:hover {
          transform: scale(1.15);
        }

        .todayBtn {
          display: block;
          width: calc(100% - 3rem);
          margin: 0 auto 1rem;
          padding: .5rem;
          background: rgba(212,175,55,.1);
          border: 1.5px dashed #d4af37;
          border-radius: .75rem;
          color: #b8972e;
          font-size: .875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
        }
        .todayBtn:hover {
          background: rgba(212,175,55,.2);
          border-style: solid;
        }
      `}</style>

      {/* ====================== JSX ====================== */}
      <div className="app">
        {/* Orbs */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {/* Header */}
        <header className="header">
          <div className="headerIcon"><Clock style={{ width: 36, height: 36, color: '#fff' }} /></div>
          <h1 className="title">Hora Timings</h1>
          <p className="subtitle">Planetary Hours for Today</p>
        </header>

        {/* Info Bar */}
        <div className="infoBar">
          <div className="infoItem"><MapPin /><span className="infoLabel">Location:</span><span className="infoValue">{userLocation ? `${userLocation.latitude.toFixed(2)}, ${userLocation.longitude.toFixed(2)}` : 'Detecting...'}</span></div>
          <div className="infoItem"><Calendar /><span className="infoLabel">Time:</span><span className="infoValue pulse">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span></div>
        </div>

<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div className="datePickerWrapper" ref={calendarRef}>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="dateTrigger"
            >
              <Calendar style={{ width: 18, height: 18 }} />
              <span>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </button>

            <div className={`calendarPopup ${showCalendar ? 'open' : ''}`}>
              <div className="calendarHeader">
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                  className="calendarNavBtn"
                >
                  <ChevronLeft style={{ width: 18, height: 18 }} />
                </button>
                <div className="calendarMonthYear">
                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                  className="calendarNavBtn"
                >
                  <ChevronRight style={{ width: 18, height: 18 }} />
                </button>
              </div>

              <div className="calendarWeekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="calendarDays">
                {renderCalendar()}
              </div>

              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().slice(0, 10));
                  setCalendarDate(new Date());
                  setShowCalendar(false);
                }}
                className="todayBtn"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="actionBar">
          <button onClick={fetchHoraData} disabled={isLoading} className="btn"><RefreshCw className={isLoading ? 'spin' : ''} />Refresh</button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => { /* download */ }} disabled={!horaData} className="btn"><Download />Download</button>
            <button onClick={() => { /* share */ }} disabled={!horaData} className="btn"><Share />Share</button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,.9)', borderRadius: '1.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ width: 56, height: 56, border: '5px solid rgba(212,175,55,.2)', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
            <p>Loading hora timings...</p>
          </div>
        )}

        {/* Results */}
        {parsed && !isLoading && (
          <div className="grid">
            {/* Day Hora */}
            <div className="card" style={{ '--header-bg': '#fefce8', '--title-color': '#7c2d12', '--current-bg': '#fef3c7' }}>
              <div className="cardHeader">
                <div className="cardTitle">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Sun style={{ width: 24, height: 24 }} /> Day Hora</span>
                  <span style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '.25rem' }}><Clock style={{ width: 16, height: 16 }} /> {dayStart}</span>
                </div>
              </div>
              <div>
                {day.map(([k, h]) => {
                  const mood = planetMood(h.lord);
                  const current = isCurrent(h);
                  return (
                    <div key={k} className={`horaRow ${current ? 'currentRow' : ''}`} style={current ? {} : {}}>
                      <div className="planetBadge" style={{ '--badge-bg': mood.bg, '--badge-text': mood.text, '--badge-border': mood.border }}>
                        {getIcon(h.lord)} {h.lord} - {mood.label}
                      </div>
                      <div className="time">{fmt(h.starts_at)} to {fmt(h.ends_at)}</div>
                      {current && <div className="liveBadge"><div className="pulseDot" />LIVE</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Night Hora */}
            <div className="card" style={{ '--header-bg': '#e0e7ff', '--title-color': '#1e40af', '--current-bg': '#dbeafe' }}>
              <div className="cardHeader">
                <div className="cardTitle">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Moon style={{ width: 24, height: 24 }} /> Night Hora</span>
                  <span style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '.25rem' }}><Clock style={{ width: 16, height: 16 }} /> {nightStart}</span>
                </div>
              </div>
              <div>
                {night.map(([k, h]) => {
                  const mood = planetMood(h.lord);
                  const current = isCurrent(h);
                  return (
                    <div key={k} className={`horaRow ${current ? 'currentRow' : ''}`}>
                      <div className="planetBadge" style={{ '--badge-bg': mood.bg, '--badge-text': mood.text, '--badge-border': mood.border }}>
                        {getIcon(h.lord)} {h.lord} - {mood.label}
                      </div>
                      <div className="time">{fmt(h.starts_at)} to {fmt(h.ends_at)}</div>
                      {current && <div className="liveBadge"><div className="pulseDot" />LIVE</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}