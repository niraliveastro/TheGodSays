"use client";

/**
 * Cosmic Event Tracker Module
 *
 * This module provides a dynamic dashboard for tracking Near-Earth Objects (NEOs) and asteroid close approaches
 * using NASA's API. It displays a list of NEOs for the current week (with pagination for next weeks),
 * supports filtering (hazardous only), sorting (by date, distance, size, velocity), multi-selection,
 * and detailed modal views. The UI features a cosmic-themed design with orbs, cards, and interactive elements.
 *
 * Key Features:
 * - Fetches and transforms NEO data from NASA's API for a given date range.
 * - Real-time filtering and sorting of displayed objects.
 * - Selection mode for comparing multiple NEOs.
 * - Modal for detailed NEO information with external NASA JPL link.
 * - Pagination to load subsequent weeks.
 * - Loading, error, and empty states with branded messaging.
 * - Responsive grid layout adapting to screen size.
 *
 * Dependencies:
 * - React (useState, useEffect)
 * - Next.js (useRouter – not used directly, but implied for navigation)
 * - Lucide React icons
 * - nasaAPI: Custom API client for NASA NEO data fetching and utilities (getNEOData, getCurrentWeekRange, etc.)
 * - CSS: './cosmic-event-tracker.css' for scoped styling
 *
 * Styling: Relies on external CSS for animations, gradients, and responsive design.
 * Assumes nasaAPI handles API keys, rate limiting, and data normalization.
 *
 * @module CosmicEventTracker
 */

import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { nasaAPI } from "@/lib/nasaAPI";
import {
  Sparkles,
  CircleOff,
  Filter,
  ArrowUpDown,
  ExternalLink,
  AlertTriangle,
  Calendar,
  Gauge,
  Ruler,
  Navigation as NavigationIcon,
  X,
  Eye,
  Rocket,
  Star,
} from "lucide-react";
import { PageLoading } from "@/components/LoadingStates";
import "./cosmic-event-tracker.css";

/**
 * CosmicEventTracker Component
 *
 * Renders the main dashboard for NEO tracking. Manages data fetching, filtering, sorting,
 * selection, and modal interactions. Displays NEOs in a responsive grid with stats and controls.
 *
 * @returns {JSX.Element} The cosmic event tracker dashboard UI.
 */
export default function CosmicEventTracker() {
  // State management for data, UI, and interactions
  const [neoData, setNeoData] = useState([]); // Array of transformed NEO objects
  const [loading, setLoading] = useState(true); // Global loading state for API calls
  const [error, setError] = useState(null); // Error message from API or processing
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" }); // Current observation date range
  const [hazardousOnly, setHazardousOnly] = useState(false); // Filter flag for potentially hazardous asteroids
  const [sortBy, setSortBy] = useState("date"); // Active sort key: 'date', 'distance', 'size', 'velocity'
  const [selectedNEOs, setSelectedNEOs] = useState([]); // Array of selected NEO IDs for comparison
  const [detailsModalNEO, setDetailsModalNEO] = useState(null); // NEO object for modal display

  /**
   * Effect: Initial data load on component mount.
   * Triggers loadNEOData to fetch current week's NEOs.
   */
  useEffect(() => {
    loadNEOData();
  }, []); // Empty deps: run once on mount

  /**
   * Load NEO data for the current date range.
   * Fetches from NASA API, transforms response into flat array of NEO objects,
   * and updates state. Handles errors and sets date range.
   */
  const loadNEOData = async () => {
    try {
      setLoading(true);
      setError(null);

      const range = nasaAPI.getCurrentWeekRange(); // Get current week range via utility
      // console.log('Date range:', range);
      setDateRange(range);

      // console.log('Fetching NEO data...');
      const data = await nasaAPI.getNEOData(range.startDate, range.endDate); // API call
      // console.log('NEO data received:', data);

      // Check if data exists
      if (!data || !data.near_earth_objects) {
        throw new Error("No data received from NASA API");
      }

      // Transform the data into a flat array
      const neos = [];
      Object.keys(data.near_earth_objects).forEach((date) => {
        data.near_earth_objects[date].forEach((neo) => {
          const closeApproach = neo.close_approach_data[0]; // Assume first close approach
          neos.push({
            id: neo.id, // NASA NEO ID
            name: neo.name, // Asteroid designation/name
            nasa_jpl_url: neo.nasa_jpl_url, // External NASA link
            isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid, // PHA flag
            diameter: nasaAPI.calculateAverageDiameter(neo), // Utility for avg diameter
            closeApproachDate: closeApproach.close_approach_date, // YYYY-MM-DD
            closeApproachDateFull: closeApproach.close_approach_date_full, // Full ISO
            missDistance: parseFloat(closeApproach.miss_distance.kilometers), // km
            velocity: parseFloat(
              closeApproach.relative_velocity.kilometers_per_second
            ), // km/s
            absoluteMagnitude: neo.absolute_magnitude_h, // H magnitude
          });
        });
      });

      // console.log('Transformed NEOs:', neos.length, 'objects');
      setNeoData(neos);
    } catch (err) {
      console.error("Error loading NEO data:", err);
      setError(
        err.message || "Failed to load cosmic events. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load NEO data for the next week.
   * Updates date range and fetches new data, similar to loadNEOData.
   */
  const loadNextWeek = async () => {
    try {
      setLoading(true);
      setError(null);
      const nextRange = nasaAPI.getNextDateRange(dateRange.endDate, 6); // Next 7-day range
      setDateRange(nextRange);

      // console.log('Loading next week:', nextRange);
      const data = await nasaAPI.getNEOData(
        nextRange.startDate,
        nextRange.endDate
      );

      if (!data || !data.near_earth_objects) {
        throw new Error("No data received from NASA API");
      }

      const neos = [];
      Object.keys(data.near_earth_objects).forEach((date) => {
        data.near_earth_objects[date].forEach((neo) => {
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
            velocity: parseFloat(
              closeApproach.relative_velocity.kilometers_per_second
            ),
            absoluteMagnitude: neo.absolute_magnitude_h,
          });
        });
      });

      setNeoData(neos);
    } catch (err) {
      console.error("Error loading next week:", err);
      setError(
        err.message || "Failed to load next week data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Compute filtered and sorted NEO array.
   * Applies hazardous filter and sorts based on active criteria.
   * @returns {array} Filtered and sorted NEOs
   */
  const filteredAndSortedNEOs = () => {
    let filtered = [...neoData];

    // Filter hazardous only
    if (hazardousOnly) {
      filtered = filtered.filter((neo) => neo.isPotentiallyHazardous);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.closeApproachDate) - new Date(b.closeApproachDate);
        case "distance":
          return a.missDistance - b.missDistance;
        case "size":
          return b.diameter - a.diameter; // Descending for size
        case "velocity":
          return b.velocity - a.velocity; // Descending for velocity
        default:
          return 0;
      }
    });

    return filtered;
  };

  /**
   * Toggle selection of a NEO for comparison.
   * @param {string} neoId - ID of the NEO to toggle
   */
  const toggleNEOSelection = (neoId) => {
    setSelectedNEOs((prev) =>
      prev.includes(neoId)
        ? prev.filter((id) => id !== neoId)
        : [...prev, neoId]
    );
  };

  /**
   * Open details modal for a NEO.
   * @param {object} neo - NEO object to display
   * @param {Event} e - Click event (for stopPropagation)
   */
  const openDetailsModal = (neo, e) => {
    e.stopPropagation();
    setDetailsModalNEO(neo);
  };

  /**
   * Close details modal.
   */
  const closeDetailsModal = () => {
    setDetailsModalNEO(null);
  };

  /**
   * Format date range for display.
   * @returns {string} Formatted range (e.g., "Nov 12 to Nov 18, 2025")
   */
  const formatDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) return "";
    return `${nasaAPI.formatDate(dateRange.startDate)} to ${nasaAPI.formatDate(
      dateRange.endDate
    )}`;
  };

  // Initial loading state
  if (loading && neoData.length === 0) {
    return <PageLoading type="cosmic" message="Scanning the cosmos for celestial visitors..." />;
  }

  const displayedNEOs = filteredAndSortedNEOs(); // Compute displayed list

  // Main render: Dashboard layout
  return (
    <div className="app">
      {/* Orbs – Background decorative elements */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      {/* Header Section – Title and subtitle */}
      <div className="header">
        <div className="headerIcon" style={{ width: 36, height: 36 }}>
          <CircleOff className="header-icon" />
        </div>
        <h1 className="title">Cosmic Event Tracker</h1>
        <p className="subtitle">
          Monitoring Near-Earth Objects & Asteroid Close Approaches
        </p>
      </div>

      {/* Controls Card – Filters and sorting */}
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

          {/* Selection indicator */}
          {selectedNEOs.length > 0 && (
            <div className="selection-badge">
              <Star size={16} />
              <span>{selectedNEOs.length} Selected for Comparison</span>
            </div>
          )}
        </div>
      </div>

      {/* Observation Period Card – Date range and stats */}
      <div className="card period-card">
        <div className="period-header">
          <Calendar className="period-icon" />
          <h2 className="section-title">Current Observation Period</h2>
        </div>
        <div className="period-content">
          <p className="period-date-range">{formatDateRange()}</p>
          <div className="period-stats">
            <button className="stat-chip" type="button">
              <div className="stat-icon-wrap">
                <Rocket size={16} />
              </div>
              <div className="stat-text">
                <span className="stat-value">{displayedNEOs.length}</span>
                <span className="stat-label">
                  Object{displayedNEOs.length !== 1 ? "s" : ""} Detected
                </span>
              </div>
            </button>
            <button
              className={`stat-chip ${hazardousOnly ? "chip-active" : ""}`}
              type="button"
              onClick={() => setHazardousOnly(!hazardousOnly)}
              title="Toggle hazardous-only filter"
            >
              <div className="stat-icon-wrap warning">
                <AlertTriangle size={16} />
              </div>
              <div className="stat-text">
                <span className="stat-value">
                  {
                    displayedNEOs.filter((neo) => neo.isPotentiallyHazardous)
                      .length
                  }
                </span>
                <span className="stat-label">Potentially Hazardous</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* NEO Grid – Main list of NEO cards */}
      <div className="neo-grid">
        {displayedNEOs.map((neo) => (
          <div
            key={neo.id}
            className={`card neo-card ${
              neo.isPotentiallyHazardous ? "hazardous" : ""
            } ${selectedNEOs.includes(neo.id) ? "selected" : ""}`}
            onClick={() => toggleNEOSelection(neo.id)} // Toggle selection on card click
          >
            {/* PHA Badge */}
            {neo.isPotentiallyHazardous && (
              <div className="hazard-badge" title="Potentially Hazardous">
                <AlertTriangle size={14} />
                <span>Potentially Hazardous</span>
              </div>
            )}

            <h3 className="neo-name">{neo.name}</h3>
            <p className="neo-id">Reference ID: {neo.id}</p>

            {/* Details Grid */}
            <div className="neo-details-grid">
              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <Calendar size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Closest Approach</span>
                  <span className="detail-value">
                    {nasaAPI.formatDate(neo.closeApproachDate)}
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <Ruler size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Estimated Diameter</span>
                  <span className="detail-value">
                    {neo.diameter.toFixed(2)} km
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <NavigationIcon size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Miss Distance</span>
                  <span className="detail-value">
                    {neo.missDistance.toLocaleString()} km
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-wrapper">
                  <Gauge size={16} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Relative Velocity</span>
                  <span className="detail-value">
                    {neo.velocity.toFixed(2)} km/s
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="neo-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => openDetailsModal(neo, e)} // Open modal, stop propagation
              >
                <Eye size={16} />
                <span>View Details</span>
              </button>
              <a
                href={neo.nasa_jpl_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                onClick={(e) => e.stopPropagation()} // Prevent card selection
              >
                <span>NASA JPL</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && displayedNEOs.length === 0 && (
        <div className="empty-state card">
          <CircleOff className="empty-icon" />
          <h3>No Cosmic Events Found</h3>
          <p>
            No near-Earth objects match the selected filters for this
            observation period.
          </p>
        </div>
      )}

      {/* Load More Button – Pagination for next week */}
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
          {" "}
          {/* Close on overlay click */}
          <div
            className="modal-dialog card"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            {/* Prevent close on dialog click */}
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
              {/* PHA Warning */}
              {detailsModalNEO.isPotentiallyHazardous && (
                <div className="alert alert-warning">
                  <AlertTriangle size={20} />
                  <span>
                    <strong>Warning:</strong> Classified as Potentially
                    Hazardous Asteroid (PHA)
                  </span>
                </div>
              )}

              {/* Basic Information Section */}
              <div className="modal-section">
                <h3 className="section-title">Basic Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Closest Approach</span>
                    <span className="info-value">
                      {nasaAPI.formatDate(detailsModalNEO.closeApproachDate)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Average Diameter</span>
                    <span className="info-value">
                      {detailsModalNEO.diameter.toFixed(2)} km
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Relative Velocity</span>
                    <span className="info-value">
                      {detailsModalNEO.velocity.toFixed(2)} km/s
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Miss Distance</span>
                    <span className="info-value">
                      {detailsModalNEO.missDistance.toLocaleString()} km
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Details Section */}
              <div className="modal-section">
                <h3 className="section-title">Technical Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">NEO Reference ID</span>
                    <span className="info-value">{detailsModalNEO.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Absolute Magnitude</span>
                    <span className="info-value">
                      {detailsModalNEO.absoluteMagnitude.toFixed(1)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Orbiting Body</span>
                    <span className="info-value">Earth</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Sentry Object</span>
                    <span className="info-value">
                      {detailsModalNEO.isSentryObject ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
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
