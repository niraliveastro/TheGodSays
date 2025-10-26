'use client';

import React from 'react';

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
  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;600;700&display=swap');

        .hinduCard {
          width: 320px;
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
          font-weight: 600;
          font-size: 0.875rem;
          color: #7c2d12;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }
        .cardBody {
          background: #ffffff;
          padding: 1rem;
        }
        .primaryTitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem;
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
        .rightCol {
          text-align: right;
          max-width: 8rem;
        }
        .tithi {
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
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
          margin-top: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
        }
        .footerLine {
          font-size: 0.8125rem;
          color: #6b7280;
          line-height: 1.4;
        }
        .footerLine strong {
          color: #7c2d12;
          font-weight: 600;
        }
      `}</style>

      <div className="hinduCard">
        {/* Header */}
        <div className="cardHeader">{heading}</div>

        {/* Main Body */}
        <div className="cardBody">
          {/* Primary title (Ashvina Shukla …) */}
          <div className="primaryTitle">{primaryTitle}</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Huge day number */}
            <div className="dayNumber">{dayNumber}</div>

            {/* Right column */}
            <div className="rightCol">
              <div className="tithi">{tithi}</div>
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
    </>
  );
}