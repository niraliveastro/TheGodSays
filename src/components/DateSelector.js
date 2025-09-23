'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function DateSelector({ selectedDate, onDateChange, userLocation, onLocationChange, pendingLocation, onPendingLocationChange }) {
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchAbortRef = useRef(null)

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
      (error) => {
        console.error('Error getting location:', error)
        // Fallback to Delhi, India
        onLocationChange({ latitude: 28.6139, longitude: 77.2090 })
        setIsLocationLoading(false)
      }
    )
  }

  // Fetch location suggestions from OpenStreetMap Nominatim
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query || query.trim().length < 3) {
        setSuggestions([])
        return
      }
      try {
        setIsSearching(true)
        if (searchAbortRef.current) {
          searchAbortRef.current.abort()
        }
        const controller = new AbortController()
        searchAbortRef.current = controller
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TheGodSays/1.0 (contact: none)'
          },
          signal: controller.signal
        })
        const data = await res.json()
        const mapped = data.map(item => ({
          displayName: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon)
        }))
        setSuggestions(mapped)
      } catch (e) {
        // Ignore abort errors
      } finally {
        setIsSearching(false)
      }
    }

    const handle = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(handle)
  }, [query])

  const handleSuggestionSelect = (sugg) => {
    setQuery(sugg.displayName)
    setSuggestions([])
    onPendingLocationChange && onPendingLocationChange(sugg)
  }

  const formatDateForInput = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }

  const formatDateForDisplay = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="font-medium">Select Date</span>
        </div>
        <div className="relative">
          <Input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
          />
          <div className="mt-2 text-sm text-gray-600">
            {formatDateForDisplay(selectedDate)}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <span className="font-medium">Search Location</span>
        </div>
        <div className="relative">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter city name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
            />
            <Button
              onClick={handleGetCurrentLocation}
              disabled={isLocationLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              {isLocationLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                "Use My Location"
              )}
            </Button>
          </div>
          
          {/* Location suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((sugg, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                  onClick={() => handleSuggestionSelect(sugg)}
                >
                  {sugg.displayName}
                </button>
              ))}
            </div>
          )}
          
          {isSearching && (
            <div className="mt-2 text-sm text-gray-600 flex items-center">
              <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
              <span>Searching locations...</span>
            </div>
          )}
        </div>
      </div>

      {/* Location Display */}
      {(userLocation || pendingLocation) && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <MapPin className="w-4 h-4 inline mr-1" />
            {pendingLocation ? (
              <span>
                Selected: {pendingLocation.displayName || `${pendingLocation.latitude.toFixed(4)}, ${pendingLocation.longitude.toFixed(4)}`}
              </span>
            ) : (
              <span>
                Active: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </span>
            )}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Sun & Moon timings calculated for this location
          </p>
        </div>
      )}
    </div>
  )
}
