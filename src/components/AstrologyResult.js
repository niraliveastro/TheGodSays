'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Share } from 'lucide-react'

const AstrologyResult = ({ option, data, onBack, onNewCalculation }) => {
  if (!data || !data.output) {
    return (
      <Card className="shadow-lg border-gray-100 rounded-2xl">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <CardTitle className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <span>{option.name} — No Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <p className="text-gray-600 mb-4">No data available for this calculation.</p>
            <Button onClick={onNewCalculation} variant="outline" className="rounded-xl">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatResult = (data) => {
    try {
      const parsedData = JSON.parse(data.output)
      return parsedData
    } catch (error) {
      return null
    }
  }

  const formatValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const formatDateTime = (dateTimeString) => {
    try {
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
    } catch (error) {
      return dateTimeString
    }
  }

  const parsedData = formatResult(data)

  const handleDownload = () => {
    const dataStr = JSON.stringify(parsedData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${option.id}-result.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${option.name} Result`,
          text: `Check out my ${option.name} calculation result`,
          url: window.location.href
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <Card className="shadow-lg border-gray-100 rounded-2xl">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <CardTitle className="flex items-center space-x-2">
              <span className="tracking-tight">{option.name} — Results</span>
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="flex items-center space-x-2 rounded-xl"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              className="flex items-center space-x-2 rounded-xl"
            >
              <Share className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {parsedData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(parsedData).map(([key, value]) => (
              <div key={key} className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-[10px] text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    {Array.isArray(value) ? 'array' : typeof value}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {key.includes('time') || key.includes('date') || key.includes('at') ? (
                    <div className="space-y-1">
                      {Array.isArray(value) ? (
                        value.map((item, index) => (
                          <div key={index} className="font-mono text-xs bg-gray-50 border border-gray-100 rounded px-2 py-1">
                            {formatDateTime(item)}
                          </div>
                        ))
                      ) : (
                        <div className="font-mono text-xs bg-gray-50 border border-gray-100 rounded px-2 py-1">
                          {formatDateTime(value)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <pre className="font-mono text-xs whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded p-2">
                      {formatValue(value)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-600 mb-4">Unable to parse the result data.</p>
            <Button onClick={onNewCalculation} variant="outline" className="rounded-xl">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AstrologyResult
