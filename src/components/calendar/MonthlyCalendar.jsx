'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import HinduDateCard from './HinduDateCard';
import CalendarCell from './CalendarCell2';
import Modal from '@/components/Modal';
import astrologyAPI from '@/lib/api';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function MonthlyCalendar({
  header,
  weekdays,
  month,
  onPrev,
  onNext,
  nakshatraMap,
  sunMap,
  tithiMap,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDateKey, setModalDateKey] = useState(null);
  const [modalCell, setModalCell] = useState(null);
  const [modalNakshatra, setModalNakshatra] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreData, setMoreData] = useState(null);
  const [detailsCache, setDetailsCache] = useState({});

  const STORAGE_PREFIX = 'tgs:date-details:';
  const readFromStorage = (key) => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };
  const writeToStorage = (key, value) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {}
  };

  const formatTime = (val) => {
    try {
      if (!val) return '-';
      if (typeof val === 'string' && /am|pm|AM|PM/.test(val)) return val;
      const dt = new Date(val);
      if (!isNaN(dt)) return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (typeof val === 'string' && /\d{2}:\d{2}/.test(val)) {
        const m = val.match(/\d{2}:\d{2}/);
        return m ? m[0] : val;
      }
      return String(val);
    } catch { return String(val || '-'); }
  };

  const formatRange = (item) => {
    try {
      if (!item) return '-';
      if (typeof item === 'string') return item;
      const s = item.start_time || item.start || item.startTime || item.starts_at || item.startsAt;
      const e = item.end_time || item.end || item.endTime || item.ends_at || item.endsAt;
      if (s || e) return `${formatTime(s) || '-'} — ${formatTime(e) || '-'}`;
      if (Array.isArray(item)) {
        return item.map((x, i) => `${i + 1}. ${formatRange(x)}`).join('\n');
      }
      return JSON.stringify(item);
    } catch { return '-'; }
  };

  const parseOutput = (val) => {
    try {
      if (!val) return null;
      if (val.output && typeof val.output === 'string') {
        try { return JSON.parse(val.output); } catch (_) { return val.output; }
      }
      return val;
    } catch { return val; }
  };

  const isSuccess = (val) => {
    if (!val) return false;
    if (typeof val === 'object' && 'statusCode' in val) return Number(val.statusCode) === 200;
    return true;
  };

  const extractRanges = (val) => {
    const v = parseOutput(val);
    if (!v) return [];
    if (Array.isArray(v)) {
      return v.map(x => ({
        start: x.starts_at || x.start_time || x.start || x.startTime,
        end: x.ends_at || x.end_time || x.end || x.endTime
      })).filter(r => r.start || r.end);
    }
    const keys = Object.keys(v);
    if (keys.some(k => /^(\d+)$/.test(k))) {
      return keys.map(k => v[k]).map(x => ({
        start: x?.starts_at || x?.start_time || x?.start || x?.startTime,
        end: x?.ends_at || x?.end_time || x?.end || x?.endTime
      })).filter(r => r.start || r.end);
    }
    if (typeof v === 'object') {
      const s = v.starts_at || v.start_time || v.start || v.startTime;
      const e = v.ends_at || v.end_time || v.end || v.endTime;
      if (s || e) return [{ start: s, end: e }];
    }
    return [];
  };

  const flatCells = month.rows.flat();
  const selectedCell = flatCells.find(c => c.isToday) || flatCells.find(c => c.monthOffset === 0) || flatCells[0];
  const baseDate = new Date();
  let viewYear = baseDate.getFullYear();
  let viewMonth = baseDate.getMonth();
  try {
    const parts = String(month.monthLabel).split(' ');
    const mName = parts[0];
    const yVal = parseInt(parts[1], 10);
    const monthIndex = new Date(`${mName} 1, ${isNaN(yVal) ? baseDate.getFullYear() : yVal}`).getMonth();
    viewMonth = monthIndex;
    viewYear = isNaN(yVal) ? baseDate.getFullYear() : yVal;
  } catch {}

  const selectedGregorian = new Date(viewYear, viewMonth + (selectedCell?.monthOffset || 0), selectedCell?.date || 1);
  const tithi = (selectedCell?.tithiBand || '-').split(' ')[0] || '-';
  const gregDate = selectedGregorian.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  const weekday = selectedGregorian.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNumber = String(selectedGregorian.getDate()).padStart(1, '0');
  const eraLine = header?.selectedBanner?.era || '-';
  const shakaLine = header?.selectedBanner?.leftSubtitle || '-';
  const y = selectedGregorian.getFullYear();
  const m = String(selectedGregorian.getMonth() + 1).padStart(2, '0');
  const d = String(selectedGregorian.getDate()).padStart(2, '0');
  const dateKey = `${y}-${m}-${d}`;
  const nakshatraName = nakshatraMap?.[dateKey]?.name || nakshatraMap?.[dateKey]?.nakshatra_name || nakshatraMap?.[dateKey]?.nakshatra?.name;
  const primaryTitle = nakshatraName || header?.selectedBanner?.leftSubtitle?.replace(', ', ' ') || header?.selectedBanner?.leftTitle || month.monthLabel;

  useEffect(() => {
    let cancelled = false;
    const fetchDetails = async () => {
      if (!modalOpen || !modalDateKey) return;
      let cached = detailsCache?.[modalDateKey];
      if (cached) {
        setMoreData(cached);
        return;
      }
      const stored = readFromStorage(modalDateKey);
      if (stored) {
        setMoreData(stored);
        setDetailsCache(prev => ({ ...prev, [modalDateKey]: stored }));
        return;
      }
      try {
        setLoadingMore(true);
        let latitude = 0, longitude = 0;
        try {
          const pos = await new Promise((res, rej) => {
            if (!navigator.geolocation) return rej(new Error('Geolocation not supported'));
            navigator.geolocation.getCurrentPosition(res, rej);
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch (_) {}
        const date = new Date(modalDateKey);
        const payload = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          date: date.getDate(),
          hours: 12, minutes: 0, seconds: 0,
          latitude, longitude,
          timezone: -new Date().getTimezoneOffset() / 60,
          config: { observation_point: 'topocentric', ayanamsha: 'lahiri', lunar_month_definition: 'amanta' },
        };
        const [{ results: pResults }, { results: aResults }] = await Promise.all([
          astrologyAPI.getPanchangData(payload),
          astrologyAPI.getAuspiciousData(payload),
        ]);
        if (!cancelled) {
          let merged = { ...pResults, ...aResults };
          const needsAmrit = !merged['amrit-kaal'] || (merged['amrit-kaal'] && merged['amrit-kaal'].statusCode && Number(merged['amrit-kaal'].statusCode) !== 200);
          const needsVarjyam = !merged['varjyam'] || (merged['varjyam'] && merged['varjyam'].statusCode && Number(merged['varjyam'].statusCode) !== 200);
          try {
            if (needsAmrit) {
              const amrit = await astrologyAPI.getSingleCalculation('amrit-kaal', payload);
              merged['amrit-kaal'] = amrit;
            }
            if (needsVarjyam) {
              const varj = await astrologyAPI.getSingleCalculation('varjyam', payload);
              merged['varjyam'] = varj;
            }
          } catch (_) {}
          const usedFallbackGeo = latitude === 0 && longitude === 0;
          const amritBad = !merged['amrit-kaal'] || (merged['amrit-kaal'] && merged['amrit-kaal'].statusCode && Number(merged['amrit-kaal'].statusCode) !== 200);
          const varjBad = !merged['varjyam'] || (merged['varjyam'] && merged['varjyam'].statusCode && Number(merged['varjyam'].statusCode) !== 200);
          if (usedFallbackGeo && (amritBad || varjBad)) {
            const altPayload = { ...payload, latitude: 23.1765, longitude: 75.7885, timezone: 5.5 };
            try {
              if (amritBad) {
                const amrit2 = await astrologyAPI.getSingleCalculation('amrit-kaal', altPayload);
                merged['amrit-kaal'] = amrit2;
              }
              if (varjBad) {
                const varj2 = await astrologyAPI.getSingleCalculation('varjyam', altPayload);
                merged['varjyam'] = varj2;
              }
            } catch (_) {}
          }
          setMoreData(merged);
          setDetailsCache(prev => ({ ...prev, [modalDateKey]: merged }));
          writeToStorage(modalDateKey, merged);
        }
      } catch (e) {
        console.warn('Auto-fetch details failed', e);
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    };
    fetchDetails();
    return () => { cancelled = true; };
  }, [modalOpen, modalDateKey, detailsCache]);

  return (
    <>
<style jsx>{`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

  .calendarContainer {
    font-family: 'Inter', sans-serif;
    max-width: 960px;
    margin: 0 auto;
    padding: 1rem;
  }

  /* ==== Navigation ==== */
  .navBar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fefce8;
    border: 1px solid rgba(212,175,55,.2);
    border-top: none;
    border-radius: 0 0 1.5rem 1.5rem;
    padding: 0.75rem 1rem;
    margin-top: 0.5rem;
  }
  .navButton {
    width: 36px; height: 36px;
    background: white;
    border: 1.5px solid #d4af37;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #b8972e;
    cursor: pointer;
    transition: all .3s;
    box-shadow: 0 2px 8px rgba(212,175,55,.2);
  }
  .navButton:hover { background:#d4af37; color:white; transform:scale(1.1); }
  .navButton:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .monthTitle {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #7c2d12;
  }

  /* ==== Weekday Header ==== */
  .weekdayHeader {
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
  }
  @media (max-width: 640px) {
    .weekdayHeader { grid-template-columns: 48px repeat(7, 1fr); gap: 0.375rem; }
  }
  .weekdayCell {
    background: #f8f9fa;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    text-align: center;
    padding: 0.5rem 0;
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
  }
  .weekdayHi {
    font-size: 0.625rem;
    color: #6b7280;
    margin-top: 0.125rem;
  }

  /* ==== Calendar Grid ==== */
  .calendarGrid {
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  @media (max-width: 640px) {
    .calendarGrid { grid-template-columns: 48px repeat(7, 1fr); gap: 0.5rem; }
  }
  @media (max-width: 480px) {
    .calendarGrid { grid-template-columns: 40px repeat(7, 1fr); gap: 0.375rem; }
  }

  .rowLabel {
    background: #fefce8;
    border: 1.5px solid #d4af37;
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #7c2d12;
    padding: 0.25rem 0;
  }
  .rowLabelHi {
    font-size: 0.625rem;
    color: #b8972e;
  }


        .calendarContainer {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1000px;
          margin: 0 auto;
          padding: 1.5rem;
          background: #fafafa;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .calendarGrid {
          display: grid;
          grid-template-columns: 60px repeat(7, 1fr);
          gap: 1px;
          background: #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 1rem;
        }

        .rowLabel {
          background: #ffffff;
          padding: 12px 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #444;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
        }

        .rowLabelHi {
          font-size: 0.75rem;
          color: #888;
          font-weight: 500;
        }

        .calendarCell {
          background: #ffffff;
          min-height: 100px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          cursor: pointer;
          transition: all 0.2Ease-in-out;
          position: relative;
          font-size: 0.875rem;
          border: none;
        }

        .calendarCell:hover {
          background: #f8fafc;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          z-index: 1;
        }

        .dateNumber {
          font-weight: 600;
          color: #1a1a1a;
          font-size: 1rem;
          margin-bottom: 6px;
        }

        .tithiBand {
          font-size: 0.75rem;
          color: #5b21b6;
          font-weight: 500;
          background: #ede9fe;
          padding: 2px 6px;
          border-radius: 4px;
          align-self: flex-start;
          margin-bottom: 4px;
        }

        .nakshatra {
          font-size: 0.7rem;
          color: #7c3aed;
          margin-top: auto;
          font-style: italic;
          opacity: 0.9;
        }

        .sunTimes {
          font-size: 0.68rem;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
        }

        .sunrise {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .sunset {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .sunIcon {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #f59e0b;
          display: inline-block;
        }

        .sunset .sunIcon {
          background: #ec4899;
        }

        /* Dim cells from other months */
        .calendarCell.otherMonth {
          opacity: 0.45;
          background: #f8f9fa;
        }

        .calendarCell.otherMonth:hover {
          opacity: 0.7;
          background: #f1f5f9;
        }

        /* Today highlight */
        .calendarCell.today {
          border: 2px solid #3b82f6;
          background: #eff6ff !important;
        }

        .calendarCell.today .dateNumber {
          color: #1d4ed8;
          font-weight: 700;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .calendarGrid {
            grid-template-columns: 50px repeat(7, 1fr);
            font-size: 0.8rem;
          }

          .rowLabel {
            padding: 8px 4px;
            font-size: 0.8rem;
          }

          .calendarCell {
            min-height: 80px;
            padding: 8px;
          }

          .dateNumber {
            font-size: 0.95rem;
          }
        }
      
  /* ==== Modal (unchanged, already perfect) ==== */
  .modalOverlay { position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:10000; padding:1rem; }
  .modalCard { background:rgba(255,255,255,.95); backdrop-filter:blur(12px); border:1px solid rgba(212,175,55,.3); border-radius:1.5rem; max-width:600px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.15); }
  .modalHeader { padding:1rem 1.5rem; background:#fefce8; border-bottom:1px solid rgba(212,175,55,.2); display:flex; justify-content:space-between; align-items:center; }
  .modalTitle { font-family:'Cormorant Garamond',serif; font-size:1.25rem; font-weight:700; color:#7c2d12; }
  .closeButton { width:36px; height:36px; background:white; border:1.5px solid #d4af37; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#b8972e; cursor:pointer; transition:all .3s; }
  .closeButton:hover { background:#d4af37; color:white; }
  .modalBody { padding:1.5rem; }
  .summaryGrid { display:grid; grid-template-columns:repeat(2,1fr); gap:0.75rem; margin-bottom:1rem; }
  .summaryItem { background:#f8f5f0; border:1px solid #e5e7eb; border-radius:0.875rem; padding:0.75rem; }
  .summaryLabel { font-size:0.75rem; color:#6b7280; margin-bottom:0.25rem; }
  .summaryValue { font-size:0.875rem; font-weight:600; color:#374151; }
  .section { background:white; border:1px solid #e5e7eb; border-radius:0.875rem; overflow:hidden; margin-bottom:1rem; }
  .sectionHeader { padding:0.5rem 1rem; background:#fefce8; font-weight:600; font-size:0.875rem; color:#7c2d12; border-bottom:1px solid rgba(212,175,55,.2); }
  .sectionBody { padding:1rem; }
  .listItem { display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #f1f5f9; }
  .listItem:last-child { border-bottom:none; }
  .listLabel { color:#6b7280; font-size:0.875rem; }
  .listValue { color:#374151; font-size:0.875rem; text-align:right; }
  .timingGroup { margin-bottom:1rem; }
  .timingTitle { font-weight:600; color:#7c2d12; margin-bottom:0.25rem; }
  .timingList { font-size:0.8125rem; color:#374151; }
  .loadingText { color:#9ca3af; font-size:0.8125rem; }
`}</style>

      <div className="calendarContainer" style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Hindu Date Card */}
        <div className="dateCardWrapper" style={{margin: '0 auto'}}>
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

        {/* Navigation */}
        <div className="navBar">
          <button className="navButton" onClick={onPrev} disabled={!onPrev} aria-label="Previous month">
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </button>
          <div className="monthTitle">{month.monthLabel}</div>
          <button className="navButton" onClick={onNext} disabled={!onNext} aria-label="Next month">
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="weekdayHeader">
          <div />
          {weekdays.map((w) => (
            <div key={w.en} className="weekdayCell">
              <div className="weekdayEn">{w.en}</div>
              <div className="weekdayHi">{w.hi}</div>
            </div>
          ))}
        </div>

{/* Calendar Grid */}
      <div className="calendarContainer">
        <div className="calendarGrid">
          {month.rows.map((row, ri) => (
            <React.Fragment key={ri}>
              {/* Row label (Mon, Tue…) */}
              <div className="rowLabel">
                <div>{weekdays[ri]?.en || ''}</div>
                <div className="rowLabelHi">{weekdays[ri]?.hi || ''}</div>
              </div>

              {/* Cells */}
              {row.map((cell, ci) => {
                const cellDate = new Date(viewYear, viewMonth + (cell?.monthOffset ?? 0), cell?.date ?? 1);
                const y = cellDate.getFullYear();
                const m = String(cellDate.getMonth() + 1).padStart(2, '0');
                const d = String(cellDate.getDate()).padStart(2, '0');
                const dateKey = `${y}-${m}-${d}`;

                const nm = nakshatraMap?.[dateKey];
                const nakshatraName = nm?.name ?? nm?.nakshatra_name ?? nm?.nakshatra?.name;

                const sm = sunMap?.[dateKey] ?? {};
                const sunrise = sm.sunrise ?? cell.sunrise;
                const sunset = sm.sunset ?? cell.sunset;

                const tm = tithiMap?.[dateKey];
                const tithiText = tm?.name
                  ? `${tm.name}${tm.paksha ? ` (${tm.paksha})` : ''}`
                  : undefined;

                const mergedCell = {
                  ...cell,
                  sunrise,
                  sunset,
                  ...(tithiText ? { tithiBand: tithiText } : {}),
                };

                const openModal = () => {
                  setModalDateKey(dateKey);
                  setModalCell(mergedCell);
                  setModalNakshatra(nakshatraName);
                  const cached = detailsCache[dateKey] ?? readFromStorage(dateKey);
                  setMoreData(cached ?? null);
                  setTimeout(() => setModalOpen(true), 0);
                };

                const isToday = dateKey === new Date().toISOString().split('T')[0];
                const isOtherMonth = cell?.monthOffset !== undefined;

                return (
                  <div
                    key={`${ri}-${ci}`}
                    className={`calendarCell ${isOtherMonth ? 'otherMonth' : ''} ${isToday ? 'today' : ''}`}
                    onClick={openModal}
                  >
                    <div className="dateNumber">{cell?.date}</div>

                    {tithiText && <div className="tithiBand">{tithiText}</div>}

                    {(sunrise || sunset) && (
                      <div className="sunTimes">
                        {sunrise && (
                          <div className="sunrise">
                            <span className="sunIcon"></span>
                            <span>{sunrise}</span>
                          </div>
                        )}
                        {sunset && (
                          <div className="sunset">
                            <span className="sunIcon"></span>
                            <span>{sunset}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {nakshatraName && <div className="nakshatra">{nakshatraName}</div>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

        {/* Modal */}
        {modalOpen && (
          <div className="modalOverlay" onClick={() => setModalOpen(false)}>
            <div className="modalCard" onClick={e => e.stopPropagation()}>
              <div className="modalHeader">
                <div className="modalTitle">
                  {modalDateKey ? new Date(modalDateKey).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : 'Date Details'}
                </div>
                <button className="closeButton" onClick={() => setModalOpen(false)}>
                  ×
                </button>
              </div>
              <div className="modalBody">
                {modalCell ? (
                  <div>
                    {/* Summary */}
                    <div className="summaryGrid">
                      <div className="summaryItem">
                        <div className="summaryLabel">Tithi</div>
                        <div className="summaryValue">{modalCell.tithiBand || '-'}</div>
                      </div>
                      <div className="summaryItem">
                        <div className="summaryLabel">Nakshatra</div>
                        <div className="summaryValue">{modalNakshatra || '-'}</div>
                      </div>
                      <div className="summaryItem">
                        <div className="summaryLabel">Sunrise</div>
                        <div className="summaryValue">{modalCell.sunrise || '-'}</div>
                      </div>
                      <div className="summaryItem">
                        <div className="summaryLabel">Sunset</div>
                        <div className="summaryValue">{modalCell.sunset || '-'}</div>
                      </div>
                    </div>

                    {/* Panchang & Auspicious */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="section">
                        <div className="sectionHeader">Panchang</div>
                        <div className="sectionBody">
                          <div className="listItem"><span className="listLabel">Weekday</span><span className="listValue">{new Date(modalDateKey).toLocaleDateString('en-US', { weekday: 'long' })}</span></div>
                          <div className="listItem"><span className="listLabel">Nakshatra</span><span className="listValue">{modalNakshatra || '-'}</span></div>
                          <div className="listItem"><span className="listLabel">Tithi</span><span className="listValue">{modalCell.tithiBand || '-'}</span></div>
                          <div className="listItem"><span className="listLabel">Sunrise</span><span className="listValue">{modalCell.sunrise || '-'}</span></div>
                          <div className="listItem"><span className="listLabel">Sunset</span><span className="listValue">{modalCell.sunset || '-'}</span></div>
                        </div>
                      </div>
                      <div className="section">
                        <div className="sectionHeader">Auspicious Details</div>
                        <div className="sectionBody">
                          {loadingMore && !moreData ? (
                            <div className="loadingText">Loading…</div>
                          ) : (
                            <>
                              {moreData?.['rahu-kalam'] && <div className="listItem"><span className="listLabel">Rahu</span><span className="listValue">{formatRange(parseOutput(moreData['rahu-kalam']))}</span></div>}
                              {moreData?.['gulika-kalam'] && <div className="listItem"><span className="listLabel">Gulika</span><span className="listValue">{formatRange(parseOutput(moreData['gulika-kalam']))}</span></div>}
                              {moreData?.['yama-gandam'] && <div className="listItem"><span className="listLabel">Yamaganda</span><span className="listValue">{formatRange(parseOutput(moreData['yama-gandam']))}</span></div>}
                              {moreData?.['abhijit-muhurat'] && (
                                <div style={{ marginTop: '0.75rem' }}>
                                  <div className="timingTitle">Abhijit Muhurat</div>
                                  <div className="timingList">{formatRange(parseOutput(moreData['abhijit-muhurat']))}</div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Important Timings */}
                    <div className="section">
                      <div className="sectionHeader">Important Timings</div>
                      <div className="sectionBody">
                        {loadingMore && !moreData ? (
                          <div className="loadingText">Loading…</div>
                        ) : (
                          <>
                            {(() => {
                              const val = moreData?.['dur-muhurat'];
                              if (!val || !isSuccess(val)) return null;
                              const ranges = extractRanges(val);
                              if (!ranges.length) return null;
                              return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Dur Muhurat</div>
                                  <div className="timingList">
                                    {ranges.map((r, i) => (
                                      <div key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const val = moreData?.['amrit-kaal'];
                              if (!val || !isSuccess(val)) return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Amrit Kaal</div>
                                  <div className="loadingText">Not available</div>
                                </div>
                              );
                              const ranges = extractRanges(val);
                              if (!ranges.length) return null;
                              return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Amrit Kaal</div>
                                  <div className="timingList">
                                    {ranges.map((r, i) => (
                                      <div key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const val = moreData?.['varjyam'];
                              if (!val || !isSuccess(val)) return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Varjyam</div>
                                  <div className="loadingText">Not available</div>
                                </div>
                              );
                              const ranges = extractRanges(val);
                              if (!ranges.length) return null;
                              return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Varjyam</div>
                                  <div className="timingList">
                                    {ranges.map((r, i) => (
                                      <div key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
                    <div className="mt-2 text-gray-600">Loading date details…</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}