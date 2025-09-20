import { Card, CardContent } from '@/components/ui/card'

const TimingsSection = ({ timings }) => {
  return (
    <div className="space-y-3">
      {timings.map((timing, index) => (
        <Card key={index} className="p-4">
          <CardContent className="p-0">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">{timing.label}</span>
              <span className="text-red-600 font-semibold">{timing.time}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default TimingsSection

