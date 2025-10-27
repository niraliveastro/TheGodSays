'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Star, Moon, Sun, Zap, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TransitPage() {
  const [result, setResult] = useState(null)
  const [selectedPlanet, setSelectedPlanet] = useState('Mercury')
  const [venusCountdown, setVenusCountdown] = useState('')
  const [moonCountdown, setMoonCountdown] = useState('')

  // Planet data and properties
  const PLANETS = {
    sun: { name: 'Sun', symbol: '☉', cycle: '1 year', influence: 'Identity, Vitality, Purpose' },
    moon: { name: 'Moon', symbol: '☽', cycle: '28 days', influence: 'Emotions, Intuition, Habits' },
    mercury: { name: 'Mercury', symbol: '☿', cycle: '88 days', influence: 'Communication, Mind, Travel' },
    venus: { name: 'Venus', symbol: '♀', cycle: '225 days', influence: 'Love, Beauty, Values' },
    mars: { name: 'Mars', symbol: '♂', cycle: '687 days', influence: 'Action, Energy, Conflict' },
    jupiter: { name: 'Jupiter', symbol: '♃', cycle: '12 years', influence: 'Growth, Wisdom, Luck' },
    saturn: { name: 'Saturn', symbol: '♄', cycle: '29 years', influence: 'Discipline, Karma, Structure' },
    uranus: { name: 'Uranus', symbol: '♅', cycle: '84 years', influence: 'Innovation, Revolution, Change' },
    neptune: { name: 'Neptune', symbol: '♆', cycle: '165 years', influence: 'Dreams, Spirituality, Illusion' },
    pluto: { name: 'Pluto', symbol: '♇', cycle: '248 years', influence: 'Transformation, Power, Rebirth' }
  }

  const ASPECTS = {
    conjunction: { degrees: 0, name: 'Conjunction', symbol: '☌', influence: 'Intensification, New Beginnings' },
    sextile: { degrees: 60, name: 'Sextile', symbol: '⚹', influence: 'Opportunity, Harmony' },
    square: { degrees: 90, name: 'Square', symbol: '□', influence: 'Tension, Challenge, Growth' },
    trine: { degrees: 120, name: 'Trine', symbol: '△', influence: 'Flow, Ease, Natural Talent' },
    opposition: { degrees: 180, name: 'Opposition', symbol: '☍', influence: 'Balance, Awareness, Completion' }
  }

  const HOUSES = {
    1: 'Self, Identity, First Impressions',
    2: 'Money, Values, Possessions',
    3: 'Communication, Siblings, Short Trips',
    4: 'Home, Family, Roots',
    5: 'Creativity, Romance, Children',
    6: 'Work, Health, Daily Routine',
    7: 'Partnerships, Marriage, Open Enemies',
    8: 'Transformation, Shared Resources, Intimacy',
    9: 'Philosophy, Higher Learning, Long Journeys',
    10: 'Career, Reputation, Public Image',
    11: 'Friends, Groups, Hopes and Wishes',
    12: 'Spirituality, Hidden Things, Subconscious'
  }

  // Load and display data immediately when component mounts
  useEffect(() => {
    const transitData = generateTransitData()
    const analysisResult = {
      ...transitData,
      calculatedAt: new Date().toISOString()
    }
    setResult(analysisResult)
  }, [])

  // Real-time countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      
      // Venus countdown
      const venusDate = new Date("November 2, 2025 13:15:33").getTime()
      const venusDistance = venusDate - now
      
      if (venusDistance > 0) {
        const days = Math.floor(venusDistance / (1000 * 60 * 60 * 24))
        const hours = Math.floor((venusDistance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((venusDistance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((venusDistance % (1000 * 60)) / 1000)
        setVenusCountdown(`${days} day(s) ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setVenusCountdown("IN-EFFECT")
      }

      // Moon countdown
      const moonDate = new Date("October 28, 2025 22:14:42").getTime()
      const moonDistance = moonDate - now
      
      if (moonDistance > 0) {
        const days = Math.floor(moonDistance / (1000 * 60 * 60 * 24))
        const hours = Math.floor((moonDistance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((moonDistance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((moonDistance % (1000 * 60)) / 1000)
        setMoonCountdown(`${days} day(s) ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setMoonCountdown("IN-EFFECT")
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  // Real planetary transit data extracted from AAPS website
  const getCurrentTransits = () => {
    return [
      {
        planet: 'Moon',
        symbol: '☽',
        currentSign: 'Sagittarius',
        duration: '2 days 11 hours',
        startDate: 'October 26, 2025 10:46',
        endDate: 'October 28, 2025 22:14',
        nextTransit: { sign: 'Capricorn', date: 'October 28, 2025, 22:14:42' }
      },
      {
        planet: 'Mercury',
        symbol: '☿',
        currentSign: 'Scorpio',
        duration: '30 days 7 hours',
        startDate: 'October 24, 2025 12:33',
        endDate: 'November 23, 2025 20:6',
        nextTransit: { sign: 'Libra', date: 'November 23, 2025, 20:6:52' }
      },
      {
        planet: 'Venus',
        symbol: '♀',
        currentSign: 'Virgo',
        duration: '24 days 2 hours',
        startDate: 'October 9, 2025 10:49',
        endDate: 'November 2, 2025 13:15',
        nextTransit: { sign: 'Libra', date: 'November 2, 2025, 13:15:33' }
      },
      {
        planet: 'Sun',
        symbol: '☉',
        currentSign: 'Libra',
        duration: '29 days 23 hours',
        startDate: 'October 17, 2025 13:46',
        endDate: 'November 16, 2025 13:37',
        nextTransit: { sign: 'Scorpio', date: 'November 16, 2025, 13:37:18' }
      },
      {
        planet: 'Mars',
        symbol: '♂',
        currentSign: 'Scorpio',
        duration: '41 days 4 hours',
        startDate: 'October 27, 2025 15:42',
        endDate: 'December 7, 2025 20:17',
        nextTransit: { sign: 'Sagittarius', date: 'December 7, 2025, 20:17:34' }
      },
      {
        planet: 'Jupiter',
        symbol: '♃',
        currentSign: 'Cancer',
        duration: '47 days 21 hours',
        startDate: 'October 18, 2025 19:47',
        endDate: 'December 5, 2025 17:25',
        nextTransit: { sign: 'Gemini', date: 'December 5, 2025, 17:25:16' }
      },
      {
        planet: 'Saturn',
        symbol: '♄',
        currentSign: 'Pisces',
        duration: '795 days (2 years 2 months 4 days) 7 hours',
        startDate: 'March 29, 2025 21:44',
        endDate: 'June 3, 2027 5:27',
        nextTransit: { sign: 'Aries', date: 'No transits in upcoming 6 months' }
      },
      {
        planet: 'Rahu',
        symbol: '☊',
        currentSign: 'Aquarius',
        duration: '566 days (1 years 6 months 17 days) 2 hours',
        startDate: 'May 18, 2025 19:35',
        endDate: 'December 5, 2026 22:33',
        nextTransit: { sign: 'Capricorn', date: 'No transits in upcoming 6 months' }
      }
    ]
  }

  const getUpcomingTransits = () => {
    return {
      Mercury: [
        { sign: 'Libra', date: 'November 23, 2025, 20:6:52' },
        { sign: 'Scorpio', date: 'December 6, 2025, 20:45:10' },
        { sign: 'Sagittarius', date: 'December 29, 2025, 7:23:43' },
        { sign: 'Capricorn', date: 'January 17, 2026, 10:23:52' },
        { sign: 'Aquarius', date: 'February 3, 2026, 21:51:49' },
        { sign: 'Pisces', date: 'April 11, 2026, 1:15:51' }
      ],
      Venus: [
        { sign: 'Libra', date: 'November 2, 2025, 13:15:33' },
        { sign: 'Scorpio', date: 'November 26, 2025, 11:21:59' },
        { sign: 'Sagittarius', date: 'December 20, 2025, 7:45:15' },
        { sign: 'Capricorn', date: 'January 13, 2026, 3:57:50' },
        { sign: 'Aquarius', date: 'February 6, 2026, 1:11:25' },
        { sign: 'Pisces', date: 'March 2, 2026, 0:56:53' },
        { sign: 'Aries', date: 'March 26, 2026, 5:9:5' },
        { sign: 'Taurus', date: 'April 19, 2026, 15:46:39' }
      ],
      Sun: [
        { sign: 'Scorpio', date: 'November 16, 2025, 13:37:18' },
        { sign: 'Sagittarius', date: 'December 16, 2025, 4:19:51' },
        { sign: 'Capricorn', date: 'January 14, 2026, 15:7:6' },
        { sign: 'Aquarius', date: 'February 13, 2026, 4:8:45' },
        { sign: 'Pisces', date: 'March 15, 2026, 1:2:52' },
        { sign: 'Aries', date: 'April 14, 2026, 9:32:27' }
      ],
      Mars: [
        { sign: 'Sagittarius', date: 'December 7, 2025, 20:17:34' },
        { sign: 'Capricorn', date: 'January 16, 2026, 4:28:18' },
        { sign: 'Aquarius', date: 'February 23, 2026, 11:50:8' },
        { sign: 'Pisces', date: 'April 2, 2026, 15:29:27' }
      ],
      Jupiter: [
        { sign: 'Gemini', date: 'December 5, 2025, 17:25:16' }
      ],
      Saturn: [],
      Moon: [
        { sign: 'Capricorn', date: 'October 28, 2025, 22:14:42' },
        { sign: 'Aquarius', date: 'October 31, 2025, 6:48:21' },
        { sign: 'Pisces', date: 'November 2, 2025, 11:27:0' },
        { sign: 'Aries', date: 'November 4, 2025, 12:34:32' },
        { sign: 'Taurus', date: 'November 6, 2025, 11:46:58' },
        { sign: 'Gemini', date: 'November 8, 2025, 11:14:19' },
        { sign: 'Cancer', date: 'November 10, 2025, 13:3:5' },
        { sign: 'Leo', date: 'November 12, 2025, 18:35:24' },
        { sign: 'Virgo', date: 'November 15, 2025, 3:51:25' },
        { sign: 'Libra', date: 'November 17, 2025, 15:35:0' },
        { sign: 'Scorpio', date: 'November 20, 2025, 4:13:54' },
        { sign: 'Sagittarius', date: 'November 22, 2025, 16:46:52' },
        { sign: 'Capricorn', date: 'November 25, 2025, 4:26:53' },
        { sign: 'Aquarius', date: 'November 27, 2025, 14:7:18' },
        { sign: 'Pisces', date: 'November 29, 2025, 20:33:29' },
        { sign: 'Aries', date: 'December 1, 2025, 23:18:18' },
        { sign: 'Taurus', date: 'December 3, 2025, 23:14:19' },
        { sign: 'Gemini', date: 'December 5, 2025, 22:15:21' },
        { sign: 'Cancer', date: 'December 7, 2025, 22:38:25' },
        { sign: 'Leo', date: 'December 10, 2025, 2:22:44' },
        { sign: 'Virgo', date: 'December 12, 2025, 10:20:30' },
        { sign: 'Libra', date: 'December 14, 2025, 21:41:32' },
        { sign: 'Scorpio', date: 'December 17, 2025, 10:26:15' },
        { sign: 'Sagittarius', date: 'December 19, 2025, 22:51:8' },
        { sign: 'Capricorn', date: 'December 22, 2025, 10:6:51' },
        { sign: 'Aquarius', date: 'December 24, 2025, 19:46:22' },
        { sign: 'Pisces', date: 'December 27, 2025, 3:10:34' },
        { sign: 'Aries', date: 'December 29, 2025, 7:40:56' },
        { sign: 'Taurus', date: 'December 31, 2025, 9:23:1' },
        { sign: 'Gemini', date: 'January 2, 2026, 9:25:53' },
        { sign: 'Cancer', date: 'January 4, 2026, 9:43:0' },
        { sign: 'Leo', date: 'January 6, 2026, 12:17:41' },
        { sign: 'Virgo', date: 'January 8, 2026, 18:39:8' },
        { sign: 'Libra', date: 'January 11, 2026, 4:52:37' },
        { sign: 'Scorpio', date: 'January 13, 2026, 17:21:11' },
        { sign: 'Sagittarius', date: 'January 16, 2026, 5:47:42' },
        { sign: 'Capricorn', date: 'January 18, 2026, 16:40:57' },
        { sign: 'Aquarius', date: 'January 21, 2026, 1:35:24' },
        { sign: 'Pisces', date: 'January 23, 2026, 8:33:37' },
        { sign: 'Aries', date: 'January 25, 2026, 13:35:44' },
        { sign: 'Taurus', date: 'January 27, 2026, 16:44:55' },
        { sign: 'Gemini', date: 'January 29, 2026, 18:30:54' },
        { sign: 'Cancer', date: 'January 31, 2026, 20:1:5' },
        { sign: 'Leo', date: 'February 2, 2026, 22:47:42' },
        { sign: 'Virgo', date: 'February 5, 2026, 4:19:52' },
        { sign: 'Libra', date: 'February 7, 2026, 13:21:50' },
        { sign: 'Scorpio', date: 'February 10, 2026, 1:11:13' },
        { sign: 'Sagittarius', date: 'February 12, 2026, 13:42:18' },
        { sign: 'Capricorn', date: 'February 15, 2026, 0:42:16' },
        { sign: 'Aquarius', date: 'February 17, 2026, 9:5:41' },
        { sign: 'Pisces', date: 'February 19, 2026, 14:59:57' },
        { sign: 'Aries', date: 'February 21, 2026, 19:7:4' },
        { sign: 'Taurus', date: 'February 23, 2026, 22:12:19' },
        { sign: 'Gemini', date: 'February 26, 2026, 0:54:45' },
        { sign: 'Cancer', date: 'February 28, 2026, 3:52:24' },
        { sign: 'Leo', date: 'March 2, 2026, 7:51:29' },
        { sign: 'Virgo', date: 'March 4, 2026, 13:45:39' },
        { sign: 'Libra', date: 'March 6, 2026, 22:18:40' },
        { sign: 'Scorpio', date: 'March 9, 2026, 9:29:47' },
        { sign: 'Sagittarius', date: 'March 11, 2026, 22:0:13' },
        { sign: 'Capricorn', date: 'March 14, 2026, 9:33:1' },
        { sign: 'Aquarius', date: 'March 16, 2026, 18:14:17' },
        { sign: 'Pisces', date: 'March 18, 2026, 23:36:3' },
        { sign: 'Aries', date: 'March 21, 2026, 2:27:45' },
        { sign: 'Taurus', date: 'March 23, 2026, 4:13:56' },
        { sign: 'Gemini', date: 'March 25, 2026, 6:17:19' },
        { sign: 'Cancer', date: 'March 27, 2026, 9:35:58' },
        { sign: 'Leo', date: 'March 29, 2026, 14:37:55' },
        { sign: 'Virgo', date: 'March 31, 2026, 21:32:45' },
        { sign: 'Libra', date: 'April 3, 2026, 6:28:40' },
        { sign: 'Scorpio', date: 'April 5, 2026, 17:27:55' },
        { sign: 'Sagittarius', date: 'April 8, 2026, 5:53:52' },
        { sign: 'Capricorn', date: 'April 10, 2026, 18:3:53' },
        { sign: 'Aquarius', date: 'April 13, 2026, 3:44:40' },
        { sign: 'Pisces', date: 'April 15, 2026, 9:37:30' },
        { sign: 'Aries', date: 'April 17, 2026, 12:2:15' },
        { sign: 'Taurus', date: 'April 19, 2026, 12:31:2' },
        { sign: 'Gemini', date: 'April 21, 2026, 13:0:51' },
        { sign: 'Cancer', date: 'April 23, 2026, 15:13:15' },
        { sign: 'Leo', date: 'April 25, 2026, 20:4:47' },
        { sign: 'Virgo', date: 'April 28, 2026, 3:35:46' }
      ],
      Rahu: []
    }
  }

  // Generate transit data based on real information
  const generateTransitData = () => {
    const currentTransits = getCurrentTransits()
    const upcomingTransits = getUpcomingTransits()
    
    return {
      currentTransits,
      upcomingTransits,
      overallEnergy: generateOverallEnergy(),
      timeframe: getTimeframe()
    }
  }

  const getZodiacSign = (number) => {
    const signs = [
      'Aries ♈', 'Taurus ♉', 'Gemini ♊', 'Cancer ♋', 
      'Leo ♌', 'Virgo ♍', 'Libra ♎', 'Scorpio ♏',
      'Sagittarius ♐', 'Capricorn ♑', 'Aquarius ♒', 'Pisces ♓'
    ]
    return signs[number - 1]
  }

  const generateOverallEnergy = () => {
    const energies = [
      { type: 'Transformative', description: 'Major life changes and deep personal growth', color: 'purple' },
      { type: 'Expansive', description: 'Growth, opportunities, and new horizons opening', color: 'green' },
      { type: 'Challenging', description: 'Tests, obstacles requiring strength and patience', color: 'red' },
      { type: 'Harmonious', description: 'Flow, ease, and natural progression', color: 'blue' },
      { type: 'Dynamic', description: 'High energy, action, and rapid developments', color: 'orange' },
      { type: 'Reflective', description: 'Introspection, review, and inner work', color: 'indigo' }
    ]
    return energies[Math.floor(Math.random() * energies.length)]
  }

  const getTimeframe = () => {
    const frames = [
      'Next 30 days', 'Next 3 months', 'Next 6 months', 'Current phase (2-3 weeks)'
    ]
    return frames[Math.floor(Math.random() * frames.length)]
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 sm:py-6 sm:px-4 md:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] font-bold text-gray-800 mb-3 sm:mb-4 md:mb-6 lg:mb-8">
            Planetary Transit
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl text-gray-600 max-w-4xl mx-auto px-2 sm:px-4">
            Current planetary movements and their cosmic influences
          </p>
        </header>

        {/* Results */}
        {result && (
          <main className="space-y-6 sm:space-y-8 md:space-y-12 lg:space-y-16">
            {/* Next Immediate Transits - Moved to top with real-time countdown */}
            <section className="space-y-4 sm:space-y-6 md:space-y-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-gray-800 border-b pb-3 sm:pb-4 mb-4 sm:mb-6 md:mb-8 text-center">
                Next Immediate Transits
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10">
                <Card className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 hover:shadow-2xl transition-shadow duration-300 border-3 bg-gradient-to-br from-orange-200 via-pink-200 to-red-200 border-orange-400">
                  <CardContent className="p-0 text-center h-full flex flex-col justify-center">
                    <h4 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-orange-900 mb-3 sm:mb-4 md:mb-6 lg:mb-8">
                      Venus enters Libra
                    </h4>
                    <p className="text-orange-800 font-medium mb-3 sm:mb-4 md:mb-6 lg:mb-8 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
                      November 2, 2025, 13:15:33
                    </p>
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-orange-900 bg-orange-100/70 rounded-xl py-2 sm:py-3 md:py-4 lg:py-5 px-3 sm:px-4 md:px-6 lg:px-8 border-2 border-orange-400 shadow-md backdrop-blur-sm min-h-[3rem] sm:min-h-[4rem] md:min-h-[5rem] lg:min-h-[6rem] xl:min-h-[7rem] flex items-center justify-center">
                      <span className="font-mono tracking-wider text-center">{venusCountdown}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 hover:shadow-2xl transition-shadow duration-300 border-3 bg-gradient-to-br from-pink-200 via-purple-200 to-violet-200 border-pink-400">
                  <CardContent className="p-0 text-center h-full flex flex-col justify-center">
                    <h4 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-purple-900 mb-3 sm:mb-4 md:mb-6 lg:mb-8">
                      Moon enters Capricorn
                    </h4>
                    <p className="text-purple-800 font-medium mb-3 sm:mb-4 md:mb-6 lg:mb-8 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
                      October 28, 2025, 22:14:42
                    </p>
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-purple-900 bg-pink-100/70 rounded-xl py-2 sm:py-3 md:py-4 lg:py-5 px-3 sm:px-4 md:px-6 lg:px-8 border-2 border-pink-400 shadow-md backdrop-blur-sm min-h-[3rem] sm:min-h-[4rem] md:min-h-[5rem] lg:min-h-[6rem] xl:min-h-[7rem] flex items-center justify-center">
                      <span className="font-mono tracking-wider text-center">{moonCountdown}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Current Planetary Transits Table */}
            <section className="space-y-4 sm:space-y-6 md:space-y-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-gray-800 border-b pb-3 sm:pb-4 mb-4 sm:mb-6 md:mb-8 text-center">
                Current Planetary Transits
              </h2>
              <Card className="p-2 sm:p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-shadow duration-300 border-2">
                <CardContent className="p-0">
                  <div className="table-scroll-container">
                    <table className="w-full min-w-[640px] border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                          <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-blue-200 whitespace-nowrap">
                            Planet
                          </th>
                          <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-blue-200 whitespace-nowrap">
                            Current Sign
                          </th>
                          <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-blue-200 whitespace-nowrap">
                            Duration
                          </th>
                          <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-blue-200 whitespace-nowrap">
                            Started
                          </th>
                          <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-blue-200 whitespace-nowrap">
                            Ends
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.currentTransits.map((transit, index) => (
                          <tr key={index} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                          }`}>
                            <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center">
                              <div className="flex items-center justify-center gap-2 sm:gap-3">
                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">{transit.symbol}</span>
                                <span className="font-semibold text-gray-800 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl whitespace-nowrap">{transit.planet}</span>
                              </div>
                            </td>
                            <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center">
                              <span className="inline-block bg-blue-100 text-blue-800 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-medium whitespace-nowrap">
                                {transit.currentSign}
                              </span>
                            </td>
                            <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center text-gray-600 font-medium text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl">
                              <span className="whitespace-nowrap">{transit.duration}</span>
                            </td>
                            <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl">
                              <span className="whitespace-nowrap">{transit.startDate}</span>
                            </td>
                            <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl">
                              <span className="whitespace-nowrap">{transit.endDate}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Upcoming Transits by Planet - Tabbed Interface */}
            <section className="space-y-4 sm:space-y-6 md:space-y-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-gray-800 border-b pb-3 sm:pb-4 mb-4 sm:mb-6 md:mb-8 text-center">
                Upcoming Planetary Transits (Next 6 Months)
              </h2>
              <Card className="p-2 sm:p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-shadow duration-300 border-2">
                <CardContent className="p-0">
                  {/* Planet Tabs */}
                  <div className="w-full overflow-x-auto">
                    <div className="flex gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 border-b pb-3 sm:pb-4 min-w-max">
                      {Object.keys(result.upcomingTransits).map((planet) => (
                        <button
                          key={planet}
                          onClick={() => setSelectedPlanet(planet)}
                          className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium rounded-lg transition-all duration-200 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl whitespace-nowrap flex-shrink-0 ${
                            selectedPlanet === planet
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-gray-100 shadow-lg transform scale-105 border-2 border-blue-300'
                              : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50 border border-gray-200'
                          }`}
                        >
                          {planet}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Planet's Transits */}
                  <div className="mt-4 sm:mt-6 md:mt-8">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8 text-center">
                      {selectedPlanet} Transits
                    </h3>
                    
                    {result.upcomingTransits[selectedPlanet].length > 0 ? (
                      <div className="table-scroll-container">
                        <table className="w-full min-w-[480px] border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-green-50 to-green-100">
                              <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-green-200 whitespace-nowrap">
                                Sign
                              </th>
                              <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-green-200 whitespace-nowrap">
                                Entry Date
                              </th>
                              <th className="text-center py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 font-bold text-gray-700 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl border-b-2 border-green-200 whitespace-nowrap">
                                Time
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.upcomingTransits[selectedPlanet].map((transit, index) => (
                              <tr key={index} className={`border-b border-gray-100 hover:bg-green-50 transition-colors duration-200 ${
                                index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                              }`}>
                                <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center">
                                  <span className="inline-block bg-green-100 text-green-800 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-medium whitespace-nowrap">
                                    {transit.sign}
                                  </span>
                                </td>
                                <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center text-gray-700 font-medium text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl">
                                  <span className="whitespace-nowrap">
                                    {new Date(transit.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </td>
                                <td className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 text-center text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl">
                                  <span className="whitespace-nowrap">
                                    {new Date(transit.date).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-12 md:py-16">
                        <Card className="p-4 sm:p-6 md:p-8 lg:p-10 bg-gray-100 border-2 border-dashed border-gray-300">
                          <CardContent className="p-0">
                            <span className="text-gray-500 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl italic">
                              No transits scheduled for {selectedPlanet} in the next 6 months
                            </span>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        )}
      </div>
    </div>
  )
}