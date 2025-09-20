'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

const ChoghadiyaResults = ({ data }) => {
  if (!data || !data.output) {
    return null
  }

  const choghadiyaData = JSON.parse(data.output)
  
  const getChoghadiyaColor = (name) => {
    switch (name.toLowerCase()) {
      case 'char':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'labh':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'amrit':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'kaal':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'shubh':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rog':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'udveg':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getChoghadiyaMeaning = (name) => {
    switch (name.toLowerCase()) {
      case 'char':
        return 'Good for travel and movement'
      case 'labh':
        return 'Auspicious for business and profit'
      case 'amrit':
        return 'Most auspicious time for all activities'
      case 'kaal':
        return 'Inauspicious, avoid important activities'
      case 'shubh':
        return 'Auspicious for religious activities'
      case 'rog':
        return 'May cause health issues, avoid medical procedures'
      case 'udveg':
        return 'May cause anxiety and stress'
      default:
        return 'Check traditional meanings'
    }
  }

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const choghadiyaArray = Object.entries(choghadiyaData).map(([key, value]) => ({
    id: key,
    ...value
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Choghadiya Timings</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {choghadiyaArray.map((choghadiya) => (
            <div key={choghadiya.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getChoghadiyaColor(choghadiya.name)}`}>
                  {choghadiya.name}
                </div>
                <div className="text-sm text-gray-600">
                  Period #{choghadiya.id}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">Starts:</span>
                  <span>{formatDateTime(choghadiya.starts_at)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">Ends:</span>
                  <span>{formatDateTime(choghadiya.ends_at)}</span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {getChoghadiyaMeaning(choghadiya.name)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Quick Reference</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Char</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>Labh</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
              <span>Amrit</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Kaal</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span>Shubh</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
              <span>Rog</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Udveg</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChoghadiyaResults