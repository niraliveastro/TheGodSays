'use client';

import { useState } from 'react';
import { Star, Check, Loader2 } from 'lucide-react';

const AstrologyOptions = ({ onOptionSelect, isLoading }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);

  const astrologyOptions = [
    { id: 'tithi-timings', name: 'Tithi Timings', description: 'Lunar day timings and details' },
    { id: 'nakshatra-timings', name: 'Nakshatra Timings', description: 'Lunar mansion timings' },
    { id: 'yoga-durations', name: 'Yoga Durations', description: 'Yoga period calculations' },
    { id: 'karana-timings', name: 'Karana Timings', description: 'Half lunar day timings' },
    { id: 'vedic-weekday', name: 'Vedic Weekday', description: 'Traditional weekday calculation' },
    { id: 'lunar-month-info', name: 'Lunar Month Info', description: 'Lunar month details' },
    { id: 'ritu-information', name: 'Ritu Information', description: 'Seasonal information' },
    { id: 'samvat-information', name: 'Samvat Information', description: 'Era and calendar info' },
    { id: 'aayanam', name: 'Aayanam', description: 'Precession of equinoxes' },
    { id: 'hora-timings', name: 'Hora Timings', description: 'Planetary hour timings' },
    { id: 'choghadiya-timings', name: 'Choghadiya Timings', description: 'Auspicious time periods' },
    { id: 'abhijit-muhurat', name: 'Abhijit Muhurat', description: 'Most auspicious time' },
    { id: 'amrit-kaal', name: 'Amrit Kaal', description: 'Nectar time period' },
    { id: 'brahma-muhurat', name: 'Brahma Muhurat', description: 'Divine time period' },
    { id: 'rahu-kalam', name: 'Rahu Kalam', description: 'Inauspicious time period' },
    { id: 'yama-gandam', name: 'Yama Gandam', description: 'Yama\'s time period' },
    { id: 'gulika-kalam', name: 'Gulika Kalam', description: 'Gulika\'s time period' },
    { id: 'dur-muhurat', name: 'Dur Muhurat', description: 'Inauspicious muhurat' },
    { id: 'varjyam', name: 'Varjyam', description: 'Forbidden time periods' },
    { id: 'good-bad-times', name: 'Good & Bad Times', description: 'Overall auspiciousness' }
  ];

  const handleOptionToggle = (optionId) => {
    setSelectedOptions(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOptions(astrologyOptions.map(o => o.id));
  };

  const handleClearAll = () => {
    setSelectedOptions([]);
  };

  const handleSubmit = () => {
    if (selectedOptions.length > 0) {
      onOptionSelect(selectedOptions);
    }
  };

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        .card {
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212,175,55,.25);
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,.08);
          transition: transform .3s, box-shadow .3s;
        }
        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,.12);
        }
        .cardHeader {
          padding: 1rem 1.5rem;
          background: #fefce8;
          border-bottom: 1px solid rgba(212,175,55,.2);
        }
        .cardTitle {
          display: flex;
          align-items: center;
          gap: .5rem;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #7c2d12;
        }
        .cardSubtitle {
          color: #555;
          font-size: .9rem;
          margin-top: .25rem;
        }
        .cardBody {
          padding: 1.5rem;
        }

        .quickActions {
          display: flex;
          gap: .75rem;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .btnSecondary {
          display: flex;
          align-items: center;
          gap: .5rem;
          padding: .5rem 1rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: .875rem;
          font-size: .875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .3s;
        }
        .btnSecondary:hover {
          background: #f9fafb;
          border-color: #d4af37;
          color: #b8972e;
        }
        .btnSecondary:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .selectionCount {
          font-size: .875rem;
          color: #666;
          font-weight: 500;
        }

        .optionsGrid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .optionsGrid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .optionsGrid { grid-template-columns: repeat(3, 1fr); }
        }

        .optionItem {
          padding: 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: .875rem;
          cursor: pointer;
          transition: all .3s;
          background: #fff;
          position: relative;
        }
        .optionItem:hover {
          border-color: #d4af37;
          background: #fefce8;
          transform: translateY(-1px);
        }
        .optionItem.selected {
          border-color: #d4af37;
          background: #fefce8;
          box-shadow: 0 0 0 3px rgba(212,175,55,.2);
        }

        .optionCheckbox {
          position: absolute;
          top: .75rem;
          right: .75rem;
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db;
          border-radius: .375rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .2s;
        }
        .optionItem.selected .optionCheckbox {
          background: #d4af37;
          border-color: #d4af37;
        }
        .optionCheckbox svg {
          width: 14px;
          height: 14px;
          color: white;
          opacity: 0;
          transition: opacity .2s;
        }
        .optionItem.selected .optionCheckbox svg {
          opacity: 1;
        }

        .optionName {
          font-weight: 600;
          color: #444;
          font-size: .95rem;
          margin-bottom: .25rem;
        }
        .optionDesc {
          font-size: .8rem;
          color: #666;
        }

        .submitSection {
          padding-top: 1rem;
          border-top: 1px solid rgba(212,175,55,.2);
          margin-top: 1rem;
        }
        .btnPrimary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          padding: .75rem 1.5rem;
          background: #d4af37;
          color: #fff;
          border: none;
          border-radius: .875rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all .3s;
          box-shadow: 0 4px 12px rgba(212,175,55,.3);
        }
        .btnPrimary:hover:not(:disabled) {
          background: #e6c04a;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(212,175,55,.4);
        }
        .btnPrimary:disabled {
          opacity: .6;
          cursor: not-allowed;
        }
        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">
            <Star style={{ width: 20, height: 20 }} />
            Select Astrological Calculations
          </div>
          <div className="cardSubtitle">
            Choose which astrological calculations you want to perform for your personalized Panchang
          </div>
        </div>

        <div className="cardBody">
          {/* Quick Actions */}
          <div className="quickActions">
            <button
              className="btnSecondary"
              onClick={handleSelectAll}
              disabled={isLoading}
            >
              Select All
            </button>
            <button
              className="btnSecondary"
              onClick={handleClearAll}
              disabled={isLoading}
            >
              Clear All
            </button>
            <div className="selectionCount">
              {selectedOptions.length} selected
            </div>
          </div>

          {/* Options Grid */}
          <div className="optionsGrid">
            {astrologyOptions.map((option) => (
              <div
                key={option.id}
                className={`optionItem ${selectedOptions.includes(option.id) ? 'selected' : ''}`}
                onClick={() => handleOptionToggle(option.id)}
              >
                <div className="optionCheckbox">
                  <Check style={{ width: 14, height: 14 }} />
                </div>
                <div className="optionName">{option.name}</div>
                <div className="optionDesc">{option.description}</div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="submitSection">
            <button
              className="btnPrimary"
              onClick={handleSubmit}
              disabled={selectedOptions.length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Calculating...
                </>
              ) : (
                `Calculate ${selectedOptions.length} Selected Options`
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AstrologyOptions;