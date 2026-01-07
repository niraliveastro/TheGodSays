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
  const [stableTitle, setStableTitle] = useState(primaryTitle);
  const [stableTithi, setStableTithi] = useState(tithi);
  const [animateDay, setAnimateDay] = useState(false);

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

  // Animate when day changes
  useEffect(() => {
    if (dayNumber !== '-') {
      setAnimateDay(true);
      const t = setTimeout(() => setAnimateDay(false), 300);
      return () => clearTimeout(t);
    }
  }, [dayNumber]);

  const isDoubleDigit = String(dayNumber).length === 2;

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;600;700&display=swap');

        .cardWrapper {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .hinduCard {
          width: 360px;
          max-width: 100%;
          background: rgba(255, 255, 255, 0.95);
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
  padding: 1.25rem 1.5rem;
  position: relative;
}


        /* MAIN GRID */
        .bodyContent {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 260px;
          align-items: stretch;
        }

        /* LEFT */
        .leftCol {
          display: flex;
          align-items: flex-start;
        }

        .primaryTitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.65rem;
          font-weight: 700;
          color: #7c2d12;
          line-height: 1.2;
        }

        /* RIGHT */
        .rightCol {
          display: flex;
          flex-direction: column;
          height: 100%;
          text-align: right;
        }

        .rightTop {
          font-size: 0.8rem;
          align-self: flex-end;
        }

.centerDate {
  position: absolute;
  top: 50%;
  right: 1.5rem;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}


        .dayNumber {
          font-size: 8rem;
          font-weight: 900;
          color: #d4af37;
          line-height: 1;
          transition: transform 0.25s ease, opacity 0.25s ease;
        }

        /* Optical centering */
        .day-single {
          transform: translateX(0);
        }

        .day-double {
          transform: translateX(-0.18em);
        }

        /* Animation */
        .day-animate {
          transform: scale(1.08);
          opacity: 0.7;
        }

        .bottomTithi {
          margin-top: auto;
          font-weight: 700;
          font-size: 0.95rem;
          color: #374151;
          align-self: flex-end;
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
          font-size: 0.75rem;
          color: #7c2d12;
          font-weight: 500;
        }

        /* FOOTER */
        .footer {
          border-top: 1px solid rgba(212, 175, 55, 0.18);
          padding-top: 0.75rem;
          margin-top: 0.75rem;
        }

        .footerLine {
          font-size: 0.9rem;
          color: #374151;
        }

        .footerLine strong {
          color: #7c2d12;
        }

        /* MOBILE */
        @media (max-width: 480px) {
          .hinduCard {
            max-width: 340px;
          }

          .bodyContent {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .rightCol {
            align-items: center;
            text-align: center;
          }

          .rightTop,
          .bottomTithi {
            align-self: center;
          }

          .dayNumber {
            font-size: 6rem;
          }

          .day-double {
            transform: translateX(-0.12em);
          }
        }
      `}</style>

      <div className="cardWrapper">
        <div className="hinduCard">
          <div className="cardHeader">{heading}</div>

          <div className="cardBody">
            <div className="bodyContent">
              {/* LEFT */}
              <div className="leftCol">
                <div className="primaryTitle">
                  {stableTitle !== '-' ? stableTitle : 'Hindu Calendar'}
                </div>
              </div>

              {/* RIGHT */}
              <div className="rightCol">
                <div className="rightTop">
                  <div className="gregDate">{gregDate}</div>
                  <div className="weekday">{weekday}</div>
                  {rightExtra && <div className="rightExtra">{rightExtra}</div>}
                </div>

                <div className="centerDate">
                  <div
                    className={[
                      'dayNumber',
                      isDoubleDigit ? 'day-double' : 'day-single',
                      animateDay ? 'day-animate' : '',
                    ].join(' ')}
                  >
                    {dayNumber}
                  </div>
                </div>

                {stableTithi !== '-' && (
                  <div className="bottomTithi">{stableTithi}</div>
                )}
              </div>
            </div>
          </div>

          <div className="cardBody">
            <div className="footer">
              <div className="footerLine">
                <strong>Vikrama Samvat:</strong>{' '}
                {eraLine !== '-' ? eraLine.split('Kaliyukta')[0].trim() : '-'}
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
