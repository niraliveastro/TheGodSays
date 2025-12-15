'use client'

import { Calendar, Clock, Star, CalendarDays, Leaf, History, Gauge } from 'lucide-react'
import './styles/panchangCard.css'

const AstrologyOptionCard = ({ option, onClick }) => {
  const getIcon = (optionId) => {
    switch (optionId) {
      case 'vedic-weekday':
        return CalendarDays
      case 'lunar-month-info':
        return Calendar
      case 'ritu-information':
        return Leaf
      case 'samvat-information':
        return History
      case 'aayanam':
        return Gauge
      case 'choghadiya-timings':
        return Clock
      default:
        return Star
    }
  }

  const getType = (optionId) => {
    switch (optionId) {
      case 'vedic-weekday':
        return 'vedic-weekday'
      case 'lunar-month-info':
        return 'lunar-month'
      case 'ritu-information':
        return 'ritu'
      case 'samvat-information':
        return 'samvat'
      case 'aayanam':
        return 'aayanam'
      case 'choghadiya-timings':
        return 'choghadiya'
      default:
        return 'default'
    }
  }

  const Icon = getIcon(option.id)
  const dataType = getType(option.id)

  return (
    <div
      className="panchang-card"
      data-type={dataType}
      onClick={() => onClick(option.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(option.id) } }}
      style={{ cursor: 'pointer' }}
    >
      <div className="panchang-card-header">
        <div className="panchang-card-icon">
          <Icon />
        </div>
        <h3 className="panchang-card-label">{option.name}</h3>
      </div>
      <p className="panchang-card-value">{option.description}</p>
    </div>
  )
}

export default AstrologyOptionCard
