/* DateSelector.js – pure JS (no TypeScript, no Tailwind) */
'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar, MapPin, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import './styles/dateSelector.css'

export default function DateSelector(props) {
  const {
    selectedDate,
    onDateChange,
    userLocation,
    onLocationChange,
    pendingLocation,
    onPendingLocationChange,
  } = props

  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchAbortRef = useRef(null)

  /* -------------------------------------------------
   *  GET CURRENT LOCATION
   * ------------------------------------------------- */
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    setIsLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        onLocationChange({ latitude, longitude })
        setIsLocationLoading(false)
      },
      () => {
        // fallback to Delhi
        onLocationChange({ latitude: 28.6139, longitude: 77.2090 })
        setIsLocationLoading(false)
      }
    )
  }

  /* -------------------------------------------------
   *  FETCH LOCATION SUGGESTIONS
   * ------------------------------------------------- */
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query?.trim() || query.trim().length < 3) {
        setSuggestions([])
        return
      }

      try {
        setIsSearching(true)
        if (searchAbortRef.current) searchAbortRef.current.abort()
        const controller = new AbortController()
        searchAbortRef.current = controller

        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
          query
        )}`
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TheGodSays/1.0 (contact: none)',
          },
          signal: controller.signal,
        })
        const data = await res.json()
        const mapped = data.map((item) => ({
          displayName: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        }))
        setSuggestions(mapped)
      } catch {
        // ignore abort errors
      } finally {
        setIsSearching(false)
      }
    }

    const timer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSuggestionSelect = (sugg) => {
    setQuery(sugg.displayName)
    setSuggestions([])
    onPendingLocationChange?.(sugg)
  }

  /* -------------------------------------------------
   *  DATE HELPERS
   * ------------------------------------------------- */
  const formatDateForInput = (date) =>
    date ? new Date(date).toISOString().split('T')[0] : ''
  const formatDateForDisplay = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : ''

  /* -------------------------------------------------
   *  RENDER
   * ------------------------------------------------- */
  return (
    <div className="date-location-card">
      {/* ==== FLEX ROW ==== */}
      <div className="date-location-row">
        {/* ---- DATE ---- */}
        <div className="date-col">
          <div className="section-head">
            <Calendar className="icon" />
            <span className="section-title">Select Date</span>
          </div>

          <Input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={(e) => onDateChange(e.target.value)}
            className="date-input"
          />

          <div className="date-display">{formatDateForDisplay(selectedDate)}</div>
        </div>

        {/* ---- LOCATION ---- */}
        <div className="date-col">
          <div className="section-head">
            <MapPin className="icon" />
            <span className="section-title">Search Location</span>
          </div>

          <div className="location-wrapper">
            <div className="location-row">
              <Input
                type="text"
                placeholder="Enter city name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="location-input"
              />

              <Button
                onClick={handleGetCurrentLocation}
                disabled={isLocationLoading}
                className="location-btn"
              >
                {isLocationLoading ? (
                  <>
                    <Loader2 className="icon-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <MapPin className="icon" />
                    My Location
                  </>
                )}
              </Button>
            </div>

            {/* ---- SUGGESTIONS ---- */}
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((sugg, i) => (
                  <button
                    key={i}
                    className="suggestion-item"
                    onClick={() => handleSuggestionSelect(sugg)}
                  >
                    <MapPin className="icon-sm" />
                    {sugg.displayName}
                  </button>
                ))}
              </div>
            )}

            {/* ---- SEARCHING ---- */}
            {isSearching && (
              <div className="searching">
                <Loader2 className="icon-spin-sm" />
                Searching locations…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==== APPLY PENDING LOCATION ==== */}
      {pendingLocation && (
        <div className="apply-section">
          <Button
            onClick={() => {
              onLocationChange({
                latitude: pendingLocation.latitude,
                longitude: pendingLocation.longitude,
              })
              onPendingLocationChange?.(undefined)
            }}
            className="apply-location-btn"
          >
            <Check className="icon" />
            Apply Location
          </Button>
        </div>
      )}
    </div>
  )
}