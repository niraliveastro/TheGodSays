import { Moon, Star, Sparkles, Disc, Sunrise as SunriseIcon, Sunset as SunsetIcon } from 'lucide-react'
import './styles/panchangCard.css'

const iconMap = {
  'Tithi': Moon,
  'Nakshatra': Star,
  'Yoga': Sparkles,
  'Karana': Disc,
  'Sunrise': SunriseIcon,
  'Sunset': SunsetIcon,
  'Moonrise': Moon,
  'Moonset': Moon,
}

const typeMap = {
  'Tithi': 'tithi',
  'Nakshatra': 'nakshatra',
  'Yoga': 'yoga',
  'Karana': 'karana',
  'Sunrise': 'sunrise',
  'Sunset': 'sunset',
  'Moonrise': 'moonrise',
  'Moonset': 'moonset',
}

export default function PanchangCard({ label, value }) {
  const Icon = iconMap[label] || Star
  const dataType = typeMap[label] || 'default'

  return (
    <div className="panchang-card" data-type={dataType}>
      <div className="panchang-card-header">
        <div className="panchang-card-icon">
          <Icon />
        </div>
        <h3 className="panchang-card-label">{label}</h3>
      </div>
      <p className="panchang-card-value">{value}</p>
    </div>
  )
}