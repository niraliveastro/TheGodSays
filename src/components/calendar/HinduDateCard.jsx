'use client';

import React, { useEffect, useState } from 'react';

export default function HinduDateCard({
  heading = "Today's Hindu Date",
  primaryTitle = '-',
  tithi = '-',
  dayNumber = '-',
  gregDate = '-',
  weekday = '-',
  eraLine = '-',
  shakaLine = '-',
  rightExtra = '',
}) {
  // Preserve last valid values to avoid flicker while data loads
  const [stableTitle, setStableTitle] = useState(primaryTitle);
  const [stableTithi, setStableTithi] = useState(tithi);

  useEffect(() => {
    if (primaryTitle && primaryTitle !== '-') {
      setStableTitle(primaryTitle);
    }
  }, [primaryTitle]);

  useEffect(() => {
    if (tithi && tithi !== '-') {
      setStableTithi(tithi);
    }
  }, [tithi]);

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;600;700&display=swap');

        .cardWrapper {
          display: flex;
          justify-content: center;
          width: 100%;
          padding: 1rem 0;
        }

        .hinduCard {
          width: 340px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
          font-family: 'Inter', sans-serif;
        }

        .cardHeader {
          background: #fefce8;
          padding: 0.75rem 1rem;
          font-weight: 700;
          font-size: 0.95rem;
          color: #7c2d12;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }

        .cardBody {
          background: #ffffff;
          padding: 1.25rem 1.5rem;
        }

        .primaryTitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.65rem;
          font-weight: 700;
          color: #7c2d12;
          margin-bottom: 0.5rem;
        }

        .dayNumber {
          font-size: 8rem;
          line-height: 1;
          font-weight: 900;
          color: #d4af37;
          letter-spacing: -0.05em;
          margin-top: -0.5rem;
        }

        .bodyContent {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 0.75rem;
          min-height: 140px;
        }

        .rightCol {
          text-align: right;
          max-width: 8.5rem;
          justify-self: end;
        }

        .tithi {
          font-weight: 700;
          font-size: 0.95rem;
          color: #374151;
          line-height: 1.3;
          word-break: keep-all;
        }

        .gregDate {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .weekday {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .rightExtra {
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #7c2d12;
          font-weight: 500;
        }

        .footer {
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(212, 175, 55, 0.18);
        }

        .footerLine {
          font-size: 0.9rem;
          color: #374151;
          line-height: 1.4;
          font-family: 'Inter', sans-serif;
        }

        .footerLine strong {
          color: #7c2d12;
          font-weight: 600;
        }
      `}</style>

      {/* Wrapper centers the card */}
      <div className="cardWrapper">
        <div className="hinduCard">
          {/* Header */}
          <div className="cardHeader">{heading}</div>

          {/* Main Body */}
          <div className="cardBody">
            {/* Primary title */}
            <div className="primaryTitle">
              {stableTitle && stableTitle !== '-' ? stableTitle : 'Hindu Date'}
            </div>

            <div className="bodyContent">
              {/* Huge day number */}
              <div className="dayNumber">{dayNumber}</div>

              {/* Right column */}
              <div className="rightCol">
                <div className="tithi">
                  {stableTithi && stableTithi !== '-' ? stableTithi : ''}
                </div>
                <div className="gregDate">{gregDate}</div>
                <div className="weekday">{weekday}</div>
                {rightExtra && <div className="rightExtra">{rightExtra}</div>}
              </div>
            </div>
          </div>

          {/* Footer – era & shaka */}
          <div className="cardBody">
            <div className="footer">
              <div className="footerLine">
                <strong>Vikrama Samvat:</strong> {eraLine.split('Kaliyukta')[0].trim()}
              </div>
              <div className="footerLine">
                <strong>Shaka Year:</strong> {shakaLine}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
