'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Share, RefreshCw, MapPin, Calendar, Star } from 'lucide-react'

export default function MahaDasasPage() {
  const [mahaDasasData, setMahaDasasData] = useState(null)
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
            timezone: Math.round(position.coords.longitude / 15) // Approximate timezone
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

  // Fetch maha dasas data when location is available
  useEffect(() => {
    if (userLocation) {
      fetchMahaDasasData()
    }
  }, [userLocation])

  const fetchMahaDasasData = async () => {
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
          ayanamsha: 'sayana'
        }
      }

      console.log('Fetching maha dasas data with payload:', payload)

      const response = await fetch('https://json.freeastrologyapi.com/vimsottari/maha-dasas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'hARFI2eGxQ3y0s1i3ru6H1EnqNbJ868LqRQsNa0c'
        },
        body: JSON.stringify(payload)
      })

      if (response.status === 429) {
        // Rate limit exceeded, use mock data
        console.log('Rate limit exceeded, using mock data')
        const mockData = {
          statusCode: 200,
          output: JSON.stringify({
            "1": {"Lord": "Sun", "start_time": "2018-09-11 22:05:25.323923", "end_time": "2024-09-11 11:00:24.421523"},
            "2": {"Lord": "Moon", "start_time": "2024-09-11 11:00:24.421523", "end_time": "2034-09-12 00:32:02.917523"},
            "3": {"Lord": "Mars", "start_time": "2034-09-12 00:32:02.917523", "end_time": "2041-09-11 19:36:11.864723"},
            "4": {"Lord": "Rahu", "start_time": "2041-09-11 19:36:11.864723", "end_time": "2059-09-12 10:21:09.157523"},
            "5": {"Lord": "Jupiter", "start_time": "2059-09-12 10:21:09.157523", "end_time": "2075-09-12 12:47:46.751123"},
            "6": {"Lord": "Saturn", "start_time": "2075-09-12 12:47:46.751123", "end_time": "2094-09-12 09:41:53.893523"},
            "7": {"Lord": "Mercury", "start_time": "2094-09-12 09:41:53.893523", "end_time": "2111-09-13 18:17:41.336723"},
            "8": {"Lord": "Ketu", "start_time": "2111-09-13 18:17:41.336723", "end_time": "2118-09-13 13:21:50.283923"},
            "9": {"Lord": "Venus", "start_time": "2118-09-13 13:21:50.283923", "end_time": "2138-09-13 16:25:07.275923"}
          })
        }
        setMahaDasasData(mockData)
        setError('API rate limit exceeded. Showing sample data.')
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Maha Dasas API response:', data)
      
      setMahaDasasData(data)
    } catch (error) {
      console.error('Error fetching maha dasas data:', error)
      setError('Failed to fetch maha dasas data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatMahaDasasData = (data) => {
    try {
      console.log('Raw API response:', data)
      
      // Parse the nested JSON
      let parsed = JSON.parse(data.output)
      console.log('Parsed maha dasas data:', parsed)
      
      return parsed
    } catch (error) {
      console.error('Error parsing maha dasas data:', error)
      console.log('Raw output that failed to parse:', data.output)
      return null
    }
  }

  const formatDateTime = (dateTimeString) => {
    try {
      const date = new Date(dateTimeString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
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

  const getPlanetIcon = (lord) => {
    switch (lord.toLowerCase()) {
      case 'sun':
        return '☀️'
      case 'moon':
        return '🌙'
      case 'mars':
        return '♂️'
      case 'rahu':
        return '🐉'
      case 'jupiter':
        return '♃'
      case 'saturn':
        return '♄'
      case 'mercury':
        return '☿️'
      case 'ketu':
        return '🐲'
      case 'venus':
        return '♀️'
      default:
        return '⭐'
    }
  }

  const getPlanetColor = (lord) => {
    switch (lord.toLowerCase()) {
      case 'sun':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'moon':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'mars':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'rahu':
        return 'bg-gray-100 border-gray-300 text-gray-800'
      case 'jupiter':
        return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'saturn':
        return 'bg-indigo-100 border-indigo-300 text-indigo-800'
      case 'mercury':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'ketu':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'venus':
        return 'bg-pink-100 border-pink-300 text-pink-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getPlanetDescription = (lord) => {
    switch (lord.toLowerCase()) {
      case 'sun':
        return 'Leadership, authority, vitality, and self-confidence'
      case 'moon':
        return 'Emotions, mind, intuition, and nurturing qualities'
      case 'mars':
        return 'Energy, courage, aggression, and physical strength'
      case 'rahu':
        return 'Material desires, illusions, and worldly attachments'
      case 'jupiter':
        return 'Wisdom, knowledge, spirituality, and expansion'
      case 'saturn':
        return 'Discipline, hard work, karma, and life lessons'
      case 'mercury':
        return 'Communication, intelligence, and analytical abilities'
      case 'ketu':
        return 'Spirituality, detachment, and past life karma'
      case 'venus':
        return 'Love, beauty, luxury, and artistic abilities'
      default:
        return 'Planetary influence period'
    }
  }

  const isCurrentDasa = (dasa) => {
    const now = new Date()
    const startTime = new Date(dasa.start_time)
    const endTime = new Date(dasa.end_time)
    return now >= startTime && now <= endTime
  }

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffInMs = end - start
    const diffInYears = diffInMs / (1000 * 60 * 60 * 24 * 365.25)
    return Math.round(diffInYears * 10) / 10 // Round to 1 decimal place
  }

  const handleRefresh = () => {
    fetchMahaDasasData()
  }

  const handleDownload = () => {
    if (!mahaDasasData) return
    
    const dataStr = JSON.stringify(mahaDasasData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'maha-dasas-result.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Maha Dasas Result',
          text: 'Check out my maha dasas calculation result',
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

  const parsedMahaDasasData = mahaDasasData ? formatMahaDasasData(mahaDasasData) : null

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Star className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-indigo-600">Maha Dasas</h1>
          </div>
          <p className="text-lg text-gray-600">Vimsottari Dasa periods and planetary influences</p>
        </div>

        {/* Current Time and Location Info */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
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
                  <Calendar className="w-4 h-4 text-indigo-600" />
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
                  <MapPin className="w-4 h-4 text-indigo-600" />
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
              disabled={!mahaDasasData}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              disabled={!mahaDasasData}
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
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Calculating maha dasas periods...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !mahaDasasData && (
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
        {error && mahaDasasData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ {error} This is sample data for demonstration.
            </p>
          </div>
        )}

        {/* Maha Dasas Results */}
        {parsedMahaDasasData && !isLoading && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-indigo-800">
                  <Star className="w-5 h-5" />
                  <span>Vimsottari Maha Dasas</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Planetary periods and their influences on life
                </p>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(parsedMahaDasasData).map(([key, dasa]) => {
                const isCurrent = isCurrentDasa(dasa)
                const duration = calculateDuration(dasa.start_time, dasa.end_time)
                return (
                  <Card 
                    key={key} 
                    className={`${getPlanetColor(dasa.Lord)} transition-all duration-200 hover:shadow-md ${
                      isCurrent ? 'ring-2 ring-indigo-500 ring-opacity-70' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <span className="text-2xl">
                          {getPlanetIcon(dasa.Lord)}
                        </span>
                        <span>{dasa.Lord} Dasa</span>
                        {isCurrent && (
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </CardTitle>
                      <p className="text-sm opacity-75">
                        {getPlanetDescription(dasa.Lord)}
                      </p>
                      {isCurrent && (
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                          🔴 CURRENT
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Duration:</span>
                          <span className="font-semibold">
                            {duration} years
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Starts:</span>
                          <span className="font-mono text-xs">
                            {formatDateTime(dasa.start_time)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Ends:</span>
                          <span className="font-mono text-xs">
                            {formatDateTime(dasa.end_time)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-current border-opacity-20">
                        <div className="text-xs text-center font-medium">
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
