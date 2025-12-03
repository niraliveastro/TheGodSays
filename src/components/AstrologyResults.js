'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, Clock, Calendar, MapPin, Info, Download, Share2, ArrowLeft, Sparkles } from 'lucide-react'

const AstrologyResults = ({ results, selectedOptions, onBack }) => {
  if (!results || Object.keys(results).length === 0) {
    return null
  }

  const getOptionIcon = (optionId, size = "w-5 h-5") => {
    switch (optionId) {
      case 'tithi-timings':
      case 'nakshatra-timings':
      case 'yoga-durations':
      case 'karana-timings':
        return <Calendar className={size} />
      case 'hora-timings':
      case 'choghadiya-timings':
      case 'rahu-kalam':
      case 'yama-gandam':
      case 'gulika-kalam':
        return <Clock className={size} />
      case 'vedic-weekday':
      case 'lunar-month-info':
      case 'ritu-information':
      case 'samvat-information':
        return <Info className={size} />
      default:
        return <Star className={size} />
    }
  }

  const getCardTheme = (optionId) => {
    switch (optionId) {
      case 'tithi-timings':
      case 'nakshatra-timings':
        return {
          gradient: 'from-blue-50 to-indigo-50',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          border: 'border-blue-200'
        }
      case 'yoga-durations':
      case 'karana-timings':
        return {
          gradient: 'from-green-50 to-emerald-50',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          border: 'border-green-200'
        }
      case 'hora-timings':
      case 'choghadiya-timings':
        return {
          gradient: 'from-purple-50 to-violet-50',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          border: 'border-purple-200'
        }
      case 'rahu-kalam':
      case 'yama-gandam':
      case 'gulika-kalam':
        return {
          gradient: 'from-red-50 to-rose-50',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          border: 'border-red-200'
        }
      case 'vedic-weekday':
      case 'lunar-month-info':
      case 'ritu-information':
      case 'samvat-information':
        return {
          gradient: 'from-amber-50 to-yellow-50',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          border: 'border-amber-200'
        }
      default:
        return {
          gradient: 'from-gray-50 to-slate-50',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          border: 'border-gray-200'
        }
    }
  }

  const handleDownload = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'astrology-results.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'My Astrology Results',
      text: 'Check out my Vedic astrology calculation results!',
    }
    
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        alert('Sharing is not supported on this browser')
      }
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const formatResult = (optionId, data, theme) => {
    if (!data || !data.output) return 'No data available'
    
    try {
      const parsedData = JSON.parse(data.output)
      
      // Handle different result formats based on option type
      switch (optionId) {
        case 'choghadiya-timings':
          return formatChoghadiyaResults(parsedData, theme)
        case 'hora-timings':
          return formatHoraResults(parsedData, theme)
        case 'tithi-timings':
          return formatTithiResults(parsedData, theme)
        case 'nakshatra-timings':
          return formatNakshatraResults(parsedData, theme)
        case 'rahu-kalam':
        case 'yama-gandam':
        case 'gulika-kalam':
          return formatTimePeriodResults(parsedData, theme)
        default:
          return formatGenericResults(parsedData, theme)
      }
    } catch (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500 font-medium">Error parsing results</p>
          <p className="text-sm text-gray-500 mt-1">Please try again</p>
        </div>
      )
    }
  }

  const formatChoghadiyaResults = (data, theme) => {
    const periods = Object.entries(data).map(([key, value]) => ({
      id: key,
      ...value
    }))
    
    return (
      <div className="grid grid-cols-1 gap-3">
        {periods.map((period) => (
          <div 
            key={period.id} 
            className={`p-4 rounded-xl border ${theme.border} bg-gradient-to-r ${theme.gradient} hover:shadow-md transition-all duration-200`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${theme.iconBg} ${theme.iconColor} flex items-center justify-center`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-900">{period.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {new Date(period.starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(period.ends_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const formatHoraResults = (data, theme) => {
    const horas = Object.entries(data).map(([key, value]) => ({
      id: key,
      ...value
    }))
    
    return (
      <div className="grid grid-cols-1 gap-3">
        {horas.map((hora) => (
          <div 
            key={hora.id} 
            className={`p-4 rounded-xl border ${theme.border} bg-gradient-to-r ${theme.gradient} hover:shadow-md transition-all duration-200`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${theme.iconBg} ${theme.iconColor} flex items-center justify-center`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-900">{hora.planet || hora.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {new Date(hora.starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(hora.ends_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const formatTithiResults = (data, theme) => {
    return formatGenericResults(data, theme)
  }

  const formatNakshatraResults = (data, theme) => {
    return formatGenericResults(data, theme)
  }

  const formatTimePeriodResults = (data, theme) => {
    return formatGenericResults(data, theme)
  }

  const formatGenericResults = (data, theme) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data).map(([key, value], index) => (
          <div 
            key={key} 
            className={`p-4 rounded-xl border ${theme.border} bg-gradient-to-br ${theme.gradient} hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${theme.iconBg} ${theme.iconColor} flex items-center justify-center flex-shrink-0`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-600 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </h4>
                <p className="text-lg font-semibold text-gray-900 break-words">
                  {String(value)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-100 to-indigo-50 flex items-center justify-center ring-1 ring-purple-100">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-heading)' }}>
                  Your Results
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">Vedic calculations complete</p>
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

      {/* Results Cards */}
      <div className="space-y-6">
        {selectedOptions.map((optionId) => {
          const result = results[optionId]
          const optionName = optionId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
          const theme = getCardTheme(optionId)
          
          return (
            <div 
              key={optionId}
              className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden"
            >
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${theme.gradient} border-b ${theme.border} p-6`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shadow-sm`}>
                    {getOptionIcon(optionId, "w-6 h-6")}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {optionName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Calculation Results
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6">
                {result ? (
                  formatResult(optionId, result, theme)
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No data available for this option</p>
                    <p className="text-sm text-gray-400 mt-1">Please try calculating again</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AstrologyResults
