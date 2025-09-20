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
import { mockPanchangData } from '@/lib/mockData'
import { astrologyAPI } from '@/lib/api'

export default function Home() {
  const [panchangData, setPanchangData] = useState(mockPanchangData)
  const [currentDate, setCurrentDate] = useState('')
  
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

        {/* Today's Panchang Grid */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Panchang</h2>
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