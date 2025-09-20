import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

const FestivalCard = ({ festival }) => {
  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-600 text-lg">{festival.name}</h3>
            <p className="text-gray-600 text-sm">{festival.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FestivalCard

