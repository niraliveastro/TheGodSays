'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Share } from 'lucide-react'

const AstrologyResult = ({ option, data, onBack, onNewCalculation }) => {
if (!data) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{option.name} - No Data</CardTitle>
      </CardHeader>
      <CardContent>
        <p>No data returned from the API.</p>
      </CardContent>
    </Card>
  );
}

// ✅ Handles { output: "\"{...}\"" }, direct JSON, and plain strings
const formatResult = (data) => {
  if (!data) return null;

  let raw = data;

  // Case 1: API returns { statusCode, output: "..." }
  if (raw && typeof raw === "object" && "output" in raw) {
    let out = raw.output;

    // Some endpoints (like Samvat) are double-encoded: "\"{...}\""
    // Try to unwrap 2 times safely.
    for (let i = 0; i < 2; i++) {
      if (typeof out === "string") {
        const trimmed = out.trim();

        // If it looks like JSON, try parse
        if (
          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
          try {
            out = JSON.parse(trimmed);
            continue;
          } catch {
            // stop trying if invalid
            break;
          }
        }

        // Otherwise try JSON.parse raw (this handles "\"{...}\"")
        try {
          out = JSON.parse(out);
          continue;
        } catch {
          break;
        }
      } else {
        break;
      }
    }

    return out;
  }

  // Case 2: already a plain object (no .output)
  if (typeof raw === "object") {
    return raw;
  }

  // Case 3: API returned JSON string
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw; // fallback: show as string
    }
  }

  return null;
};




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
                </div>
                <div className="text-sm text-gray-700">
                  {(() => {
                    const isDateField =
                      key === "timestamp" ||
                      key.endsWith("_at") ||
                      key.endsWith("_time") ||
                      key.endsWith("_date");

                      return (
                        isDateField ? (
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
                      )
                    );
                  })()}
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
