'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Share, RefreshCw, MapPin, Calendar, Zap, Star } from 'lucide-react'
import astrologyAPI from '@/lib/api'

export default function ChoghadiyaTimingsPage() {
  const [choghadiyaData, setChoghadiyaData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timezone: new Date().getTimezoneOffset() / -60
          })
        },
        (error) => {
          console.log('Geolocation error:', error)
          // Fallback to Delhi, India
          setUserLocation({
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: 5.5
          })
        }
      )
    } else {
      // Fallback to Delhi, India
      setUserLocation({
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 5.5
      })
    }
  }, [])

  // Fetch choghadiya data when location is available
  useEffect(() => {
    if (userLocation) {
      fetchChoghadiyaData()
    }
  }, [userLocation])

  const fetchChoghadiyaData = async () => {
    if (!userLocation) return

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const payload = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        date: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        timezone: userLocation.timezone,
        config: {
          observation_point: 'geocentric',
          ayanamsha: 'lahiri'
        }
      }
      // Use centralized API helper
      const data = await astrologyAPI.getSingleCalculation('choghadiya-timings', payload)
      setChoghadiyaData(data)
    } catch (error) {
      console.error('Error fetching choghadiya data:', error)
      setError('Failed to fetch choghadiya data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatChoghadiyaData = (data) => {
    try {
      console.log('Raw API response:', data)
      
      // Parse the nested JSON
      let parsed = JSON.parse(data.output)
      console.log('Parsed choghadiya data:', parsed)
      
      return parsed
    } catch (error) {
      console.error('Error parsing choghadiya data:', error)
      console.log('Raw output that failed to parse:', data.output)
      return null
    }
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

  const getChoghadiyaColor = (name) => {
    switch (name.toLowerCase()) {
      case 'amrit':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'shubh':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'labh':
        return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'char':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'rog':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'kaal':
        return 'bg-gray-100 border-gray-300 text-gray-800'
      case 'udveg':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getChoghadiyaIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'amrit':
        return '🍯'
      case 'shubh':
        return '✨'
      case 'labh':
        return '💰'
      case 'char':
        return '🚀'
      case 'rog':
        return '⚠️'
      case 'kaal':
        return '💀'
      case 'udveg':
        return '⚡'
      default:
        return '⭐'
    }
  }

  const getChoghadiyaDescription = (name) => {
    switch (name.toLowerCase()) {
      case 'amrit':
        return 'Most auspicious time for all activities'
      case 'shubh':
        return 'Auspicious time for important work'
      case 'labh':
        return 'Good for financial and business activities'
      case 'char':
        return 'Good for travel and movement'
      case 'rog':
        return 'Avoid important activities, health issues possible'
      case 'kaal':
        return 'Inauspicious time, avoid all activities'
      case 'udveg':
        return 'Stressful time, avoid important decisions'
      default:
        return 'Choghadiya period'
    }
  }

  const isCurrentChoghadiya = (choghadiya) => {
    const now = new Date()
    const startTime = new Date(choghadiya.starts_at)
    const endTime = new Date(choghadiya.ends_at)
    return now >= startTime && now <= endTime
  }

  const handleRefresh = () => {
    fetchChoghadiyaData()
  }

  const handleDownload = () => {
    if (!choghadiyaData) return
    
    const dataStr = JSON.stringify(choghadiyaData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'choghadiya-timings-result.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Choghadiya Timings Result',
          text: 'Check out my current choghadiya timings',
          url: window.location.href
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const parsedChoghadiyaData = choghadiyaData ? formatChoghadiyaData(choghadiyaData) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Zap className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-purple-600">Choghadiya Timings</h1>
          </div>
          <p className="text-lg text-gray-600">Current auspicious and inauspicious time periods</p>
        </div>

        {/* Current Time and Location Info */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {currentTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {userLocation ? 
                      `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 
                      'Getting location...'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleDownload}
              disabled={!choghadiyaData}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              disabled={!choghadiyaData}
              className="flex items-center space-x-2"
            >
              <Share className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Calculating current choghadiya timings...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !choghadiyaData && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="text-center py-8">
              <p className="text-yellow-800 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rate Limit Warning */}
        {error && choghadiyaData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ {error} This is sample data for demonstration.
            </p>
          </div>
        )}

        {/* Choghadiya Results */}
        {parsedChoghadiyaData && !isLoading && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-purple-800">
                  <Star className="w-5 h-5" />
                  <span>Choghadiya Timings</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Auspicious and inauspicious time periods for today
                </p>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(parsedChoghadiyaData).map(([key, choghadiya]) => {
                const isCurrent = isCurrentChoghadiya(choghadiya)
                return (
                  <Card 
                    key={key} 
                    className={`${getChoghadiyaColor(choghadiya.name)} transition-all duration-200 hover:shadow-md m-1 md:m-2 ${
                      isCurrent ? 'ring-2 ring-purple-500 ring-opacity-70' : ''
                    }`}
                  >
                    <CardHeader className="py-2">
                      <CardTitle className="flex items-center space-x-2 text-base sm:text-lg font-bold leading-tight">
                        <span className="text-xl sm:text-2xl">{getChoghadiyaIcon(choghadiya.name)}</span>
                        <span className="font-extrabold text-base sm:text-lg">{choghadiya.name}</span>
                        {isCurrent && (
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </CardTitle>
                      <p className="text-[11px] sm:text-xs opacity-80 leading-snug font-semibold truncate" title={getChoghadiyaDescription(choghadiya.name)}>
                        {getChoghadiyaDescription(choghadiya.name)}
                      </p>
                      {isCurrent && (
                        <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">
                          🔴 LIVE
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 p-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] sm:text-sm font-semibold">
                          <span className="font-bold">Starts:</span>
                          <span className="font-mono text-[11px] sm:text-sm font-bold text-right">
                            {formatDateTime(choghadiya.starts_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-sm font-semibold">
                          <span className="font-bold">Ends:</span>
                          <span className="font-mono text-[11px] sm:text-sm font-bold text-right">
                            {formatDateTime(choghadiya.ends_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-1 border-t border-current/20">
                        <div className="text-[10px] sm:text-[11px] text-center font-bold">
                          Period #{key}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}