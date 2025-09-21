'use client'

import { useState } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function DateSelector({ selectedDate, onDateChange, userLocation, onLocationChange }) {
  const [isLocationLoading, setIsLocationLoading] = useState(false)

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
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Date Selector */}
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Date
            </label>
            <Input
              id="date-select"
              type="date"
              value={formatDateForInput(selectedDate)}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {/* Current Date Display */}
        <div className="text-center">
          <p className="text-sm text-gray-600">Viewing Panchang for</p>
          <p className="text-lg font-semibold text-blue-600">
            {formatDateForDisplay(selectedDate)}
          </p>
        </div>

        {/* Location Selector */}
        <div className="flex items-center space-x-3">
          <MapPin className="w-5 h-5 text-green-600" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <Button
              onClick={handleGetCurrentLocation}
              disabled={isLocationLoading}
              variant="outline"
              size="sm"
              className="w-32"
            >
              {isLocationLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span>Getting...</span>
                </div>
              ) : (
                'Get Location'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Location Display */}
      {userLocation && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <MapPin className="w-4 h-4 inline mr-1" />
            Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Sun & Moon timings calculated for this location
          </p>
        </div>
      )}
    </div>
  )
}
