'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Navigation } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const AstrologyForm = ({ option, onSubmit, onBack, isLoading }) => {
  const { theme } = useTheme()
  const isCosmic = theme === 'cosmic'
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
  })

  const [errors, setErrors] = useState({})
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleGetLocation = async () => {
    setIsGettingLocation(true)
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser')
        setIsGettingLocation(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setFormData(prev => ({
            ...prev,
            latitude: latitude.toFixed(7),
            longitude: longitude.toFixed(7),
            timezone: -new Date().getTimezoneOffset() / 60
          }))
          // Clear location errors
          setErrors(prev => ({
            ...prev,
            latitude: '',
            longitude: ''
          }))
          setIsGettingLocation(false)
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Unable to retrieve your location. Please enter manually.')
          setIsGettingLocation(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      )
    } catch (error) {
      console.error('Location error:', error)
      setIsGettingLocation(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.latitude || isNaN(formData.latitude)) {
      newErrors.latitude = 'Please enter a valid latitude'
    }
    if (!formData.longitude || isNaN(formData.longitude)) {
      newErrors.longitude = 'Please enter a valid longitude'
    }
    if (formData.year < 1900 || formData.year > 2100) {
      newErrors.year = 'Year must be between 1900 and 2100'
    }
    if (formData.month < 1 || formData.month > 12) {
      newErrors.month = 'Month must be between 1 and 12'
    }
    if (formData.date < 1 || formData.date > 31) {
      newErrors.date = 'Date must be between 1 and 31'
    }
    if (formData.hours < 0 || formData.hours > 23) {
      newErrors.hours = 'Hours must be between 0 and 23'
    }
    if (formData.minutes < 0 || formData.minutes > 59) {
      newErrors.minutes = 'Minutes must be between 0 and 59'
    }
    if (formData.seconds < 0 || formData.seconds > 59) {
      newErrors.seconds = 'Seconds must be between 0 and 59'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
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
      }
      onSubmit(payload)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header Card */}
      <div 
        className="bg-gradient-to-br from-white to-blue-50/40 border border-gray-100 rounded-2xl p-6 md:p-8 shadow-lg mb-6"
        style={{
          background: isCosmic 
            ? "rgba(22, 33, 62, 0.85)" 
            : undefined,
          borderColor: isCosmic 
            ? "rgba(212, 175, 55, 0.3)" 
            : undefined,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="w-fit flex items-center gap-2 px-4 py-2 rounded-lg border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tools</span>
          </Button>
          
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center ring-1 ring-blue-100">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-heading)' }}>
                {option.name}
              </h1>
              <p className="text-sm text-slate-600 mt-1" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                {option.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div 
        className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden"
        style={{
          background: isCosmic 
            ? "rgba(22, 33, 62, 0.85)" 
            : undefined,
          borderColor: isCosmic 
            ? "rgba(212, 175, 55, 0.3)" 
            : undefined,
        }}
      >
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          {/* Date and Time Section */}
          <div 
            className="bg-gradient-to-br from-blue-50/30 to-transparent rounded-xl p-6 border border-blue-100"
            style={{
              background: isCosmic 
                ? "rgba(22, 33, 62, 0.6)" 
                : undefined,
              borderColor: isCosmic 
                ? "rgba(212, 175, 55, 0.3)" 
                : undefined,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"
                style={{
                  background: isCosmic 
                    ? "rgba(212, 175, 55, 0.2)" 
                    : undefined,
                }}
              >
                <Clock className="w-5 h-5 text-blue-600" style={{ color: isCosmic ? "#d4af37" : undefined }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                Date & Time
              </h3>
            </div>
            
            {/* Date Fields */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                Date
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    Year
                  </label>
                  <Input
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleInputChange}
                    className={`h-11 rounded-lg ${errors.year ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.year && <p className="text-red-500 text-xs mt-1.5">{errors.year}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    Month (1-12)
                  </label>
                  <Input
                    name="month"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.month}
                    onChange={handleInputChange}
                    className={`h-11 rounded-lg ${errors.month ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.month && <p className="text-red-500 text-xs mt-1.5">{errors.month}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    Day (1-31)
                  </label>
                  <Input
                    name="date"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={`h-11 rounded-lg ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1.5">{errors.date}</p>}
                </div>
              </div>
            </div>

            {/* Time Fields */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                Time
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    Hours (0-23)
                  </label>
                  <Input
                    name="hours"
                    type="number"
                    min="0"
                    max="23"
                    value={formData.hours}
                    onChange={handleInputChange}
                    className={`h-11 rounded-lg ${errors.hours ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.hours && <p className="text-red-500 text-xs mt-1.5">{errors.hours}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    Minutes (0-59)
                  </label>
                  <Input
                    name="minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.minutes}
                    onChange={handleInputChange}
                    className={`h-11 rounded-lg ${errors.minutes ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.minutes && <p className="text-red-500 text-xs mt-1.5">{errors.minutes}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                    Seconds (0-59)
                  </label>
                  <Input
                    name="seconds"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.seconds}
                    onChange={handleInputChange}
                    className={`h-11 rounded-lg ${errors.seconds ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.seconds && <p className="text-red-500 text-xs mt-1.5">{errors.seconds}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div 
            className="bg-gradient-to-br from-green-50/30 to-transparent rounded-xl p-6 border border-green-100"
            style={{
              background: isCosmic 
                ? "rgba(22, 33, 62, 0.6)" 
                : undefined,
              borderColor: isCosmic 
                ? "rgba(212, 175, 55, 0.3)" 
                : undefined,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"
                  style={{
                    background: isCosmic 
                      ? "rgba(212, 175, 55, 0.2)" 
                      : undefined,
                  }}
                >
                  <MapPin className="w-5 h-5 text-green-600" style={{ color: isCosmic ? "#d4af37" : undefined }} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                  Location
                </h3>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-green-200 text-green-700 font-medium hover:bg-green-50 hover:border-green-300 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
                style={{
                  background: isCosmic 
                    ? "rgba(22, 33, 62, 0.9)" 
                    : undefined,
                  borderColor: isCosmic 
                    ? "rgba(212, 175, 55, 0.3)" 
                    : undefined,
                  color: isCosmic ? "#d4af37" : undefined,
                }}
              >
                {isGettingLocation ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    <span>Getting...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>My Location</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                  Latitude
                </label>
                <Input
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 28.6139"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className={`h-11 rounded-lg ${errors.latitude ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.latitude && <p className="text-red-500 text-xs mt-1.5">{errors.latitude}</p>}
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                  Longitude
                </label>
                <Input
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 77.2090"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className={`h-11 rounded-lg ${errors.longitude ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.longitude && <p className="text-red-500 text-xs mt-1.5">{errors.longitude}</p>}
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                  Timezone (Hours)
                </label>
                <Input
                  name="timezone"
                  type="number"
                  step="0.5"
                  placeholder="e.g., 5.5"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="h-11 rounded-lg border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1.5" style={{ color: isCosmic ? "rgba(212, 175, 55, 0.7)" : undefined }}>
                  Offset from UTC
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div 
            className="bg-gradient-to-br from-purple-50/30 to-transparent rounded-xl p-6 border border-purple-100"
            style={{
              background: isCosmic 
                ? "rgba(22, 33, 62, 0.6)" 
                : undefined,
              borderColor: isCosmic 
                ? "rgba(212, 175, 55, 0.3)" 
                : undefined,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"
                style={{
                  background: isCosmic 
                    ? "rgba(212, 175, 55, 0.2)" 
                    : undefined,
                }}
              >
                <Settings className="w-5 h-5 text-purple-600" style={{ color: isCosmic ? "#d4af37" : undefined }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                Configuration
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                  Observation Point
                </label>
                <select
                  name="observation_point"
                  value={formData.observation_point}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all bg-white"
                  style={{
                    background: isCosmic 
                      ? "rgba(10, 10, 15, 0.8)" 
                      : undefined,
                    borderColor: isCosmic 
                      ? "rgba(212, 175, 55, 0.3)" 
                      : undefined,
                    color: isCosmic ? "#d4af37" : undefined,
                  }}
                >
                  <option value="geocentric">Geocentric</option>
                  <option value="topocentric">Topocentric</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ color: isCosmic ? "#d4af37" : undefined }}>
                  Ayanamsha
                </label>
                <select
                  name="ayanamsha"
                  value={formData.ayanamsha}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all bg-white"
                  style={{
                    background: isCosmic 
                      ? "rgba(10, 10, 15, 0.8)" 
                      : undefined,
                    borderColor: isCosmic 
                      ? "rgba(212, 175, 55, 0.3)" 
                      : undefined,
                    color: isCosmic ? "#d4af37" : undefined,
                  }}
                >
                  <option value="lahiri">Lahiri</option>
                  <option value="sayana">Sayana</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--color-gold)' }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>Calculate {option.name}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AstrologyForm
