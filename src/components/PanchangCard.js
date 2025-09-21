import { Card, CardContent } from '@/components/ui/card'

const PanchangCard = ({ label, value }) => {
  const getIcon = (label) => {
    switch (label.toLowerCase()) {
      case 'tithi':
        return '🌙'
      case 'nakshatra':
        return '⭐'
      case 'yoga':
        return '🧘'
      case 'karana':
        return '⏰'
      case 'sunrise':
        return '🌅'
      case 'sunset':
        return '🌇'
      case 'moonrise':
        return '🌙'
      case 'moonset':
        return '🌚'
      default:
        return '📅'
    }
  }

  return (
    <Card className="p-4 text-center hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="text-2xl mb-2">{getIcon(label)}</div>
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        <div className="text-lg font-semibold text-blue-600">{value}</div>
      </CardContent>
    </Card>
  )
}

export default PanchangCard

