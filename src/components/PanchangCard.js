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
    <Card className="p-4 text-center hover:shadow-md transition-shadow border-t-4 border-t-blue-500 bg-gradient-to-b from-blue-50 to-white">
      <CardContent className="p-0">
        <div className="text-3xl mb-3">{getIcon(label)}</div>
        <div className="text-sm font-medium text-gray-600 mb-2">{label}</div>
        <div className="text-lg font-semibold text-blue-700">{value}</div>
      </CardContent>
    </Card>
  )
}

export default PanchangCard

