import { Card, CardContent } from '@/components/ui/card'

const TimingsSection = ({ timings }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {timings.map((timing, index) => (
        <Card key={index} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-red-500">
          <CardContent className="p-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⏱</span>
                <span className="font-medium text-gray-700">{timing.label}</span>
              </div>
              <span className="text-red-600 font-semibold bg-red-50 px-3 py-1 rounded-full text-sm">{timing.time}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default TimingsSection

