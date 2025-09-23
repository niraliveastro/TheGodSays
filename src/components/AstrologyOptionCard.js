'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Star, Info, MapPin, Settings } from 'lucide-react'

const AstrologyOptionCard = ({ option, onClick }) => {
  const getIcon = (optionId) => {
    switch (optionId) {
      case 'tithi-timings':
      case 'nakshatra-timings':
      case 'yoga-durations':
      case 'karana-timings':
        return <Calendar className="w-6 h-6" />
      case 'hora-timings':
      case 'choghadiya-timings':
      case 'rahu-kalam':
      case 'yama-gandam':
      case 'gulika-kalam':
      case 'abhijit-muhurat':
      case 'amrit-kaal':
      case 'brahma-muhurat':
      case 'dur-muhurat':
      case 'varjyam':
      case 'good-bad-times':
        return <Clock className="w-6 h-6" />
      case 'vedic-weekday':
      case 'lunar-month-info':
      case 'ritu-information':
      case 'samvat-information':
        return <Info className="w-6 h-6" />
      case 'aayanam':
        return <Settings className="w-6 h-6" />
      default:
        return <Star className="w-6 h-6" />
    }
  }

  const getCardColor = (optionId) => {
    switch (optionId) {
      case 'tithi-timings':
      case 'nakshatra-timings':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100'
      case 'yoga-durations':
      case 'karana-timings':
        return 'border-green-200 bg-green-50 hover:bg-green-100'
      case 'hora-timings':
      case 'choghadiya-timings':
        return 'border-purple-200 bg-purple-50 hover:bg-purple-100'
      case 'rahu-kalam':
      case 'yama-gandam':
      case 'gulika-kalam':
      case 'dur-muhurat':
      case 'varjyam':
        return 'border-red-200 bg-red-50 hover:bg-red-100'
      case 'abhijit-muhurat':
      case 'amrit-kaal':
      case 'brahma-muhurat':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
      case 'good-bad-times':
        return 'border-orange-200 bg-orange-50 hover:bg-orange-100'
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    }
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${getCardColor(option.id)}`}
      onClick={() => onClick(option.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(option.id) } }}
    >
      <CardContent className="p-4 flex flex-col items-center text-center">
        <div className="text-blue-600 mb-3 mt-2">
          {getIcon(option.id)}
        </div>
        <CardTitle className="text-sm font-medium mb-1">{option.name}</CardTitle>
        <p className="text-xs text-gray-600">{option.description}</p>
      </CardContent>
    </Card>
  )
}

export default AstrologyOptionCard
