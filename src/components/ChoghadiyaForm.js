'use client';

import { useState } from 'react';
import { Calendar, MapPin, Clock, Settings, Loader2 } from 'lucide-react';

const ChoghadiyaForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    date: new Date().getDate(),
    hours: 12,
    minutes: 0,
    seconds: 0,
    latitude: '',
    longitude: '',
    timezone: 8,
    observation_point: 'geocentric',
    ayanamsha: 'lahiri'
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.latitude || isNaN(formData.latitude)) {
      newErrors.latitude = 'Please enter a valid latitude';
    }
    if (!formData.longitude || isNaN(formData.longitude)) {
      newErrors.longitude = 'Please enter a valid longitude';
    }
    if (formData.year < 1900 || formData.year > 2100) {
      newErrors.year = 'Year must be between 1900 and 2100';
    }
    if (formData.month < 1 || formData.month > 12) {
      newErrors.month = 'Month must be between 1 and 12';
    }
    if (formData.date < 1 || formData.date > 31) {
      newErrors.date = 'Date must be between 1 and 31';
    }
    if (formData.hours < 0 || formData.hours > 23) {
      newErrors.hours = 'Hours must be between 0 and 23';
    }
    if (formData.minutes < 0 || formData.minutes > 59) {
      newErrors.minutes = 'Minutes must be between 0 and 59';
    }
    if (formData.seconds < 0 || formData.seconds > 59) {
      newErrors.seconds = 'Seconds must be between 0 and 59';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const payload = {
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        date: parseInt(formData.date),
        hours: parseInt(formData.hours),
        minutes: parseInt(formData.minutes),
        seconds: parseInt(formData.seconds),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        timezone: parseInt(formData.timezone),
        config: {
          observation_point: formData.observation_point,
          ayanamsha: formData.ayanamsha
        }
      };
      onSubmit(payload);
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
        .cardBody {
          padding: 1.5rem;
        }

        .section {
          margin-bottom: 1.5rem;
        }
        .sectionTitle {
          display: flex;
          align-items: center;
          gap: .5rem;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #7c2d12;
          margin-bottom: 1rem;
        }

        .grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 768px) {
          .grid { grid-template-columns: repeat(3, 1fr); }
        }

        .formField {
          display: flex;
          flex-direction: column;
          gap: .25rem;
        }
        .formLabel {
          font-size: .875rem;
          font-weight: 600;
          color: #444;
        }
        .formInput, .formSelect {
          width: 100%;
          padding: .65rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: .875rem;
          font-size: .925rem;
          transition: all .2s;
          background: #fff;
          font-family: inherit;
        }
        .formInput:focus, .formSelect:focus {
          outline: none;
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212,175,55,.3);
        }
        .formInput.error, .formSelect.error {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,.2);
        }
        .formError {
          color: #dc2626;
          font-size: .75rem;
          margin-top: .25rem;
        }

        /* Custom Select Arrow */
        .formSelect {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right .75rem center;
          background-repeat: no-repeat;
          background-size: 1.2em;
          padding-right: 2.5rem;
        }

        .submitBtn {
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
          margin-top: 1rem;
        }
        .submitBtn:hover:not(:disabled) {
          background: #e6c04a;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(212,175,55,.4);
        }
        .submitBtn:disabled {
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
            <Calendar style={{ width: 20, height: 20 }} />
            Choghadiya Timings
          </div>
        </div>

        <div className="cardBody">
          <form onSubmit={handleSubmit}>
            {/* Date & Time */}
            <div className="section">
              <div className="sectionTitle">
                <Clock style={{ width: 18, height: 18 }} />
                Date & Time
              </div>
              <div className="grid">
                <div className="formField">
                  <label className="formLabel">Year</label>
                  <input
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleInputChange}
                    className={`formInput ${errors.year ? 'error' : ''}`}
                  />
                  {errors.year && <p className="formError">{errors.year}</p>}
                </div>
                <div className="formField">
                  <label className="formLabel">Month</label>
                  <input
                    name="month"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.month}
                    onChange={handleInputChange}
                    className={`formInput ${errors.month ? 'error' : ''}`}
                  />
                  {errors.month && <p className="formError">{errors.month}</p>}
                </div>
                <div className="formField">
                  <label className="formLabel">Date</label>
                  <input
                    name="date"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={`formInput ${errors.date ? 'error' : ''}`}
                  />
                  {errors.date && <p className="formError">{errors.date}</p>}
                </div>
                <div className="formField">
                  <label className="formLabel">Hours (0-23)</label>
                  <input
                    name="hours"
                    type="number"
                    min="0"
                    max="23"
                    value={formData.hours}
                    onChange={handleInputChange}
                    className={`formInput ${errors.hours ? 'error' : ''}`}
                  />
                  {errors.hours && <p className="formError">{errors.hours}</p>}
                </div>
                <div className="formField">
                  <label className="formLabel">Minutes (0-59)</label>
                  <input
                    name="minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.minutes}
                    onChange={handleInputChange}
                    className={`formInput ${errors.minutes ? 'error' : ''}`}
                  />
                  {errors.minutes && <p className="formError">{errors.minutes}</p>}
                </div>
                <div className="formField">
                  <label className="formLabel">Seconds (0-59)</label>
                  <input
                    name="seconds"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.seconds}
                    onChange={handleInputChange}
                    className={`formInput ${errors.seconds ? 'error' : ''}`}
                  />
                  {errors.seconds && <p className="formError">{errors.seconds}</p>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="section">
              <div className="sectionTitle">
                <MapPin style={{ width: 18, height: 18 }} />
                Location
              </div>
              <div className="grid">
                <div className="formField">
                  <label className="formLabel">Latitude</label>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 1.4433887"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className={`formInput ${errors.latitude ? 'error' : ''}`}
                  />
                  {errors.latitude && <p className="formError">{errors.latitude}</p>}
                </div>
                <div className="formField">
                  <label className="formLabel">Longitude</label>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 103.8325013"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className={`formInput ${errors.longitude ? 'error' : ''}`}
                  />
                  {errors.longitude && <p className="formError">{errors.longitude}</p>}
                </div>
                <div className="formField">
                  <label className="formLabel">Timezone</label>
                  <input
                    name="timezone"
                    type="number"
                    placeholder="e.g., 8"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="formInput"
                  />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="section">
              <div className="sectionTitle">
                <Settings style={{ width: 18, height: 18 }} />
                Configuration
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="formField">
                  <label className="formLabel">Observation Point</label>
                  <select
                    name="observation_point"
                    value={formData.observation_point}
                    onChange={handleInputChange}
                    className="formSelect"
                  >
                    <option value="geocentric">Geocentric</option>
                    <option value="topocentric">Topocentric</option>
                  </select>
                </div>
                <div className="formField">
                  <label className="formLabel">Ayanamsha</label>
                  <select
                    name="ayanamsha"
                    value={formData.ayanamsha}
                    onChange={handleInputChange}
                    className="formSelect"
                  >
                    <option value="lahiri">Lahiri</option>
                    <option value="sayana">Sayana</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="submitBtn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Calculating...
                </>
              ) : (
                'Get Choghadiya Timings'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChoghadiyaForm;