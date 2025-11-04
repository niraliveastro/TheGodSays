"use client";

import { useState, useEffect } from 'react';
import { nasaAPI } from '@/lib/nasaAPI';
import { Sparkles, CircleOff, Filter, ArrowUpDown, ExternalLink, AlertTriangle, Calendar, Gauge, Ruler, Navigation as NavigationIcon, X, Eye, Rocket, Star } from 'lucide-react';
import './cosmic-event-tracker.css';

export default function CosmicEventTracker() {
  const [neoData, setNeoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [hazardousOnly, setHazardousOnly] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, distance, size, velocity
  const [selectedNEOs, setSelectedNEOs] = useState([]);
  const [detailsModalNEO, setDetailsModalNEO] = useState(null);

  useEffect(() => {
    loadNEOData();
  }, []);

  const loadNEOData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const range = nasaAPI.getCurrentWeekRange();
      // console.log('Date range:', range);
      setDateRange(range);
      
      // console.log('Fetching NEO data...');
      const data = await nasaAPI.getNEOData(range.startDate, range.endDate);
      // console.log('NEO data received:', data);
      
      // Check if data exists
      if (!data || !data.near_earth_objects) {
        throw new Error('No data received from NASA API');
      }
      
      // Transform the data into a flat array
      const neos = [];
      Object.keys(data.near_earth_objects).forEach(date => {
        data.near_earth_objects[date].forEach(neo => {
          const closeApproach = neo.close_approach_data[0];
          neos.push({
            id: neo.id,
            name: neo.name,
            nasa_jpl_url: neo.nasa_jpl_url,
            isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
            diameter: nasaAPI.calculateAverageDiameter(neo),
            closeApproachDate: closeApproach.close_approach_date,
            closeApproachDateFull: closeApproach.close_approach_date_full,
            missDistance: parseFloat(closeApproach.miss_distance.kilometers),
            velocity: parseFloat(closeApproach.relative_velocity.kilometers_per_second),
            absoluteMagnitude: neo.absolute_magnitude_h
          });
        });
      });
      
      // console.log('Transformed NEOs:', neos.length, 'objects');
      setNeoData(neos);
    } catch (err) {
      console.error('Error loading NEO data:', err);
      setError(err.message || 'Failed to load cosmic events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadNextWeek = async () => {
    try {
      setLoading(true);
      setError(null);
      const nextRange = nasaAPI.getNextDateRange(dateRange.endDate, 6);
      setDateRange(nextRange);
      
      // console.log('Loading next week:', nextRange);
      const data = await nasaAPI.getNEOData(nextRange.startDate, nextRange.endDate);
      
      if (!data || !data.near_earth_objects) {
        throw new Error('No data received from NASA API');
      }
      
      const neos = [];
      Object.keys(data.near_earth_objects).forEach(date => {
        data.near_earth_objects[date].forEach(neo => {
          const closeApproach = neo.close_approach_data[0];
          neos.push({
            id: neo.id,
            name: neo.name,
            nasa_jpl_url: neo.nasa_jpl_url,
            isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
            diameter: nasaAPI.calculateAverageDiameter(neo),
            closeApproachDate: closeApproach.close_approach_date,
            closeApproachDateFull: closeApproach.close_approach_date_full,
            missDistance: parseFloat(closeApproach.miss_distance.kilometers),
            velocity: parseFloat(closeApproach.relative_velocity.kilometers_per_second),
            absoluteMagnitude: neo.absolute_magnitude_h
          });
        });
      });
      
      setNeoData(neos);
    } catch (err) {
      console.error('Error loading next week:', err);
      setError(err.message || 'Failed to load next week data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedNEOs = () => {
    let filtered = [...neoData];
    
    // Filter hazardous only
    if (hazardousOnly) {
      filtered = filtered.filter(neo => neo.isPotentiallyHazardous);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.closeApproachDate) - new Date(b.closeApproachDate);
        case 'distance':
          return a.missDistance - b.missDistance;
        case 'size':
          return b.diameter - a.diameter;
        case 'velocity':
          return b.velocity - a.velocity;
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const toggleNEOSelection = (neoId) => {
    setSelectedNEOs(prev => 
      prev.includes(neoId) 
        ? prev.filter(id => id !== neoId)
        : [...prev, neoId]
    );
  };

  const openDetailsModal = (neo, e) => {
    e.stopPropagation();
    setDetailsModalNEO(neo);
  };

  const closeDetailsModal = () => {
    setDetailsModalNEO(null);
  };

  const formatDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) return '';
    return `${nasaAPI.formatDate(dateRange.startDate)} to ${nasaAPI.formatDate(dateRange.endDate)}`;
  };

  if (loading && neoData.length === 0) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner">
            <Rocket className="loading-icon" />
          </div>
          <p className="loading-text">Scanning the cosmos for celestial visitors...</p>
        </div>
      </div>
    );
  }

  const displayedNEOs = filteredAndSortedNEOs();

  return (
    <div className="app">
              {/* Orbs */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

      {/* Header Section */}
      <div className="header">
        <div className="headerIcon" style={{width: 36, height: 36,}}>
          <CircleOff className="header-icon" />
        </div>
        <h1 className="title">Cosmic Event Tracker</h1>
        <p className="subtitle">Monitoring Near-Earth Objects & Asteroid Close Approaches</p>
      </div>

      {/* Controls Card */}
      <div className="card controls-card">
        <div className="controls-grid">
          <div className="control-group">
            <div className="control-label">
              <Filter size={18} />
              <span>Filters</span>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hazardousOnly}
                onChange={(e) => setHazardousOnly(e.target.checked)}
                className="checkbox-input"
              />
              <span className="checkbox-text">Potentially Hazardous Only</span>
            </label>
          </div>

          <div className="control-group">
            <div className="control-label">
              <ArrowUpDown size={18} />
              <span>Sort By</span>
            </div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="select-input"
            >
              <option value="date">Approach Date</option>
              <option value="distance">Miss Distance</option>
              <option value="size">Diameter (Size)</option>
              <option value="velocity">Relative Velocity</option>
            </select>
          </div>

          {selectedNEOs.length > 0 && (
            <div className="selection-badge">
              <Star size={16} />
              <span>{selectedNEOs.length} Selected for Comparison</span>
            </div>
          )}
        </div>
      </div>

      {/* Observation Period Card */}
      <div className="card period-card">
        <div className="period-header">
          <Calendar className="period-icon" />
          <h2 className="section-title">Current Observation Period</h2>
        </div>
        <div className="period-content">
          <p className="period-date-range">{formatDateRange()}</p>
          <div className="period-stats">
            <div className="stat-item">
              <Rocket size={18} />
              <span className="stat-value">{displayedNEOs.length}</span>
              <span className="stat-label">Object{displayedNEOs.length !== 1 ? 's' : ''} Detected</span>
            </div>
            <div className="stat-item">
              <AlertTriangle size={18} />
              <span className="stat-value">{displayedNEOs.filter(neo => neo.isPotentiallyHazardous).length}</span>
              <span className="stat-label">Potentially Hazardous</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* NEO Grid */}
      <div className="neo-grid">
        {displayedNEOs.map((neo) => (
          <div 
            key={neo.id} 
            className={`card neo-card ${neo.isPotentiallyHazardous ? 'hazardous' : ''} ${selectedNEOs.includes(neo.id) ? 'selected' : ''}`}
            onClick={() => toggleNEOSelection(neo.id)}
          >
            {neo.isPotentiallyHazardous && (
              <div className="hazard-badge">
                <AlertTriangle size={14} />
                <span>Potentially Hazardous</span>
              </div>
            )}

            <h3 className="neo-name">{neo.name}</h3>
            <p className="neo-id">Reference ID: {neo.id}</p>

            <div className="neo-details-grid">
              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <Calendar size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Closest Approach</span>
                  <span className="detail-value">{nasaAPI.formatDate(neo.closeApproachDate)}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <Ruler size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Estimated Diameter</span>
                  <span className="detail-value">{neo.diameter.toFixed(2)} km</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <NavigationIcon size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Miss Distance</span>
                  <span className="detail-value">{neo.missDistance.toLocaleString()} km</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <Gauge size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Relative Velocity</span>
                  <span className="detail-value">{neo.velocity.toFixed(2)} km/s</span>
                </div>
              </div>
            </div>

            <div className="neo-actions">
              <button 
                className="btn btn-primary btn-sm"
                onClick={(e) => openDetailsModal(neo, e)}
              >
                <Eye size={16} />
                <span>View Details</span>
              </button>
              <a 
                href={neo.nasa_jpl_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <span>NASA JPL</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {!loading && displayedNEOs.length === 0 && (
        <div className="empty-state card">
          <CircleOff className="empty-icon" />
          <h3>No Cosmic Events Found</h3>
          <p>No near-Earth objects match the selected filters for this observation period.</p>
        </div>
      )}

      {/* Load More Button */}
      <div className="load-more-section">
        <button 
          onClick={loadNextWeek}
          disabled={loading}
          className="btn btn-gold btn-lg"
        >
          {loading ? (
            <>
              <Rocket className="btn-icon spinning" />
              <span>Loading Next Week...</span>
            </>
          ) : (
            <>
              <Rocket className="btn-icon" />
              <span>Load Next Week</span>
            </>
          )}
        </button>
      </div>

      {/* Details Modal */}
      {detailsModalNEO && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <CircleOff className="modal-icon" />
                <div>
                  <h2 className="modal-title">{detailsModalNEO.name}</h2>
                  <p className="modal-subtitle">Near-Earth Object Details</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={closeDetailsModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {detailsModalNEO.isPotentiallyHazardous && (
                <div className="alert alert-warning">
                  <AlertTriangle size={20} />
                  <span><strong>Warning:</strong> Classified as Potentially Hazardous Asteroid (PHA)</span>
                </div>
              )}

              <div className="modal-section">
                <h3 className="section-title">Basic Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Closest Approach</span>
                    <span className="info-value">{nasaAPI.formatDate(detailsModalNEO.closeApproachDate)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Average Diameter</span>
                    <span className="info-value">{detailsModalNEO.diameter.toFixed(2)} km</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Relative Velocity</span>
                    <span className="info-value">{detailsModalNEO.velocity.toFixed(2)} km/s</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Miss Distance</span>
                    <span className="info-value">{detailsModalNEO.missDistance.toLocaleString()} km</span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3 className="section-title">Technical Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">NEO Reference ID</span>
                    <span className="info-value">{detailsModalNEO.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Absolute Magnitude</span>
                    <span className="info-value">{detailsModalNEO.absoluteMagnitude.toFixed(1)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Orbiting Body</span>
                    <span className="info-value">Earth</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Sentry Object</span>
                    <span className="info-value">{detailsModalNEO.isSentryObject ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <a 
                  href={detailsModalNEO.nasa_jpl_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-gold btn-lg"
                >
                  <span>View on NASA JPL</span>
                  <ExternalLink size={18} />
                </a>
                <button 
                  onClick={closeDetailsModal}
                  className="btn btn-secondary btn-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
