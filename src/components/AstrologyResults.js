'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, Clock, Calendar, MapPin, Info } from 'lucide-react'

const AstrologyResults = ({ results, selectedOptions }) => {
  if (!results || Object.keys(results).length === 0) {
    return null
  }

  const getOptionIcon = (optionId) => {
    switch (optionId) {
      case 'tithi-timings':
      case 'nakshatra-timings':
      case 'yoga-durations':
      case 'karana-timings':
        return <Calendar className="w-4 h-4" />
      case 'hora-timings':
      case 'choghadiya-timings':
      case 'rahu-kalam':
      case 'yama-gandam':
      case 'gulika-kalam':
        return <Clock className="w-4 h-4" />
      case 'vedic-weekday':
      case 'lunar-month-info':
      case 'ritu-information':
      case 'samvat-information':
        return <Info className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  const formatResult = (optionId, data) => {
    if (!data || !data.output) return 'No data available'
    
    try {
      const parsedData = JSON.parse(data.output)
      
      // Handle different result formats based on option type
      switch (optionId) {
        case 'choghadiya-timings':
          return formatChoghadiyaResults(parsedData)
        case 'hora-timings':
          return formatHoraResults(parsedData)
        case 'tithi-timings':
          return formatTithiResults(parsedData)
        case 'nakshatra-timings':
          return formatNakshatraResults(parsedData)
        case 'rahu-kalam':
        case 'yama-gandam':
        case 'gulika-kalam':
          return formatTimePeriodResults(parsedData)
        default:
          return formatGenericResults(parsedData)
      }
    } catch (error) {
      return 'Error parsing results'
    }
  }

  const formatChoghadiyaResults = (data) => {
    const periods = Object.entries(data).map(([key, value]) => ({
      id: key,
      ...value
    }))
    
    return (
      <div className="space-y-2">
        {periods.slice(0, 5).map((period) => (
          <div key={period.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{period.name}</span>
            <span className="text-sm text-gray-600">
              {new Date(period.starts_at).toLocaleTimeString()} - {new Date(period.ends_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {periods.length > 5 && (
          <div className="text-sm text-gray-500 text-center">
            +{periods.length - 5} more periods
          </div>
        )}
      </div>
    )
  }

  const formatHoraResults = (data) => {
    const horas = Object.entries(data).map(([key, value]) => ({
      id: key,
      ...value
    }))
    
    return (
      <div className="space-y-2">
        {horas.slice(0, 4).map((hora) => (
          <div key={hora.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{hora.planet || hora.name}</span>
            <span className="text-sm text-gray-600">
              {new Date(hora.starts_at).toLocaleTimeString()} - {new Date(hora.ends_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {horas.length > 4 && (
          <div className="text-sm text-gray-500 text-center">
            +{horas.length - 4} more horas
          </div>
        )}
      </div>
    )
  }

  const formatTithiResults = (data) => {
    return (
      <div className="space-y-2">
        {Object.entries(data).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{key}</span>
            <span className="text-sm text-gray-600">{value}</span>
          </div>
        ))}
      </div>
    )
  }

  const formatNakshatraResults = (data) => {
    return (
      <div className="space-y-2">
        {Object.entries(data).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{key}</span>
            <span className="text-sm text-gray-600">{value}</span>
          </div>
        ))}
      </div>
    )
  }

  const formatTimePeriodResults = (data) => {
    return (
      <div className="space-y-2">
        {Object.entries(data).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{key}</span>
            <span className="text-sm text-gray-600">{value}</span>
          </div>
        ))}
      </div>
    )
  }

  const formatGenericResults = (data) => {
    return (
      <div className="space-y-2">
        {Object.entries(data).slice(0, 5).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{key}</span>
            <span className="text-sm text-gray-600">{String(value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Your Astrological Results</h3>
      
      {selectedOptions.map((optionId) => {
        const result = results[optionId]
        const optionName = optionId.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        return (
          <Card key={optionId}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                {getOptionIcon(optionId)}
                <span>{optionName}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                formatResult(optionId, result)
              ) : (
                <div className="text-gray-500 text-center py-4">
                  No data available for this option
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default AstrologyResults
