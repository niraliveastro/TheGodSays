'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Share } from 'lucide-react'

const AstrologyResult = ({ option, data, onBack, onNewCalculation }) => {
  if (!data || !data.output) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <span>{option.name} - No Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No data available for this calculation.</p>
            <Button onClick={onNewCalculation} variant="outline">
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
    <Card>
      <CardHeader>
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
              <span>{option.name} - Results</span>
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              className="flex items-center space-x-2"
            >
              <Share className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {parsedData ? (
          <div className="space-y-4">
            {Object.entries(parsedData).map(([key, value]) => (
              <div key={key} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {typeof value}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {key.includes('time') || key.includes('date') || key.includes('at') ? (
                    <div className="space-y-1">
                      {Array.isArray(value) ? (
                        value.map((item, index) => (
                          <div key={index} className="font-mono text-xs">
                            {formatDateTime(item)}
                          </div>
                        ))
                      ) : (
                        <div className="font-mono text-xs">
                          {formatDateTime(value)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="font-mono text-xs whitespace-pre-wrap">
                      {formatValue(value)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Unable to parse the result data.</p>
            <Button onClick={onNewCalculation} variant="outline">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AstrologyResult
