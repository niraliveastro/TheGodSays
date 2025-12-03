'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Share2, Info, Sparkles, Calendar, Clock, Settings, Star } from 'lucide-react'

const AstrologyResult = ({ option, data, onBack, onNewCalculation }) => {

const getOptionIcon = (optionId) => {
  const id = optionId || option?.id || ''
  if (id.includes('weekday') || id.includes('lunar') || id.includes('ritu') || id.includes('samvat')) {
    return <Info className="w-6 h-6" />
  } else if (id.includes('hora') || id.includes('choghadiya') || id.includes('timing')) {
    return <Clock className="w-6 h-6" />
  } else if (id.includes('aayanam')) {
    return <Settings className="w-6 h-6" />
  } else {
    return <Calendar className="w-6 h-6" />
  }
}

const getCardTheme = (optionId) => {
  const id = optionId || option?.id || ''
  if (id.includes('weekday') || id.includes('lunar') || id.includes('ritu') || id.includes('samvat')) {
    return {
      gradient: 'from-amber-50 to-yellow-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      border: 'border-amber-200'
    }
  } else if (id.includes('hora') || id.includes('choghadiya')) {
    return {
      gradient: 'from-purple-50 to-violet-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      border: 'border-purple-200'
    }
  } else if (id.includes('timing')) {
    return {
      gradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: 'border-blue-200'
    }
  } else {
    return {
      gradient: 'from-green-50 to-emerald-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      border: 'border-green-200'
    }
  }
}

const theme = getCardTheme(option?.id)

if (!data) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden p-8">
        <div className="text-center py-12">
          <div className={`w-16 h-16 rounded-full ${theme.iconBg} flex items-center justify-center mx-auto mb-4`}>
            <Info className={`w-8 h-8 ${theme.iconColor}`} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{option.name} - No Data</h3>
          <p className="text-gray-600 mb-6">No data returned from the API.</p>
          {onNewCalculation && (
            <button
              onClick={onNewCalculation}
              className="px-6 py-3 rounded-lg font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: 'var(--color-gold)' }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
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
    <div className="max-w-6xl mx-auto">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-white to-purple-50/40 border border-gray-100 rounded-2xl p-6 md:p-8 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="w-fit flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center ring-1 ${theme.border}`}>
                {getOptionIcon(option?.id)}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {option.name}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">Calculation Results</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
        {/* Card Header */}
        <div className={`bg-gradient-to-r ${theme.gradient} border-b ${theme.border} p-6`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shadow-sm`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Detailed Results
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                All calculation data
              </p>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6">
          {parsedData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(parsedData).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`p-5 rounded-xl border ${theme.border} bg-gradient-to-br ${theme.gradient} hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${theme.iconBg} ${theme.iconColor} flex items-center justify-center flex-shrink-0`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                        {key.replace(/_/g, ' ')}
                      </h4>
                      <div className="text-gray-900">
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
                                    <div key={index} className="font-medium text-sm bg-white/50 px-3 py-1.5 rounded-lg">
                                      {formatDateTime(item)}
                                    </div>
                                  ))
                                ) : (
                                  <div className="font-medium text-sm bg-white/50 px-3 py-1.5 rounded-lg">
                                    {formatDateTime(value)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="font-semibold text-lg break-words">
                                {formatValue(value)}
                              </div>
                            )
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium mb-4">Unable to parse the result data.</p>
              {onNewCalculation && (
                <button
                  onClick={onNewCalculation}
                  className="px-6 py-3 rounded-lg font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                  style={{ backgroundColor: 'var(--color-gold)' }}
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AstrologyResult
