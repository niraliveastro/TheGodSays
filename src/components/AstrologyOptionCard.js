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
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 aspect-square ${getCardColor(option.id)}`}
      onClick={() => onClick(option.id)}
    >
      <CardContent className="p-2 h-full flex flex-col justify-between">
        {/* Icon and title */}
        <div className="flex flex-col items-center space-y-1 text-center">
          <div className="text-blue-600">
            {getIcon(option.id)}
          </div>
          <div className="font-bold text-xs leading-tight text-gray-800">
            {option.name}
          </div>
        </div>

        {/* Description */}
        <div className="text-center">
          <p className="text-xs text-gray-600 leading-tight mb-2">
            {option.description}
          </p>
        </div>

        {/* Click indicator */}
        <div className="flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AstrologyOptionCard
