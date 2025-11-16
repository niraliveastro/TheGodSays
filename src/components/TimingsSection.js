import { Card, CardContent } from '@/components/ui/card'

const TimingsSection = ({ timings }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4">
      {timings.map((timing, index) => (
        <Card key={index} className="p-3 sm:p-4 hover:shadow-md transition-shadow border-l-4 border-l-red-500">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex items-center flex-1 min-w-0">
                <span className="text-red-500 mr-2 flex-shrink-0">⏱</span>
                <span className="font-medium text-gray-700 break-words">{timing.label}</span>
              </div>
              <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm whitespace-nowrap mt-auto sm:mt-0">{timing.time}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default TimingsSection