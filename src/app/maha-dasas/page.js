'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Share,
  RefreshCw,
  MapPin,
  Calendar,
  Star,
  Sun,
  Moon,
  Zap as MarsIcon,
  Globe as RahuIcon,
  BookOpen as JupiterIcon,
  Clock as SaturnIcon,
  MessageCircle as MercuryIcon,
  Flame as KetuIcon,
  Heart as VenusIcon,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function MahaDasasPage() {
  const [mahaDasasData, setMahaDasasData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timezone: Math.round(pos.coords.longitude / 15),
          });
        },
        () => setUserLocation({ latitude: 28.6139, longitude: 77.2090, timezone: 5.5 })
      );
    } else {
      setUserLocation({ latitude: 28.6139, longitude: 77.2090, timezone: 5.5 });
    }
  }, []);

  // Fetch
  useEffect(() => {
    if (userLocation) fetchMahaDasasData();
  }, [userLocation]);

  const fetchMahaDasasData = async () => {
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
        config: { observation_point: 'geocentric', ayanamsha: 'sayana' },
      };

      const response = await fetch('https://json.freeastrologyapi.com/vimsottari/maha-dasas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'hARFI2eGxQ3y0s1i3ru6H1EnqNbJ868LqRQsNa0c',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        const mock = {
          statusCode: 200,
          output: JSON.stringify({
            "1": {"Lord": "Sun", "start_time": "2018-09-11 22:05:25", "end_time": "2024-09-11 11:00:24"},
            "2": {"Lord": "Moon", "start_time": "2024-09-11 11:00:24", "end_time": "2034-09-12 00:32:02"},
            "3": {"Lord": "Mars", "start_time": "2034-09-12 00:32:02", "end_time": "2041-09-11 19:36:11"},
            "4": {"Lord": "Rahu", "start_time": "2041-09-11 19:36:11", "end_time": "2059-09-12 10:21:09"},
            "5": {"Lord": "Jupiter", "start_time": "2059-09-12 10:21:09", "end_time": "2075-09-12 12:47:46"},
            "6": {"Lord": "Saturn", "start_time": "2075-09-12 12:47:46", "end_time": "2094-09-12 09:41:53"},
            "7": {"Lord": "Mercury", "start_time": "2094-09-12 09:41:53", "end_time": "2111-09-13 18:17:41"},
            "8": {"Lord": "Ketu", "start_time": "2111-09-13 18:17:41", "end_time": "2118-09-13 13:21:50"},
            "9": {"Lord": "Venus", "start_time": "2118-09-13 13:21:50", "end_time": "2138-09-13 16:25:07"}
          })
        };
        setMahaDasasData(mock);
        setError('Rate limit. Showing sample.');
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMahaDasasData(data);
    } catch (e) {
      setError('Failed to fetch.');
    } finally {
      setIsLoading(false);
    }
  };

  const parse = (raw) => {
    try { return JSON.parse(raw.output); } catch { return null; }
  };

  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return iso; }
  };

  const years = (s, e) => {
    const diff = (new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(diff * 10) / 10;
  };

  const isCurrent = (d) => {
    const n = Date.now();
    return n >= new Date(d.start_time) && n <= new Date(d.end_time);
  };

  const planetIcon = (lord) => {
    const map = {
      sun: <Sun style={{ width: 28, height: 28 }} />,
      moon: <Moon style={{ width: 28, height: 28 }} />,
      mars: <MarsIcon style={{ width: 28, height: 28 }} />,
      rahu: <RahuIcon style={{ width: 28, height: 28 }} />,
      jupiter: <JupiterIcon style={{ width: 28, height: 28 }} />,
      saturn: <SaturnIcon style={{ width: 28, height: 28 }} />,
      mercury: <MercuryIcon style={{ width: 28, height: 28 }} />,
      ketu: <KetuIcon style={{ width: 28, height: 28 }} />,
      venus: <VenusIcon style={{ width: 28, height: 28 }} />,
    };
    return map[lord.toLowerCase()] || <Star style={{ width: 28, height: 28 }} />;
  };

  const planetColor = (lord) => {
    const map = {
      sun: '#fef3c7', text: '#92400e', border: '#f59e0b',
      moon: '#dbeafe', text: '#1e40af', border: '#3b82f6',
      mars: '#fee2e2', text: '#991b1b', border: '#ef4444',
      rahu: '#e5e7eb', text: '#374151', border: '#6b7280',
      jupiter: '#f3e8ff', text: '#7c2d12', border: '#a855f7',
      saturn: '#e0e7ff', text: '#4338ca', border: '#6366f1',
      mercury: '#d1fae5', text: '#065f46', border: '#10b981',
      ketu: '#ffedd5', text: '#9a3412', border: '#f97316',
      venus: '#fce7f3', text: '#be185d', border: '#ec4899',
    };
    return map[lord.toLowerCase()] || { bg: '#e5e7eb', text: '#374151', border: '#6b7280' };
  };

  const parsed = mahaDasasData ? parse(mahaDasasData) : null;

  const handleDownload = () => {
  if (!parsed) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Maha Dasas Report', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  const tableData = Object.entries(parsed).map(([k, d]) => [
    d.Lord,
    fmt(d.start_time).split(',')[0],
    fmt(d.end_time).split(',')[0],
    `${years(d.start_time, d.end_time)} yrs`,
    isCurrent(d) ? 'CURRENT' : ''
  ]);

  doc.autoTable({
    head: [['Planet', 'Start Date', 'End Date', 'Duration', 'Status']],
    body: tableData,
    startY: y,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [212, 175, 55], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [253, 251, 247] },
  });

  doc.save('maha-dasas-report.pdf');
};

