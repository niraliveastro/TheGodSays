'use client';

import React, { useEffect, useState } from 'react';
import HinduDateCard from './HinduDateCard';
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
  /* ──────────────────────  Modal / API cache (unchanged)  ────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDateKey, setModalDateKey] = useState(null);
  const [modalCell, setModalCell] = useState(null);
  const [modalNakshatra, setModalNakshatra] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreData, setMoreData] = useState(null);
  const [detailsCache, setDetailsCache] = useState({});

  const STORAGE_PREFIX = 'tgs:date-details:';
  const readFromStorage = k => { try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + k)); } catch { return null; } };
  const writeToStorage = (k, v) => { try { localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v)); } catch {} };

  const formatTime = v => {
    if (!v) return '-';
    if (typeof v === 'string' && /am|pm|AM|PM/.test(v)) return v;
    const d = new Date(v);
    if (!isNaN(d)) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const m = v.match(/\d{2}:\d{2}/);
    return m ? m[0] : v;
  };
  const formatRange = i => {
    if (!i) return '-';
    if (typeof i === 'string') return i;
    const s = i.start_time || i.start || i.startTime || i.starts_at || i.startsAt;
    const e = i.end_time   || i.end   || i.endTime   || i.ends_at   || i.endsAt;
    if (s || e) return `${formatTime(s) || '-'} — ${formatTime(e) || '-'}`;
    if (Array.isArray(i)) return i.map((x, idx) => `${idx + 1}. ${formatRange(x)}`).join('\n');
    return '-';
  };
  const parseOutput = v => {
    if (!v) return null;
    if (v.output && typeof v.output === 'string') { try { return JSON.parse(v.output); } catch { return v.output; } }
    return v;
  };
  const isSuccess = v => v && typeof v === 'object' && 'statusCode' in v ? Number(v.statusCode) === 200 : true;
  const extractRanges = v => {
    const p = parseOutput(v);
    if (!p) return [];
    if (Array.isArray(p)) return p.map(x => ({ start: x.starts_at || x.start_time || x.start || x.startTime, end: x.ends_at || x.end_time || x.end || x.endTime })).filter(r => r.start || r.end);
    const s = p.starts_at || p.start_time || p.start || p.startTime;
    const e = p.ends_at   || p.end_time   || p.end   || p.endTime;
    if (s || e) return [{ start: s, end: e }];
    return [];
  };

  /* ──────────────────────  Build flat list of cells  ────────────────────── */
  const flatCells = month.rows.flat();

  /* ──────────────────────  Today / selected date  ────────────────────── */
  const selectedCell = flatCells.find(c => c.isToday) || flatCells.find(c => c.monthOffset === 0) || flatCells[0];
  const base = new Date();
  let viewYear = base.getFullYear(), viewMonth = base.getMonth();
  try {
    const [mName, yStr] = String(month.monthLabel).split(' ');
    const idx = new Date(`${mName} 1, ${isNaN(+yStr) ? base.getFullYear() : +yStr}`).getMonth();
    viewMonth = idx;
    viewYear = isNaN(+yStr) ? base.getFullYear() : +yStr;
  } catch {}

  const selGreg = new Date(viewYear, viewMonth + (selectedCell?.monthOffset ?? 0), selectedCell?.date ?? 1);
  const tithi = (selectedCell?.tithiBand || '-').split(' ')[0] || '-';
  const gregDate = selGreg.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  const weekday = selGreg.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNumber = String(selGreg.getDate()).padStart(1, '0');
  const eraLine = header?.selectedBanner?.era || '-';
  const shakaLine = header?.selectedBanner?.leftSubtitle || '-';
  const dateKey = `${selGreg.getFullYear()}-${String(selGreg.getMonth() + 1).padStart(2, '0')}-${String(selGreg.getDate()).padStart(2, '0')}`;
  const nakshatraName = nakshatraMap?.[dateKey]?.name || nakshatraMap?.[dateKey]?.nakshatra_name || nakshatraMap?.[dateKey]?.nakshatra?.name;
  const primaryTitle = nakshatraName || header?.selectedBanner?.leftSubtitle?.replace(', ', ' ') || header?.selectedBanner?.leftTitle || month.monthLabel;

  /* ──────────────────────  Auto-fetch modal details  ────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      if (!modalOpen || !modalDateKey) return;
      const cached = detailsCache[modalDateKey] ?? readFromStorage(modalDateKey);
      if (cached) { setMoreData(cached); return; }

      setLoadingMore(true);
      try {
        let lat = 0, lng = 0;
        try {
          const pos = await new Promise((res, rej) => { navigator.geolocation ? navigator.geolocation.getCurrentPosition(res, rej) : rej(); });
          lat = pos.coords.latitude; lng = pos.coords.longitude;
        } catch {}
        const d = new Date(modalDateKey);
        const payload = {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          date: d.getDate(),
          hours: 12, minutes: 0, seconds: 0,
          latitude: lat, longitude: lng,
          timezone: -new Date().getTimezoneOffset() / 60,
          config: { observation_point: 'topocentric', ayanamsha: 'lahiri', lunar_month_definition: 'amanta' },
        };
        const [{ results: p }, { results: a }] = await Promise.all([
          astrologyAPI.getPanchangData(payload),
          astrologyAPI.getAuspiciousData(payload),
        ]);
        let merged = { ...p, ...a };
        /* … amrit-kaal / varjyam fallback (unchanged) … */
        if (!cancelled) {
          setMoreData(merged);
          setDetailsCache(prev => ({ ...prev, [modalDateKey]: merged }));
          writeToStorage(modalDateKey, merged);
        }
      } catch (e) { console.warn(e); } finally { if (!cancelled) setLoadingMore(false); }
    };
    fetch();
    return () => { cancelled = true; };
  }, [modalOpen, modalDateKey, detailsCache]);

  const openModal = cell => {
    const d = new Date(viewYear, viewMonth + (cell?.monthOffset ?? 0), cell?.date ?? 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setModalDateKey(key);
    setModalCell(cell);
    setModalNakshatra(nakshatraMap?.[key]?.name ?? nakshatraMap?.[key]?.nakshatra_name ?? nakshatraMap?.[key]?.nakshatra?.name);
    const cached = detailsCache[key] ?? readFromStorage(key);
    setMoreData(cached ?? null);
    setTimeout(() => setModalOpen(true), 0);
  };

  /* ──────────────────────  Render  ────────────────────── */
  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        .wrapper {font-family:var(--font-body);max-width:960px;margin:0 auto;padding:1rem;}
        .navBar{display:flex;justify-content:space-between;align-items:center;background:#fefce8;border:1px solid rgba(212,175,55,.2);border-top:none;border-radius:0 0 1.5rem 1.5rem;padding:.75rem 1rem;margin-top:.5rem;}
        .navBtn{width:36px;height:36px;background:white;border:1.5px solid var(--color-gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--color-gold-dark);cursor:pointer;transition:var(--transition-smooth);box-shadow:var(--shadow-sm);}
        .navBtn:hover{background:var(--color-gold);color:white;transform:scale(1.1);}
        .navBtn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
        .monthTitle{font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#7c2d12;}

        .weekdayHeader{display:grid;grid-template-columns:60px repeat(7,1fr);gap:.5rem;margin-top:1rem;}
        @media(max-width:640px){.weekdayHeader{grid-template-columns:48px repeat(7,1fr);gap:.375rem;}}
        .weekdayCell{background:#f8f9fa;border:1px solid #e2e8f0;border-radius:.75rem;text-align:center;padding:.5rem 0;font-weight:600;color:#374151;font-size:.875rem;}
        .weekdayHi{font-size:.625rem;color:#6b7280;margin-top:.125rem;}

        .calendarGrid{display:grid;grid-template-columns:60px repeat(7,1fr);gap:.75rem;margin-top:.75rem;}
        @media(max-width:640px){.calendarGrid{grid-template-columns:48px repeat(7,1fr);gap:.5rem;}}
        @media(max-width:480px){.calendarGrid{grid-template-columns:40px repeat(7,1fr);gap:.375rem;}}

        .rowLabel{background:#fefce8;border:1.5px solid var(--color-gold);border-radius:.75rem;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:.8125rem;font-weight:600;color:#7c2d12;padding:.25rem 0;}
        .rowLabelHi{font-size:.625rem;color:var(--color-gold-dark);}

        .cell{background:white;min-height:100px;padding:.75rem;display:flex;flex-direction:column;border-radius:.75rem;cursor:pointer;transition:var(--transition-smooth);position:relative;}
        .cell:hover{background:#f8fafc;transform:translateY(-2px);box-shadow:var(--shadow-md);}
        .dateNum{font-weight:600;color:#1a1a1a;font-size:1rem;margin-bottom:.375rem;}
        .tithiBand{font-size:.75rem;color:#5b21b6;background:#ede9fe;padding:2px .5rem;border-radius:.25rem;align-self:flex-start;margin-bottom:.25rem;}
        .sunTimes{font-size:.68rem;color:#64748b;display:flex;justify-content:space-between;margin:.25rem 0;}
        .sunrise,.sunset{display:flex;align-items:center;gap:3px;}
        .sunIcon{width:10px;height:10px;border-radius:50%;}
        .sunrise .sunIcon{background:#f59e0b;}
        .sunset .sunIcon{background:#ec4899;}
        .nakshatra{font-size:.7rem;color:#7c3aed;margin-top:auto;font-style:italic;opacity:.9;}

        .otherMonth{opacity:.45;background:#f8f9fa;}
        .otherMonth:hover{opacity:.7;background:#f1f5f9;}
        .today{border:2px solid #3b82f6;background:#eff6ff !important;}
        .today .dateNum{color:#1d4ed8;font-weight:700;}

        /* Modal – unchanged */
        .modalOverlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;padding:1rem;}
        .modalCard{background:rgba(255,255,255,.95);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,.3);border-radius:1.5rem;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-xl);}
        .modalHeader{padding:1rem 1.5rem;background:#fefce8;border-bottom:1px solid rgba(212,175,55,.2);display:flex;justify-content:space-between;align-items:center;}
        .modalTitle{font-family:var(--font-heading);font-size:1.25rem;font-weight:700;color:#7c2d12;}
        .closeButton{width:36px;height:36px;background:white;border:1.5px solid var(--color-gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--color-gold-dark);cursor:pointer;transition:var(--transition-smooth);}
        .closeButton:hover{background:var(--color-gold);color:white;}
        .modalBody{padding:1.5rem;}
        .summaryGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem;margin-bottom:1rem;}
        .summaryItem{background:#f8f5f0;border:1px solid #e5e7eb;border-radius:.875rem;padding:.75rem;}
        .summaryLabel{font-size:.75rem;color:#6b7280;margin-bottom:.25rem;}
        .summaryValue{font-size:.875rem;font-weight:600;color:#374151;}
        .section{background:white;border:1px solid #e5e7eb;border-radius:.875rem;overflow:hidden;margin-bottom:1rem;}
        .sectionHeader{padding:.5rem 1rem;background:#fefce8;font-weight:600;font-size:.875rem;color:#7c2d12;border-bottom:1px solid rgba(212,175,55,.2);}
        .sectionBody{padding:1rem;}
        .listItem{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #f1f5f9;}
        .listItem:last-child{border-bottom:none;}
        .listLabel{color:#6b7280;font-size:.875rem;}
        .listValue{color:#374151;font-size:.875rem;text-align:right;}
        .timingGroup{margin-bottom:1rem;}
        .timingTitle{font-weight:600;color:#7c2d12;margin-bottom:.25rem;}
        .timingList{font-size:.8125rem;color:#374151;}
        .loadingText{color:#9ca3af;font-size:.8125rem;}
      `}</style>

      <div className="wrapper">
        {/* Hindu Date Card */}
        <div style={{ marginBottom: '1.5rem' }}>
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
          <button className="navBtn" onClick={onPrev} disabled={!onPrev} aria-label="Prev"><ChevronLeft style={{ width: 18, height: 18 }} /></button>
          <div className="monthTitle">{month.monthLabel}</div>
          <button className="navBtn" onClick={onNext} disabled={!onNext} aria-label="Next"><ChevronRight style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Weekday header */}
        <div className="weekdayHeader">
          <div /> {/* corner */}
          {weekdays.map(w => (
            <div key={w.en} className="weekdayCell">
              <div>{w.en}</div>
              <div className="weekdayHi">{w.hi}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid – 8 columns (label + 7 days) */}
        <div className="calendarGrid">
          {month.rows.map((week, wIdx) => (
            <React.Fragment key={wIdx}>
              {/* Row label (SUN, MON…) */}
              <div className="rowLabel">
                <div>{weekdays[wIdx]?.en || ''}</div>
                <div className="rowLabelHi">{weekdays[wIdx]?.hi || ''}</div>
              </div>

              {/* 7 cells of the week */}
              {week.map((cell, dIdx) => {
                const cellDate = new Date(viewYear, viewMonth + (cell?.monthOffset ?? 0), cell?.date ?? 1);
                const y = cellDate.getFullYear();
                const m = String(cellDate.getMonth() + 1).padStart(2, '0');
                const d = String(cellDate.getDate()).padStart(2, '0');
                const key = `${y}-${m}-${d}`;

                const nm = nakshatraMap?.[key];
                const nakshatra = nm?.name ?? nm?.nakshatra_name ?? nm?.nakshatra?.name;

                const sm = sunMap?.[key] ?? {};
                const sunrise = sm.sunrise ?? cell.sunrise;
                const sunset  = sm.sunset  ?? cell.sunset;

                const tm = tithiMap?.[key];
                const tithiText = tm?.name ? `${tm.name}${tm.paksha ? ` (${tm.paksha})` : ''}` : undefined;

                const merged = { ...cell, sunrise, sunset, ...(tithiText ? { tithiBand: tithiText } : {}) };
                const isToday = key === new Date().toISOString().split('T')[0];
                const isOther = cell?.monthOffset !== undefined;

                return (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    className={`cell ${isOther ? 'otherMonth' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => openModal(merged)}
                  >
                    <div className="dateNum">{cell?.date}</div>

                    {/* Sunrise on TOP */}
                    {sunrise && (
                      <div className="sunTimes">
                        <div className="sunrise">
                          <span className="sunIcon" />
                          <span>{sunrise}</span>
                        </div>
                      </div>
                    )}

                    {tithiText && <div className="tithiBand">{tithiText}</div>}

                    {/* Sunset at BOTTOM (pushed by flex) */}
                    {sunset && (
                      <div className="sunTimes" style={{ marginTop: 'auto' }}>
                        <div className="sunset">
                          <span className="sunIcon" />
                          <span>{sunset}</span>
                        </div>
                      </div>
                    )}

                    {nakshatra && <div className="nakshatra">{nakshatra}</div>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* ──────────────────────  Modal (unchanged)  ────────────────────── */}
        {modalOpen && (
          <div className="modalOverlay" onClick={() => setModalOpen(false)}>
            <div className="modalCard" onClick={e => e.stopPropagation()}>
              <div className="modalHeader">
                <div className="modalTitle">
                  {modalDateKey ? new Date(modalDateKey).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : 'Date Details'}
                </div>
                <button className="closeButton" onClick={() => setModalOpen(false)}>×</button>
              </div>

              <div className="modalBody">
                {modalCell ? (
                  <>
                    <div className="summaryGrid">
                      <div className="summaryItem"><div className="summaryLabel">Tithi</div><div className="summaryValue">{modalCell.tithiBand || '-'}</div></div>
                      <div className="summaryItem"><div className="summaryLabel">Nakshatra</div><div className="summaryValue">{modalNakshatra || '-'}</div></div>
                      <div className="summaryItem"><div className="summaryLabel">Sunrise</div><div className="summaryValue">{modalCell.sunrise || '-'}</div></div>
                      <div className="summaryItem"><div className="summaryLabel">Sunset</div><div className="summaryValue">{modalCell.sunset || '-'}</div></div>
                    </div>

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
                          {loadingMore && !moreData ? <div className="loadingText">Loading…</div> : (
                            <>
                              {moreData?.['rahu-kalam'] && <div className="listItem"><span className="listLabel">Rahu</span><span className="listValue">{formatRange(parseOutput(moreData['rahu-kalam']))}</span></div>}
                              {moreData?.['gulika-kalam'] && <div className="listItem"><span className="listLabel">Gulika</span><span className="listValue">{formatRange(parseOutput(moreData['gulika-kalam']))}</span></div>}
                              {moreData?.['yama-gandam'] && <div className="listItem"><span className="listLabel">Yamaganda</span><span className="listValue">{formatRange(parseOutput(moreData['yama-gandam']))}</span></div>}
                              {moreData?.['abhijit-muhurat'] && (
                                <div style={{ marginTop: '.75rem' }}>
                                  <div className="timingTitle">Abhijit Muhurat</div>
                                  <div className="timingList">{formatRange(parseOutput(moreData['abhijit-muhurat']))}</div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="section">
                      <div className="sectionHeader">Important Timings</div>
                      <div className="sectionBody">
                        {loadingMore && !moreData ? <div className="loadingText">Loading…</div> : (
                          <>
                            {(() => {
                              const v = moreData?.['dur-muhurat'];
                              if (!v || !isSuccess(v)) return null;
                              const rs = extractRanges(v);
                              if (!rs.length) return null;
                              return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Dur Muhurat</div>
                                  <div className="timingList">{rs.map((r,i)=> <div key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</div>)}</div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const v = moreData?.['amrit-kaal'];
                              if (!v || !isSuccess(v)) return <div className="timingGroup"><div className="timingTitle">Amrit Kaal</div><div className="loadingText">Not available</div></div>;
                              const rs = extractRanges(v);
                              if (!rs.length) return null;
                              return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Amrit Kaal</div>
                                  <div className="timingList">{rs.map((r,i)=> <div key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</div>)}</div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const v = moreData?.['varjyam'];
                              if (!v || !isSuccess(v)) return <div className="timingGroup"><div className="timingTitle">Varjyam</div><div className="loadingText">Not available</div></div>;
                              const rs = extractRanges(v);
                              if (!rs.length) return null;
                              return (
                                <div className="timingGroup">
                                  <div className="timingTitle">Varjyam</div>
                                  <div className="timingList">{rs.map((r,i)=> <div key={i}>{`${formatTime(r.start)} — ${formatTime(r.end)}`}</div>)}</div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: 'var(--color-gold)', margin: '0 auto' }} />
                    <div style={{ marginTop: '.5rem', color: 'var(--color-gray-600)' }}>Loading date details…</div>
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