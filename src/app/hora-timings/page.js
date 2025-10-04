'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Download, Share, RefreshCw, MapPin, Calendar, Star, Sun, Moon, Zap } from 'lucide-react'
import astrologyAPI from '@/lib/api'

export default function HoraTimingsPage() {
  const [horaData, setHoraData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

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

  // Auto-fetch hora data when location/date is available
  useEffect(() => {
    if (userLocation && selectedDate) {
      fetchHoraData(selectedDate)
    }
  }, [userLocation, selectedDate])

  const fetchHoraData = async (dateISO) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Real-time hora payload: today's date + current local time + local timezone
      const now = new Date()
      const tzNow = -now.getTimezoneOffset() / 60
      const payload = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        date: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        timezone: tzNow,
        config: {
          observation_point: 'geocentric',
          ayanamsha: 'lahiri'
        }
      }
      console.log('[Hora] Payload', payload)
      // Use centralized API helper for real-time data
      const data = await astrologyAPI.getSingleCalculation('hora-timings', payload)
      setHoraData(data)
    } catch (error) {
      setError('Failed to fetch hora timings. Please try again.')
      console.error('API error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchHoraData(selectedDate)
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

  // Format 12-hour time like 06:09 AM
  const formatTime12 = (dateTimeString) => {
    try {
      const d = new Date(dateTimeString)
      return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch (e) {
      return dateTimeString
    }
  }

  const planetMood = (lord) => {
    // Readability-first palette: soft background + dark text + clear border
    switch ((lord || '').toLowerCase()) {
      case 'mars': return { label: 'Aggressive', classes: 'bg-red-100 text-red-900 border border-red-300', border: 'border-red-400' }
      case 'sun': return { label: 'Vigorous', classes: 'bg-amber-100 text-amber-900 border border-amber-300', border: 'border-amber-400' }
      case 'venus': return { label: 'Beneficial', classes: 'bg-rose-100 text-rose-900 border border-rose-300', border: 'border-rose-400' }
      case 'mercury': return { label: 'Quick', classes: 'bg-emerald-100 text-emerald-900 border border-emerald-300', border: 'border-emerald-400' }
      case 'moon': return { label: 'Gentle', classes: 'bg-sky-100 text-sky-900 border border-sky-300', border: 'border-sky-400' }
      case 'saturn': return { label: 'Sluggish', classes: 'bg-slate-200 text-slate-900 border border-slate-400', border: 'border-slate-500' }
      case 'jupiter': return { label: 'Fruitful', classes: 'bg-yellow-100 text-yellow-900 border border-yellow-300', border: 'border-yellow-400' }
      default: return { label: 'Hora', classes: 'bg-gray-200 text-gray-900 border border-gray-300', border: 'border-gray-400' }
    }
  }

  // Build arrays for Day (1-12) and Night (13-24)
  const horaDataParsed = horaData ? formatHoraData(horaData) : null
  const entries = horaDataParsed ? Object.entries(horaDataParsed) : []
  const sortEntries = (arr) => arr.sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
  const dayHoras = sortEntries(entries.filter(([k]) => parseInt(k, 10) >= 1 && parseInt(k, 10) <= 12))
  const nightHoras = sortEntries(entries.filter(([k]) => parseInt(k, 10) >= 13 && parseInt(k, 10) <= 24))

  const dayStart = dayHoras.length ? formatTime12(dayHoras[0][1].starts_at) : '--'
  const nightStart = nightHoras.length ? formatTime12(nightHoras[0][1].starts_at) : '--'

  // Helpers for next-day suffix
  const sameDay = (a, b) => {
    const da = new Date(a), db = new Date(b)
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
  }
  const endSuffixIfNextDay = (start, end) => {
    if (!sameDay(start, end)) {
      const d = new Date(end)
      return `, ${d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}`
    }
    return ''
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4" />
            <span>{userLocation ? `${userLocation.latitude.toFixed(2)}, ${userLocation.longitude.toFixed(2)}` : 'Locating...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(Date.parse(selectedDate) - 86400000).toISOString().slice(0,10))}>{'<' } Prev Day</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().slice(0,10))}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(Date.parse(selectedDate) + 86400000).toISOString().slice(0,10))}>Next Day {'>'}</Button>
            </div>
          </div>
        </div>

        {/* Title strip */}
        <div className="bg-gray-800 text-white rounded px-3 py-2 inline-block mb-4 text-sm font-semibold shadow">
          {new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit', weekday: 'long' })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={handleRefresh} disabled={isLoading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button variant="outline" onClick={handleShare} className="flex items-center gap-2">
              <Share className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Hora Results */}
        {horaDataParsed ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Day Hora */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-2 border-b bg-yellow-50/50">
                <CardTitle className="flex items-center justify-between text-yellow-800 text-lg font-bold">
                  <span className="flex items-center gap-2">🌞 Day Hora</span>
                  <span className="flex items-center gap-1 text-sm text-yellow-700"><Clock className="w-4 h-4" /> {dayStart}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div>
                  {dayHoras.map(([key, hora], idx) => {
                    const mood = planetMood(hora.lord)
                    return (
                      <div key={key} className={`flex items-center flex-wrap gap-2 justify-between min-h-[54px] p-4 ${isCurrentHora(hora) ? 'bg-yellow-200/50 border-l-4 border-yellow-500' : 'bg-white border-b border-gray-200 hover:bg-gray-50'} transition-colors`}>
    <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-md text-sm leading-6 font-bold drop-shadow-sm ${mood.classes}`}>
            {getPlanetIcon(hora.lord)} {hora.lord} - {mood.label}
        </div>
    </div>
                        <div className="text-base text-gray-700 text-right font-mono font-semibold">
                          {formatTime12(hora.starts_at)} <span className="text-gray-700">to</span> {formatTime12(hora.ends_at)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Night Hora */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-2 border-b bg-indigo-50/50">
                <CardTitle className="flex items-center justify-between text-indigo-800 text-lg font-bold">
                  <span className="flex items-center gap-2">🌙 Night Hora</span>
                  <span className="flex items-center gap-1 text-sm text-indigo-700"><Clock className="w-4 h-4" /> {nightStart}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div>
                  {nightHoras.map(([key, hora], idx) => {
                    const mood = planetMood(hora.lord)
                    return (
                      <div key={key} className={`flex items-center flex-wrap gap-2 justify-between min-h-[54px] p-4 ${isCurrentHora(hora) ? 'bg-indigo-200/50 border-l-4 border-indigo-500' : 'bg-white border-b border-gray-200 hover:bg-gray-50'} transition-colors`}>
    <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-md text-sm leading-6 font-bold drop-shadow-sm ${mood.classes}`}>
            {getPlanetIcon(hora.lord)} {hora.lord} - {mood.label}
        </div>
    </div>
                        <div className="text-base text-gray-700 text-right font-mono font-semibold">
                          {formatTime12(hora.starts_at)} <span className="text-black">to</span> {formatTime12(hora.ends_at)}
                          <span className="text-black">{endSuffixIfNextDay(hora.starts_at, hora.ends_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div> 
              </CardContent>
            </Card>
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
