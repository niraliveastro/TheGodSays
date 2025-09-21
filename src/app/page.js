'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
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
  const [isLoadingPanchang, setIsLoadingPanchang] = useState(false)
  const [panchangError, setPanchangError] = useState(null)
  
  // Astrology options state
  const [selectedOption, setSelectedOption] = useState(null)
  const [astrologyResult, setAstrologyResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const astrologyOptions = [
    { id: 'tithi-timings', name: 'Tithi Timings', description: 'Lunar day timings and details' },
    { id: 'nakshatra-timings', name: 'Nakshatra Timings', description: 'Lunar mansion timings' },
    { id: 'yoga-durations', name: 'Yoga Durations', description: 'Yoga period calculations' },
    { id: 'karana-timings', name: 'Karana Timings', description: 'Half lunar day timings' },
    { id: 'vedic-weekday', name: 'Vedic Weekday', description: 'Traditional weekday calculation' },
    { id: 'lunar-month-info', name: 'Lunar Month Info', description: 'Lunar month details' },
    { id: 'ritu-information', name: 'Ritu Information', description: 'Seasonal information' },
    { id: 'samvat-information', name: 'Samvat Information', description: 'Era and calendar info' },
    { id: 'aayanam', name: 'Aayanam', description: 'Precession of equinoxes' },
    { id: 'hora-timings', name: 'Hora Timings', description: 'Planetary hour timings' },
    { id: 'choghadiya-timings', name: 'Choghadiya Timings', description: 'Auspicious time periods' },
    { id: 'abhijit-muhurat', name: 'Abhijit Muhurat', description: 'Most auspicious time' },
    { id: 'amrit-kaal', name: 'Amrit Kaal', description: 'Nectar time period' },
    { id: 'brahma-muhurat', name: 'Brahma Muhurat', description: 'Divine time period' },
    { id: 'rahu-kalam', name: 'Rahu Kalam', description: 'Inauspicious time period' },
    { id: 'yama-gandam', name: 'Yama Gandam', description: 'Yama\'s time period' },
    { id: 'gulika-kalam', name: 'Gulika Kalam', description: 'Gulika\'s time period' },
    { id: 'dur-muhurat', name: 'Dur Muhurat', description: 'Inauspicious muhurat' },
    { id: 'varjyam', name: 'Varjyam', description: 'Forbidden time periods' },
    { id: 'good-bad-times', name: 'Good & Bad Times', description: 'Overall auspiciousness' }
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

      // Fetch Panchang data and Sun/Moon data in parallel
      const [panchangResults, sunMoonData] = await Promise.all([
        astrologyAPI.getPanchangData(payload),
        astrologyAPI.getSunMoonData(userLocation.latitude, userLocation.longitude, date)
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

      setPanchangData(updatedPanchangData)

      // Log any errors
      const allErrors = { ...panchangResults.errors }
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">TheGodSays</h1>
          <p className="text-lg text-gray-600">{currentDate}</p>
        </div>

        {/* Date Selector */}
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          userLocation={userLocation}
          onLocationChange={setUserLocation}
        />

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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Auspicious / Inauspicious</h2>
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Astrological Calculations</h2>
            <p className="text-gray-600">Click on any option below to calculate detailed astrological data</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
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
        <footer className="text-center text-gray-500 text-sm mt-12">
          <p>Powered by TheGodSays Panchang</p>
        </footer>
      </main>
    </div>
  )
}