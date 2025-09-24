'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import PanchangCard from '@/components/PanchangCard'
import TimingsSection from '@/components/TimingsSection'
import FestivalCard from '@/components/FestivalCard'
import HoraTimeline from '@/components/HoraTimeline'
import AstrologyOptionCard from '@/components/AstrologyOptionCard'
import AstrologyForm from '@/components/AstrologyForm'
import AstrologyResult from '@/components/AstrologyResult'
import DateSelector from '@/components/DateSelector'
import { mockPanchangData } from '@/lib/mockData'
import { astrologyAPI } from '@/lib/api'

export default function Home() {
  const [panchangData, setPanchangData] = useState(mockPanchangData)
  const [currentDate, setCurrentDate] = useState('')
  
  // Date and location state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [userLocation, setUserLocation] = useState(null)
  const [pendingLocation, setPendingLocation] = useState(null)
  const [isLoadingPanchang, setIsLoadingPanchang] = useState(false)
  const [panchangError, setPanchangError] = useState(null)
  
  // Astrology options state
  const [selectedOption, setSelectedOption] = useState(null)
  const [astrologyResult, setAstrologyResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const astrologyOptions = [
   
    { id: 'vedic-weekday', name: 'Vedic Weekday', description: 'Traditional weekday calculation' },
    { id: 'lunar-month-info', name: 'Lunar Month Info', description: 'Lunar month details' },
    { id: 'ritu-information', name: 'Ritu Information', description: 'Seasonal information' },
    { id: 'samvat-information', name: 'Samvat Information', description: 'Era and calendar info' },
    { id: 'aayanam', name: 'Aayanam', description: 'Precession of equinoxes' },
    { id: 'choghadiya-timings', name: 'Choghadiya Timings', description: 'Auspicious time periods' },
  
    
   
  ]

  useEffect(() => {
    const today = new Date()
    const formattedDate = today.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    setCurrentDate(formattedDate)
  }, [])

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ latitude, longitude })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Fallback to Delhi, India
          setUserLocation({ latitude: 28.6139, longitude: 77.2090 })
        }
      )
    } else {
      // Fallback to Delhi, India
      setUserLocation({ latitude: 28.6139, longitude: 77.2090 })
    }
  }, [])

  // Fetch real Panchang data when date or location changes
  useEffect(() => {
    if (userLocation && selectedDate) {
      fetchRealPanchangData()
    }
  }, [selectedDate, userLocation])

  // Helper function to format time strings
  const formatTime = (timeString) => {
    try {
      if (!timeString) return 'N/A'
      
      // Handle different time formats
      let date
      if (timeString.includes('T')) {
        // ISO format
        date = new Date(timeString)
      } else if (timeString.includes(' ')) {
        // "YYYY-MM-DD HH:MM:SS" format
        date = new Date(timeString)
      } else {
        // Just time format "HH:MM:SS"
        const today = new Date(selectedDate)
        const [hours, minutes, seconds] = timeString.split(':')
        date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                       parseInt(hours), parseInt(minutes), parseInt(seconds))
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Error formatting time:', error)
      return timeString // Return original if formatting fails
    }
  }

  // Helper function to format HH:MM time strings from IPGeolocation API
  const formatTimeFromHHMM = (timeString) => {
    try {
      if (!timeString || timeString === '-:-') return 'N/A'
      
      // Handle HH:MM format from IPGeolocation API
      const [hours, minutes] = timeString.split(':')
      const today = new Date(selectedDate)
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                           parseInt(hours), parseInt(minutes), 0)
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Error formatting HH:MM time:', error)
      return timeString // Return original if formatting fails
    }
  }

  // Helper to format various date/time strings (including "YYYY-MM-DD HH:MM:SS[.ffffff]") into 24h HH:MM
  const formatTime24Exact = (dateTimeString) => {
    try {
      if (!dateTimeString) return 'N/A'
      const raw = String(dateTimeString).trim()

      // If it's just HH:MM or HH:MM:SS, return HH:MM
      const hhmmssMatch = raw.match(/^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/)
      if (hhmmssMatch) {
        const hh = String(parseInt(hhmmssMatch[1], 10)).padStart(2, '0')
        const mm = hhmmssMatch[2]
        return `${hh}:${mm}`
      }

      // Try to normalize "YYYY-MM-DD HH:MM:SS(.ffffff)" to ISO by replacing space with 'T' and removing microseconds
      let normalized = raw.replace(' ', 'T').replace(/\.(\d{1,6})$/, '')
      let d = new Date(normalized)

      // Fallback: if still invalid, try without the 'T'
      if (isNaN(d.getTime())) {
        const parts = raw.split(/[ T]/)
        if (parts.length >= 2) {
          const timePart = parts[1]
          const tm = timePart.split(':')
          if (tm.length >= 2) {
            const hh = String(parseInt(tm[0], 10)).padStart(2, '0')
            const mm = String(parseInt(tm[1], 10)).padStart(2, '0')
            return `${hh}:${mm}`
          }
        }
        return raw
      }

      // Format to 24-hour HH:MM using en-GB locale
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch (error) {
      console.error('Error in formatTime24Exact:', error)
      return String(dateTimeString)
    }
  }

  const fetchRealPanchangData = async () => {
    if (!userLocation || !selectedDate) return

    setIsLoadingPanchang(true)
    setPanchangError(null)

    try {
      const date = new Date(selectedDate)
      const payload = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        date: date.getDate(),
        hours: 12,
        minutes: 0,
        seconds: 0,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        timezone: 5.5, // Default to IST, can be calculated based on location
        config: {
          observation_point: "geocentric",
          ayanamsha: "lahiri"
        }
      }

      // Fetch Panchang data, Sun/Moon data, and Auspicious/Inauspicious data in parallel
      const [panchangResults, sunMoonData, auspiciousData] = await Promise.all([
        astrologyAPI.getPanchangData(payload),
        astrologyAPI.getSunMoonData(userLocation.latitude, userLocation.longitude, date),
        astrologyAPI.getAuspiciousData({ ...payload, hours: 12, minutes: 0, seconds: 0 })
      ])
      
      // Update panchang data with real API results
      const updatedPanchangData = { ...mockPanchangData }
      
      // Process Tithi data
      if (panchangResults.results['tithi-durations']) {
        try {
          const tithiData = JSON.parse(JSON.parse(panchangResults.results['tithi-durations'].output))
          updatedPanchangData.tithi = `${tithiData.name} (${tithiData.paksha})`
        } catch (e) {
          console.error('Error parsing tithi data:', e)
        }
      }

      // Process Nakshatra data
      if (panchangResults.results['nakshatra-durations']) {
        try {
          const nakshatraData = JSON.parse(panchangResults.results['nakshatra-durations'].output)
          updatedPanchangData.nakshatra = nakshatraData.name
        } catch (e) {
          console.error('Error parsing nakshatra data:', e)
        }
      }

      // Process Yoga data
      if (panchangResults.results['yoga-durations']) {
        try {
          const yogaData = JSON.parse(JSON.parse(panchangResults.results['yoga-durations'].output))
          const currentYoga = Object.values(yogaData).find(yoga => yoga.yoga_left_percentage > 0)
          if (currentYoga) {
            updatedPanchangData.yoga = currentYoga.name
          }
        } catch (e) {
          console.error('Error parsing yoga data:', e)
        }
      }

      // Process Karana data
      if (panchangResults.results['karana-timings']) {
        try {
          const karanaData = JSON.parse(JSON.parse(panchangResults.results['karana-timings'].output))
          const currentKarana = Object.values(karanaData).find(karana => karana.karana_left_percentage > 0)
          if (currentKarana) {
            updatedPanchangData.karana = currentKarana.name
          }
        } catch (e) {
          console.error('Error parsing karana data:', e)
        }
      }

      // Process Sun/Moon data from IPGeolocation API
      if (sunMoonData && sunMoonData.astronomy) {
        try {
          const astronomy = sunMoonData.astronomy
          
          // Process Sunrise/Sunset
          if (astronomy.sunrise && astronomy.sunrise !== '-:-') {
            updatedPanchangData.sunrise = formatTimeFromHHMM(astronomy.sunrise)
          }
          if (astronomy.sunset && astronomy.sunset !== '-:-') {
            updatedPanchangData.sunset = formatTimeFromHHMM(astronomy.sunset)
          }

          // Process Moonrise/Moonset
          if (astronomy.moonrise && astronomy.moonrise !== '-:-') {
            updatedPanchangData.moonrise = formatTimeFromHHMM(astronomy.moonrise)
          }
          if (astronomy.moonset && astronomy.moonset !== '-:-') {
            updatedPanchangData.moonset = formatTimeFromHHMM(astronomy.moonset)
          }
        } catch (e) {
          console.error('Error parsing sun/moon data:', e)
        }
      }

      // Debug logs: show raw API results for diagnostics
      try {
        console.groupCollapsed('[Panchang] Raw API results')
        console.log('panchangResults:', panchangResults)
        console.log('auspiciousData:', auspiciousData)
        console.groupEnd()
      } catch (_) {}

      // Log Auspicious/Inauspicious fetch outcome per endpoint
      if (auspiciousData) {
        const endpointsToCheck = [
          'rahu-kalam',
          'yama-gandam',
          'gulika-kalam',
          'abhijit-muhurat',
          'amrit-kaal',
          'brahma-muhurat',
          'dur-muhurat',
          'varjyam',
          'good-bad-times',
        ]
        endpointsToCheck.forEach((ep) => {
          const res = auspiciousData.results?.[ep]
          const err = auspiciousData.errors?.[ep]
          if (res) {
            console.log(`[Auspicious] ${ep} fetched:`, res)
          } else if (err) {
            console.error(`[Auspicious] ${ep} failed:`, err)
          } else {
            console.warn(`[Auspicious] ${ep} no data returned`)
          }
        })
      }

      // Populate Auspicious/Inauspicious times into UI state
      if (auspiciousData && auspiciousData.results) {
        const map = {
          'rahu-kalam': 'rahukalam',
          'yama-gandam': 'yamaganda',
          'gulika-kalam': 'gulika',
          'abhijit-muhurat': 'abhijitMuhurat',
          'amrit-kaal': 'amritKaal',
          'brahma-muhurat': 'brahmaMuhurat',
          'dur-muhurat': 'durMuhurat',
          'varjyam': 'varjyam',
        }

        const safeParse = (v) => {
          try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return v }
        }

        const toRange = (start, end) => {
          if (!start && !end) return null
          const s = start ? formatTime24Exact(String(start)) : null
          const e = end ? formatTime24Exact(String(end)) : null
          if (s && e) return `${s} - ${e}`
          return s || e
        }

        for (const [endpoint, target] of Object.entries(map)) {
          const res = auspiciousData.results[endpoint]
          if (!res) continue
          let out = res.output
          out = safeParse(out)
          out = safeParse(out)
          if (out && typeof out === 'object') {
            const start = out.starts_at || out.start_time || out.start || out.from
            const end = out.ends_at || out.end_time || out.end || out.to
            const range = toRange(start, end)
            if (range) {
              updatedPanchangData[target] = range
            }
          } else if (typeof out === 'string') {
            // Sometimes API returns a ready-made string
            updatedPanchangData[target] = out
          }
        }

        // Good & Bad Times (may include arrays)
        if (auspiciousData.results['good-bad-times']) {
          let out = auspiciousData.results['good-bad-times'].output
          out = safeParse(out); out = safeParse(out)
          if (out && typeof out === 'object') {
            const toJoined = (arr) => {
              if (!Array.isArray(arr)) return null
              const parts = arr.map(item => {
                const st = item.starts_at || item.start_time || item.start || item.from
                const en = item.ends_at || item.end_time || item.end || item.to
                return toRange(st, en)
              }).filter(Boolean)
              return parts.length ? parts.join(', ') : null
            }
            const good = toJoined(out.good_times || out.good)
            const bad = toJoined(out.bad_times || out.bad)
            const combined = [
              good ? `Good: ${good}` : null,
              bad ? `Bad: ${bad}` : null,
            ].filter(Boolean).join('; ')
            if (combined) updatedPanchangData.goodBadTimes = combined
          } else if (typeof out === 'string') {
            updatedPanchangData.goodBadTimes = out
          }
        }
      }

      setPanchangData(updatedPanchangData)

      // Log any errors
      const allErrors = { ...panchangResults.errors, ...(auspiciousData?.errors || {}) }
      if (Object.keys(allErrors).length > 0) {
        console.warn('Some Panchang data failed to load:', allErrors)
        setPanchangError('Some data may not be available due to API limitations')
      }

    } catch (error) {
      console.error('Error fetching Panchang data:', error)
      setPanchangError('Failed to load real-time Panchang data. Showing sample data.')
    } finally {
      setIsLoadingPanchang(false)
    }
  }

  const handleOptionClick = (optionId) => {
    if (optionId === 'tithi-timings') {
      // Redirect to dedicated tithi timings page
      window.location.href = '/tithi-timings'
      return
    }
    
    if (optionId === 'choghadiya-timings') {
      // Redirect to dedicated choghadiya timings page
      window.location.href = '/choghadiya-timings'
      return
    }
    
    const option = astrologyOptions.find(opt => opt.id === optionId)
    setSelectedOption(option)
    setAstrologyResult(null)
    setError(null)
  }

  const handleFormSubmit = async (payload) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await astrologyAPI.getSingleCalculation(selectedOption.id, payload)
      setAstrologyResult(result)
    } catch (error) {
      setError('Failed to fetch astrological data. Please try again.')
      console.error('API error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToOptions = () => {
    setSelectedOption(null)
    setAstrologyResult(null)
    setError(null)
  }

  const handleNewCalculation = () => {
    setAstrologyResult(null)
    setError(null)
  }

  const panchangItems = [
    { label: 'Tithi', value: panchangData.tithi },
    { label: 'Nakshatra', value: panchangData.nakshatra },
    { label: 'Yoga', value: panchangData.yoga },
    { label: 'Karana', value: panchangData.karana },
    { label: 'Sunrise', value: panchangData.sunrise },
    { label: 'Sunset', value: panchangData.sunset },
    { label: 'Moonrise', value: panchangData.moonrise },
    { label: 'Moonset', value: panchangData.moonset },
  ]

  const inauspiciousTimings = [
    { label: 'Rahukalam', time: panchangData.rahukalam },
    { label: 'Gulika', time: panchangData.gulika },
    { label: 'Yamaganda', time: panchangData.yamaganda },
    { label: 'Abhijit Muhurat', time: panchangData.abhijitMuhurat },
    { label: 'Brahma Muhurat', time: panchangData.brahmaMuhurat },
    { label: 'Amrit Kaal', time: panchangData.amritKaal },
    { label: 'Dur Muhurat', time: panchangData.durMuhurat },
    { label: 'Varjyam', time: panchangData.varjyam },
    { label: 'Good & Bad Times', time: panchangData.goodBadTimes },
  ]

  // Show form if option is selected
  if (selectedOption && !astrologyResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AstrologyForm 
            option={selectedOption}
            onSubmit={handleFormSubmit}
            onBack={handleBackToOptions}
            isLoading={isLoading}
          />
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Show result if calculation is complete
  if (selectedOption && astrologyResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AstrologyResult 
            option={selectedOption}
            data={astrologyResult}
            onBack={handleBackToOptions}
            onNewCalculation={handleNewCalculation}
          />
        </main>
      </div>
    )
  }

  // Show main home page with options
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-blue-600 mb-1">TheGodSays</h1>
          <p className="text-lg text-gray-600">{currentDate}</p>
        </div>

        {/* Date & Location Selector */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-md border border-gray-100">
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            userLocation={userLocation}
            onLocationChange={setUserLocation}
            pendingLocation={pendingLocation}
            onPendingLocationChange={(loc) => setPendingLocation(loc)}
          />

        {/* Apply Selected Location Button */}
        {pendingLocation && (
          <div className="mt-4">
            <Button
              onClick={() => {
                const lat = pendingLocation.latitude
                const lon = pendingLocation.longitude
                if (typeof lat === 'number' && typeof lon === 'number') {
                  setUserLocation({ latitude: lat, longitude: lon })
                }
                setPendingLocation(null)
              }}
              className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto px-6 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Use Selected Location
            </Button>
          </div>
        )}
        </div>

        {/* Loading and Error States */}
        {isLoadingPanchang && (
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Loading real-time Panchang data...</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Fetching Tithi, Nakshatra, Yoga, Karana from astrology API
            </p>
            <p className="text-sm text-gray-500">
              Fetching Sunrise, Sunset, Moonrise & Moonset from IPGeolocation API
            </p>
          </div>
        )}

        {panchangError && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{panchangError}</p>
          </div>
        )}

        {/* Success indicator when data is loaded */}
        {!isLoadingPanchang && !panchangError && userLocation && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              ✅ Real-time Panchang data loaded for your location
            </p>
            <p className="text-green-700 text-xs mt-1">
              Astrological data from Free Astrology API • Sun/Moon data from IPGeolocation API
            </p>
          </div>
        )}

        {/* Panchang Grid */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {selectedDate === new Date().toISOString().split('T')[0] 
              ? "Today's Panchang" 
              : `Panchang for ${new Date(selectedDate).toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}`
            }
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {panchangItems.map((item, index) => (
              <PanchangCard
                key={index}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </section>

        {/* Inauspicious Timings */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Auspicious / Inauspicious
          </h2>
          <TimingsSection timings={inauspiciousTimings} />
        </section>

        {/* Festival Card */}
        {panchangData.festivals.length > 0 && (
          <section className="mb-8">
            <FestivalCard festival={panchangData.festivals[0]} />
          </section>
        )}

        {/* Hora Timings */}
       {/* <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Hora Timings</h2>
          <HoraTimeline horas={panchangData.horaTimings} />
        </section> */}

        {/* Astrology Options Section */}
        <section className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              Astrological Calculations
            </h2>
            <p className="text-gray-600">Click on any option below to calculate detailed astrological data</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {astrologyOptions.map((option) => (
              <AstrologyOptionCard
                key={option.id}
                option={option}
                onClick={handleOptionClick}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm mt-12 pb-6">
          <p>Powered by <span className="text-blue-600"> ©️TheGodSays </span>Panchang</p>
        </footer>
      </main>
    </div>
  )
}