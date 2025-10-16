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
        return <Calendar className="w-5 h-5" />
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
        return <Clock className="w-5 h-5" />
      case 'vedic-weekday':
      case 'lunar-month-info':
      case 'ritu-information':
      case 'samvat-information':
        return <Info className="w-5 h-5" />
      case 'aayanam':
        return <Settings className="w-5 h-5" />
      default:
        return <Star className="w-5 h-5" />
    }
  }

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 border border-blue-100 bg-white hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-400 rounded-xl`}
      onClick={() => onClick(option.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(option.id) } }}
    >
      <CardContent className="p-4 flex flex-col items-center text-center">
        <div className="mb-3 mt-1 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 ring-1 ring-blue-100 group-hover:from-blue-100 group-hover:to-blue-200">
          {getIcon(option.id)}
        </div>
        <CardTitle className="text-[13px] font-semibold mb-0.5 text-gray-900">
          {option.name}
        </CardTitle>
        <p className="text-xs text-gray-600 leading-snug">
          {option.description}
        </p>
      </CardContent>
    </Card>
  )
}

export default AstrologyOptionCard
