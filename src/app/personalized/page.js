'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ChoghadiyaForm from '@/components/ChoghadiyaForm'
import ChoghadiyaResults from '@/components/ChoghadiyaResults'
import AstrologyOptions from '@/components/AstrologyOptions'
import AstrologyResults from '@/components/AstrologyResults'
import { mockPersonalizedData } from '@/lib/mockData'
import { astrologyAPI } from '@/lib/api'
import { User, Calendar, MapPin, Clock, Star, Info, AlertCircle } from 'lucide-react'

export default function PersonalizedPage() {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [personalizedData] = useState(mockPersonalizedData)
  
  // Choghadiya states
  const [choghadiyaData, setChoghadiyaData] = useState(null)
  const [isLoadingChoghadiya, setIsLoadingChoghadiya] = useState(false)
  const [choghadiyaError, setChoghadiyaError] = useState(null)
  
  // Astrology options states
  const [selectedAstrologyOptions, setSelectedAstrologyOptions] = useState([])
  const [astrologyResults, setAstrologyResults] = useState(null)
  const [isLoadingAstrology, setIsLoadingAstrology] = useState(false)
  const [astrologyErrors, setAstrologyErrors] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitted(true)
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleChoghadiyaSubmit = async (payload) => {
    setIsLoadingChoghadiya(true)
    setChoghadiyaError(null)
    
    try {
      const data = await astrologyAPI.getTimings(payload)
      setChoghadiyaData(data)
    } catch (error) {
      setChoghadiyaError('Failed to fetch Choghadiya timings. Please try again.')
      console.error('Choghadiya API error:', error)
    } finally {
      setIsLoadingChoghadiya(false)
    }
  }

  const handleAstrologyOptionsSubmit = async (optionIds) => {
    setIsLoadingAstrology(true)
    setAstrologyErrors(null)
    setSelectedAstrologyOptions(optionIds)
    
    // Create payload from form data
    const payload = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      date: new Date().getDate(),
      hours: 12,
      minutes: 0,
      seconds: 0,
      latitude: 1.4433887, // Default Singapore coordinates
      longitude: 103.8325013,
      timezone: 8,
      config: {
        observation_point: 'geocentric',
        ayanamsha: 'lahiri'
      }
    }
    
    try {
      const { results, errors } = await astrologyAPI.getMultipleCalculations(optionIds, payload)
      setAstrologyResults(results)
      setAstrologyErrors(errors)
    } catch (error) {
      setAstrologyErrors({ general: 'Failed to fetch astrological data. Please try again.' })
      console.error('Astrology API error:', error)
    } finally {
      setIsLoadingAstrology(false)
    }
  }

  if (!isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Personalized Panchang</h1>
            <p className="text-lg text-gray-600">Enter your birth details for personalized insights</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Birth Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <Input
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time of Birth
                  </label>
                  <Input
                    name="birthTime"
                    type="time"
                    value={formData.birthTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place of Birth
                  </label>
                  <Input
                    name="birthPlace"
                    value={formData.birthPlace}
                    onChange={handleInputChange}
                    placeholder="City, State, Country"
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  Get Personalized Panchang
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Your Personalized Panchang</h1>
          <p className="text-lg text-gray-600">Welcome, {personalizedData.userProfile.name}</p>
        </div>

        {/* User Profile */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Your Astrological Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Lagna</div>
                  <div className="text-xl font-semibold text-blue-600">{personalizedData.userProfile.lagna}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Moon Sign</div>
                  <div className="text-xl font-semibold text-green-600">{personalizedData.userProfile.moonSign}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Nakshatra</div>
                  <div className="text-xl font-semibold text-purple-600">{personalizedData.userProfile.nakshatra}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Dasha Information */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Current Dasha Period</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">Mahadasha</div>
                    <div className="text-2xl font-bold text-blue-600">{personalizedData.dasha.mahadasha}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Antardasha</div>
                    <div className="text-lg font-semibold text-green-600">{personalizedData.dasha.antardasha}</div>
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-800 mb-1">Meaning</div>
                      <div className="text-gray-600">{personalizedData.dasha.meaning}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Personalized Notes */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Today's Personalized Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {personalizedData.personalizedNotes.map((note, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <p className="text-gray-700">{note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recommended Horas */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Horas for You</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {personalizedData.recommendedHoras.map((hora, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-800">{hora.planet}</div>
                      <div className="text-sm text-gray-600">{hora.start} - {hora.end}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">{hora.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Astrology Options */}
        <section className="mb-8">
          <AstrologyOptions 
            onOptionSelect={handleAstrologyOptionsSubmit}
            isLoading={isLoadingAstrology}
          />
          
          {astrologyErrors && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">
                  {astrologyErrors.general || 'Some calculations failed. Please try again.'}
                </span>
              </div>
            </div>
          )}
          
          {astrologyResults && (
            <div className="mt-6">
              <AstrologyResults 
                results={astrologyResults} 
                selectedOptions={selectedAstrologyOptions}
              />
            </div>
          )}
        </section>

        {/* Choghadiya Timings */}
        <section className="mb-8">
          <ChoghadiyaForm 
            onSubmit={handleChoghadiyaSubmit}
            isLoading={isLoadingChoghadiya}
          />
          
          {choghadiyaError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{choghadiyaError}</span>
              </div>
            </div>
          )}
          
          {choghadiyaData && (
            <div className="mt-6">
              <ChoghadiyaResults data={choghadiyaData} />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

