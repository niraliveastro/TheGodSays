'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Star, Info, MapPin, Settings, ChevronRight } from 'lucide-react'

const AstrologyOptionCard = ({ option, onClick }) => {
  const getIcon = (optionId) => {
    switch (optionId) {
      case 'tithi-timings':
      case 'nakshatra-timings':
      case 'yoga-durations':
      case 'karana-timings':
        return <Calendar className="w-7 h-7" />
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
        return <Clock className="w-7 h-7" />
      case 'vedic-weekday':
      case 'lunar-month-info':
      case 'ritu-information':
      case 'samvat-information':
        return <Info className="w-7 h-7" />
      case 'aayanam':
        return <Settings className="w-7 h-7" />
      default:
        return <Star className="w-7 h-7" />
    }
  }

  const style = {
    bgClass: 'bg-white',
    iconBg: 'bg-amber-50',
    iconColor: 'text-gold',
    borderColor: 'border-gray-200'
  }

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl border ${style.borderColor} ${style.bgClass}
        cursor-pointer transition-all duration-200 
        hover:shadow-lg hover:border-gold/40
        active:scale-[0.98]
      `}
      onClick={() => onClick(option.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(option.id) } }}
    >
      <div className="relative p-5">
        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-lg ${style.iconBg} ${style.iconColor}
          flex items-center justify-center mb-4
          transition-all duration-200
          group-hover:shadow-sm
        `}>
          {getIcon(option.id)}
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-gray-900">
            {option.name}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">
            {option.description}
          </p>
        </div>

        {/* Arrow indicator */}
        <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ChevronRight className="w-4 h-4 text-gold" />
        </div>
      </div>
    </div>
  )
}

export default AstrologyOptionCard
