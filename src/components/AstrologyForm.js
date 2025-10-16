'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Sparkles } from 'lucide-react'

const AstrologyForm = ({ option, onSubmit, onBack, isLoading }) => {
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
    <Card className="shadow-lg border-gray-100 rounded-2xl">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="tracking-tight">{option.name}</span>
            </CardTitle>
          </div>
          <div className="hidden md:flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Precise inputs improve accuracy
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{option.description}</p>
      </CardHeader>
      <CardContent className="pt-6">
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            Please correct the highlighted fields.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Date and Time Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Date & Time</span>
            </h3>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <Input
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleInputChange}
                  className={errors.year ? 'border-red-500' : ''}
                />
                {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <Input
                  name="month"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.month}
                  onChange={handleInputChange}
                  className={errors.month ? 'border-red-500' : ''}
                />
                {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <Input
                  name="date"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours (0-23)
                </label>
                <Input
                  name="hours"
                  type="number"
                  min="0"
                  max="23"
                  value={formData.hours}
                  onChange={handleInputChange}
                  className={errors.hours ? 'border-red-500' : ''}
                />
                {errors.hours && <p className="text-red-500 text-xs mt-1">{errors.hours}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minutes (0-59)
                </label>
                <Input
                  name="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={formData.minutes}
                  onChange={handleInputChange}
                  className={errors.minutes ? 'border-red-500' : ''}
                />
                {errors.minutes && <p className="text-red-500 text-xs mt-1">{errors.minutes}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seconds (0-59)
                </label>
                <Input
                  name="seconds"
                  type="number"
                  min="0"
                  max="59"
                  value={formData.seconds}
                  onChange={handleInputChange}
                  className={errors.seconds ? 'border-red-500' : ''}
                />
                {errors.seconds && <p className="text-red-500 text-xs mt-1">{errors.seconds}</p>}
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Location</span>
            </h3>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <Input
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 1.4433887"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className={errors.latitude ? 'border-red-500' : ''}
                />
                {errors.latitude && <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>}
                <p className="text-xs text-gray-500 mt-1">Range: -90 to 90</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <Input
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 103.8325013"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className={errors.longitude ? 'border-red-500' : ''}
                />
                {errors.longitude && <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>}
                <p className="text-xs text-gray-500 mt-1">Range: -180 to 180</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <Input
                  name="timezone"
                  type="number"
                  placeholder="e.g., 8"
                  value={formData.timezone}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-gray-500 mt-1">Example: IST = 5.5, UTC = 0</p>
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configuration</span>
            </h3>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observation Point
                </label>
                <select
                  name="observation_point"
                  value={formData.observation_point}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="geocentric">Geocentric</option>
                  <option value="topocentric">Topocentric</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ayanamsha
                </label>
                <select
                  name="ayanamsha"
                  value={formData.ayanamsha}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="lahiri">Lahiri</option>
                  <option value="sayana">Sayana</option>
                </select>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="inline-flex items-center">
                <span className="mr-2 inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                Calculating...
              </span>
            ) : (
              `Calculate ${option.name}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default AstrologyForm
