'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Download, Share, RefreshCw, MapPin, Calendar, Star, Sun, Moon, Zap } from 'lucide-react'

export default function HoraTimingsPage() {
  const [horaData, setHoraData] = useState(null)
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

  // Get user's current location
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
          // Fallback to default location (Delhi, India)
          setUserLocation({
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: 5.5
          })
        }
      )
    } else {
      // Fallback to default location
      setUserLocation({
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 5.5
      })
    }
  }, [])

  // Auto-fetch hora data when location is available
  useEffect(() => {
    if (userLocation) {
      fetchHoraData()
    }
  }, [userLocation])

  const fetchHoraData = async () => {
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

      console.log('Fetching hora data with payload:', payload)
      
      const response = await fetch('https://json.freeastrologyapi.com/hora-timings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'hARFI2eGxQ3y0s1i3ru6H1EnqNbJ868LqRQsNa0c'
        },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        
        // Handle rate limiting with fallback to mock data
        if (response.status === 429) {
          console.log('Rate limit exceeded, using mock data for demonstration')
          const mockData = {
            statusCode: 200,
            output: JSON.stringify({
              "1": {"lord": "Venus", "starts_at": "2024-01-01 06:53:01", "ends_at": "2024-01-01 07:53:02"},
              "2": {"lord": "Mercury", "starts_at": "2024-01-01 07:53:02", "ends_at": "2024-01-01 08:53:03"},
              "3": {"lord": "Moon", "starts_at": "2024-01-01 08:53:03", "ends_at": "2024-01-01 09:53:04"},
              "4": {"lord": "Saturn", "starts_at": "2024-01-01 09:53:04", "ends_at": "2024-01-01 10:53:05"},
              "5": {"lord": "Jupiter", "starts_at": "2024-01-01 10:53:05", "ends_at": "2024-01-01 11:53:06"},
              "6": {"lord": "Mars", "starts_at": "2024-01-01 11:53:06", "ends_at": "2024-01-01 12:53:07"},
              "7": {"lord": "Sun", "starts_at": "2024-01-01 12:53:07", "ends_at": "2024-01-01 13:53:08"},
              "8": {"lord": "Venus", "starts_at": "2024-01-01 13:53:08", "ends_at": "2024-01-01 14:53:09"},
              "9": {"lord": "Mercury", "starts_at": "2024-01-01 14:53:09", "ends_at": "2024-01-01 15:53:10"},
              "10": {"lord": "Moon", "starts_at": "2024-01-01 15:53:10", "ends_at": "2024-01-01 16:53:11"},
              "11": {"lord": "Saturn", "starts_at": "2024-01-01 16:53:11", "ends_at": "2024-01-01 17:53:12"},
              "12": {"lord": "Jupiter", "starts_at": "2024-01-01 17:53:12", "ends_at": "2024-01-01 18:53:13"},
              "13": {"lord": "Mars", "starts_at": "2024-01-01 18:53:13", "ends_at": "2024-01-01 19:53:14"},
              "14": {"lord": "Sun", "starts_at": "2024-01-01 19:53:14", "ends_at": "2024-01-01 20:53:15"},
              "15": {"lord": "Venus", "starts_at": "2024-01-01 20:53:15", "ends_at": "2024-01-01 21:53:16"},
              "16": {"lord": "Mercury", "starts_at": "2024-01-01 21:53:16", "ends_at": "2024-01-01 22:53:17"},
              "17": {"lord": "Moon", "starts_at": "2024-01-01 22:53:17", "ends_at": "2024-01-01 23:53:18"},
              "18": {"lord": "Saturn", "starts_at": "2024-01-01 23:53:18", "ends_at": "2024-01-02 00:53:19"},
              "19": {"lord": "Jupiter", "starts_at": "2024-01-02 00:53:19", "ends_at": "2024-01-02 01:53:20"},
              "20": {"lord": "Mars", "starts_at": "2024-01-02 01:53:20", "ends_at": "2024-01-02 02:53:21"},
              "21": {"lord": "Sun", "starts_at": "2024-01-02 02:53:21", "ends_at": "2024-01-02 03:53:22"},
              "22": {"lord": "Venus", "starts_at": "2024-01-02 03:53:22", "ends_at": "2024-01-02 04:53:23"},
              "23": {"lord": "Mercury", "starts_at": "2024-01-02 04:53:23", "ends_at": "2024-01-02 05:53:24"},
              "24": {"lord": "Moon", "starts_at": "2024-01-02 05:53:24", "ends_at": "2024-01-02 06:53:25"}
            })
          }
          setHoraData(mockData)
          setError('API rate limit exceeded. Showing sample data for demonstration.')
          return
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('API Response data:', data)
      setHoraData(data)
    } catch (error) {
      setError('Failed to fetch hora timings. Please try again.')
      console.error('API error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchHoraData()
  }

  const handleDownload = () => {
    if (!horaData) return
    
    const dataStr = JSON.stringify(horaData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'hora-timings-result.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hora Timings Result',
          text: 'Check out my hora timings calculation result',
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

  const formatHoraData = (data) => {
    try {
      console.log('Raw API response:', data)
      
      // Parse the nested JSON
      let parsed = JSON.parse(data.output)
      console.log('Parsed hora data:', parsed)
      
      return parsed
    } catch (error) {
      console.error('Error parsing hora data:', error)
      console.log('Raw output that failed to parse:', data.output)
      return null
    }
  }

  const formatDateTime = (dateTimeString) => {
    try {
      const date = new Date(dateTimeString)
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (error) {
      return dateTimeString
    }
  }

  const getPlanetIcon = (lord) => {
    switch (lord.toLowerCase()) {
      case 'sun':
        return <Sun className="w-5 h-5" />
      case 'moon':
        return <Moon className="w-5 h-5" />
      case 'mars':
        return '♂️'
      case 'mercury':
        return '☿️'
      case 'jupiter':
        return '♃'
      case 'venus':
        return '♀️'
      case 'saturn':
        return '♄'
      default:
        return <Star className="w-5 h-5" />
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
      case 'mercury':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'jupiter':
        return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'venus':
        return 'bg-pink-100 border-pink-300 text-pink-800'
      case 'saturn':
        return 'bg-gray-100 border-gray-300 text-gray-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getPlanetDescription = (lord) => {
    switch (lord.toLowerCase()) {
      case 'sun':
        return 'Leadership, authority, and vitality'
      case 'moon':
        return 'Emotions, intuition, and nurturing'
      case 'mars':
        return 'Energy, courage, and action'
      case 'mercury':
        return 'Communication, intelligence, and commerce'
      case 'jupiter':
        return 'Wisdom, expansion, and good fortune'
      case 'venus':
        return 'Love, beauty, and harmony'
      case 'saturn':
        return 'Discipline, structure, and karma'
      default:
        return 'Planetary influence period'
    }
  }

  const isCurrentHora = (hora) => {
    const now = new Date()
    const startTime = new Date(hora.starts_at)
    const endTime = new Date(hora.ends_at)
    return now >= startTime && now < endTime
  }

  const horaDataParsed = horaData ? formatHoraData(horaData) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Clock className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-indigo-600">Hora Timings</h1>
          </div>
          <p className="text-lg text-gray-600">Planetary hour periods for today</p>
          <div className="flex items-center justify-center space-x-4 mt-2 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{currentTime.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
            {userLocation && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleDownload}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="flex items-center space-x-2"
            >
              <Share className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Hora Results */}
        {horaDataParsed ? (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-indigo-800">
                  <Zap className="w-5 h-5" />
                  <span>24-Hour Planetary Hours</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Each hour is ruled by a different planet, influencing the energy of that time period
                </p>
              </CardHeader>
            </Card>

             <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 xl:grid-cols-16 gap-1.5">
               {Object.entries(horaDataParsed).map(([key, hora]) => (
                 <Card 
                   key={key} 
                   className={`${getPlanetColor(hora.lord)} transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer ${
                     isCurrentHora(hora) ? 'ring-2 ring-green-500 ring-opacity-70 shadow-lg scale-105' : ''
                   }`}
                   style={{ aspectRatio: '1 / 0.8' }}
                 >
                   <CardContent className="p-1.5 h-full flex flex-col justify-between">
                     {/* Header with planet icon and current indicator */}
                     <div className="flex flex-col items-center space-y-0.5">
                       <div className="relative">
                         <div className="text-sm">
                           {getPlanetIcon(hora.lord)}
                         </div>
                         {isCurrentHora(hora) && (
                           <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                         )}
                       </div>
                       
                       <div className="text-center">
                         <div className="font-bold text-xs leading-none">
                           {hora.lord}
                         </div>
                         <div className="text-xs opacity-75 font-bold">
                           #{key}
                         </div>
                       </div>
                     </div>

                     {/* Time info */}
                     <div className="space-y-0.5 text-center">
                       <div className="text-xs font-mono font-bold leading-none">
                         {formatDateTime(hora.starts_at)}
                       </div>
                       <div className="text-xs font-mono font-bold leading-none">
                         {formatDateTime(hora.ends_at)}
                       </div>
                     </div>

                     {/* Current indicator */}
                     {isCurrentHora(hora) && (
                       <div className="text-center">
                         <div className="inline-flex items-center px-1 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                           LIVE
                         </div>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              {isLoading ? (
                <div className="space-y-4">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-gray-600">Loading hora timings...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-500">Unable to load hora data.</p>
                  <Button onClick={handleRefresh} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  API Rate Limit Exceeded
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{error}</p>
                  <p className="mt-1">
                    The Free Astrology API has a rate limit. You can try again later or use the sample data for demonstration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
