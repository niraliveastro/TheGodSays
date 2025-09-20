import { Card, CardContent } from '@/components/ui/card'

const HoraTimeline = ({ horas }) => {
  const getQualityColor = (quality) => {
    switch (quality) {
      case 'Excellent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Good':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Average':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {horas.map((hora, index) => (
        <Card key={index} className="p-3">
          <CardContent className="p-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">
                    {hora.planet.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-800">{hora.planet}</div>
                  <div className="text-sm text-gray-600">
                    {hora.start} - {hora.end}
                  </div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getQualityColor(hora.quality)}`}>
                {hora.quality}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default HoraTimeline

