'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, Calendar, Clock, MapPin, Settings } from 'lucide-react'

const AstrologyOptions = ({ onOptionSelect, isLoading }) => {
  const [selectedOptions, setSelectedOptions] = useState([])

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
  ]

  const handleOptionToggle = (optionId) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
  }

  const handleSelectAll = () => {
    setSelectedOptions(astrologyOptions.map(option => option.id))
  }

  const handleClearAll = () => {
    setSelectedOptions([])
  }

  const handleSubmit = () => {
    if (selectedOptions.length > 0) {
      onOptionSelect(selectedOptions)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="w-5 h-5" />
          <span>Select Astrological Calculations</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose which astrological calculations you want to perform for your personalized Panchang
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
              disabled={isLoading}
            >
              Select All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAll}
              disabled={isLoading}
            >
              Clear All
            </Button>
            <div className="text-sm text-gray-600 flex items-center">
              {selectedOptions.length} selected
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {astrologyOptions.map((option) => (
              <div
                key={option.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedOptions.includes(option.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleOptionToggle(option.id)}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.id)}
                    onChange={() => handleOptionToggle(option.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-sm">
                      {option.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {option.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={handleSubmit}
              disabled={selectedOptions.length === 0 || isLoading}
              className="w-full"
            >
              {isLoading ? 'Calculating...' : `Calculate ${selectedOptions.length} Selected Options`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AstrologyOptions