// Share (Web Share API + fallback)
const handleShare = async () => {
  if (!parsed) return;

  const shareData = {
    title: 'My Maha Dasas Report',
    text: `Check out my current planetary periods! Currently in ${Object.values(parsed).find(isCurrent)?.Lord || 'Unknown'} Dasa.`,
    url: window.location.href,
  };

  if (navigator.share && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      fallbackCopy();
    }
  } else {
    fallbackCopy();
  }
};

const fallbackCopy = () => {
  const text = `Maha Dasas Report\n${window.location.href}\n\nCurrent: ${
    Object.values(parsed).find(isCurrent)?.Lord || '—'
  } Dasa\n\n${Object.entries(parsed)
    .map(([k, d]) => `${d.Lord}: ${fmt(d.start_time)} → ${fmt(d.end_time)}`)
    .join('\n')}`;

  navigator.clipboard.writeText(text).then(() => {
    alert('Report copied to clipboard!');
  });
};

  return (
    <>
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

        .actionBar{display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:2.5rem;}
        .btn{display:flex;align-items:center;gap:.5rem;padding:.65rem 1.25rem;background:#fff;border:1.5px solid #e5e7eb;border-radius:.875rem;font-size:.925rem;font-weight:500;color:#444;cursor:pointer;transition:all .3s ease;}
        .btn:hover{background:#f9fafb;border-color:#d4af37;color:#b8972e;transform:translateY(-1px);}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .spin{animation:spin 1s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}

        .grid{display:grid;gap:1.5rem;grid-template-columns:1fr;}
        @media (min-width:640px){.grid{grid-template-columns:repeat(2,1fr);}}
        @media (min-width:1024px){.grid{grid-template-columns:repeat(3,1fr);}}

        .card{position:relative;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,.25);border-radius:1.5rem;overflow:hidden;transition:transform .3s,box-shadow .3s;box-shadow:0 8px 32px rgba(0,0,0,.08);}
        .card:hover{transform:translateY(-6px);box-shadow:0 20px 40px rgba(0,0,0,.12);}
        .accent{height:5px;}
        .current{border:2px solid #d4af37 !important;box-shadow:0 0 0 5px rgba(212,175,55,.3),0 16px 40px rgba(212,175,55,.25) !important;}
        .current .accent{background:linear-gradient(90deg,#d4af37,#b8972e);}

        .cardBody{padding:1.5rem 1.75rem;display:flex;gap:1rem;align-items:flex-start;}
        .iconBox{width:56px;height:56px;border-radius:1rem;display:flex;align-items:center;justify-content:center;color:#fff;}
        .titleGroup h3{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;margin:0;color:#111;}
        .desc{font-size:.875rem;color:#555;margin-top:.25rem;}
        .liveBadge{display:flex;align-items:center;gap:.4rem;background:rgba(212,175,55,.2);color:#b8972e;padding:.375rem .875rem;border-radius:9999px;font-size:.75rem;font-weight:700;text-transform:uppercase;border:1px solid rgba(212,175,55,.4);}
        .pulseDot{width:9px;height:9px;background:#d4af37;border-radius:50%;animation:pulse 2s infinite;}
        .infoRow { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
.infoLabel { font-weight: 600; color: #666; }
.infoValue { font-family: 'Courier New', monospace; font-weight: 700; color: #111; }
        .footer{padding:1rem 1.75rem;border-top:1px solid rgba(212,175,55,.2);text-align:center;background:rgba(255,255,255,.6);font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#666;}
      `}</style>

      <div className="app">
        {/* Orbs */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {/* Header */}
        <header className="header">
          <div className="headerIcon"><Star style={{ width: 36, height: 36, color: '#fff' }} /></div>
          <h1 className="title">Maha Dasas</h1>
          <p className="subtitle">Vimsottari Planetary Periods</p>
        </header>

        {/* Info Bar */}
        <div className="infoBar">
          <div className="infoItem"><Calendar /><span className="infoLabel">Date:</span><span className="infoValue">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
          <div className="infoItem"><Calendar /><span className="infoLabel">Time:</span><span className="infoValue pulse">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span></div>
          <div className="infoItem"><MapPin /><span className="infoLabel">Location:</span><span className="infoValue">{userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Detecting...'}</span></div>
        </div>

{/* Action Buttons */}
<div className="actionBar">
  <button onClick={fetchMahaDasasData} disabled={isLoading} className="btn">
    <RefreshCw className={isLoading ? 'spin' : ''} />Refresh
  </button>
  <div style={{ display: 'flex', gap: '0.75rem' }}>
    <button
      onClick={handleDownload}
      disabled={!mahaDasasData}
      className="btn"
    >
      <Download />Download PDF
    </button>
    <button
      onClick={handleShare}
      disabled={!mahaDasasData}
      className="btn"
    >
      <Share />Share
    </button>
  </div>
</div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,.9)', borderRadius: '1.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ width: 56, height: 56, border: '5px solid rgba(212,175,55,.2)', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
            <p>Calculating maha dasas...</p>
          </div>
        )}

        {/* Results */}
        {parsed && !isLoading && (
          <div className="grid">
            {Object.entries(parsed).map(([k, d]) => {
              const cur = isCurrent(d);
              const color = planetColor(d.Lord);
              return (
                <div key={k} className={`card ${cur ? 'current' : ''}`}>
                  <div className="accent" style={{ background: `linear-gradient(90deg, ${color.border}, ${color.border}dd)` }} />
<div className="cardBody">
  <div className="iconBox" style={{ background: `linear-gradient(135deg, ${color.border}, ${color.border}cc)` }}>
    {planetIcon(d.Lord)}
  </div>
  <div style={{ flex: 1 }}>
    <div className="titleGroup">
      <h3>{d.Lord} Dasa</h3>
      <p className="desc">
        {(() => {
          const desc = {
            sun: 'Leadership, vitality',
            moon: 'Emotions, intuition',
            mars: 'Energy, courage',
            rahu: 'Material desires',
            jupiter: 'Wisdom, growth',
            saturn: 'Discipline, karma',
            mercury: 'Communication',
            ketu: 'Detachment',
            venus: 'Love, beauty',
          };
          return desc[d.Lord.toLowerCase()] || 'Planetary period';
        })()}
      </p>
    </div>
    {cur && (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(212,175,55,.15)',
        color: '#b8972e',
        padding: '0.375rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        border: '1px solid rgba(212,175,55,.4)',
        marginTop: '0.5rem',
        boxShadow: '0 0 8px rgba(212,175,55,.3)'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          background: '#d4af37',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }}></div>
        LIVE
      </div>
    )}
  </div>
</div>

<div style={{ padding: '0 1.75rem 1.5rem' }}>
  <div style={{
    display: 'grid',
    gap: '0.75rem',
    gridTemplateColumns: '1fr',
    fontSize: '0.925rem',
    lineHeight: '1.5'
  }}>
    {/* Duration */}
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="infoLabel">Duration</span>
      <span className="infoValue">{years(d.start_time, d.end_time)} yrs</span>
    </div>

    {/* Start */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span className="infoLabel">Starts</span>
      <div style={{ textAlign: 'right', fontFamily: 'Courier New, monospace', fontWeight: 700, color: '#111' }}>
        <div>{new Date(d.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.125rem' }}>
          {new Date(d.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      </div>
    </div>

    {/* End */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span className="infoLabel">Ends</span>
      <div style={{ textAlign: 'right', fontFamily: 'Courier New, monospace', fontWeight: 700, color: '#111' }}>
        <div>{new Date(d.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.125rem' }}>
          {new Date(d.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      </div>
    </div>
  </div>
</div>

<div className="footer">PERIOD #{k}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}