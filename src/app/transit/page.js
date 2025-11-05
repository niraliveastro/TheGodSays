'use client'

import { useState, useEffect } from 'react'
import './transit.css'

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
    <div className="transit-container">
                 {/* Orbs */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>
      <div className="transit-content">
        {/* Header */}
        <header className="transit-header">
          <h1 className="title">
            Planetary Transit
          </h1>
          <p className="subtitle">
            Current planetary movements and their cosmic influences
          </p>
        </header>

        {/* Results */}
        {result && (
          <main>
            {/* Next Immediate Transits - Countdown */}
            <section className="transit-section">
              <h2 className="section-title">
                Next Immediate Transits
              </h2>
              <div className="countdown-grid-cards">
                {/* Venus Transit Card - Dynamic Data */}
                {(() => {
                  const venusTransit = result.currentTransits.find(t => t.planet === 'Venus')
                  const venusUpcoming = result.upcomingTransits.Venus?.[0]
                  const nextVenusTransit = venusUpcoming
                  
                  if (!nextVenusTransit) return null
                  
                  const isActive = venusCountdown === "IN-EFFECT"
                  
                  return (
                    <div className="transit-card countdown-card-new current">
                      <div className="accent" style={{background: 'linear-gradient(90deg, #ec4899, #ec4899dd)'}}></div>
                      <div className="cardBody">
                        <div className="iconBox" style={{background: 'linear-gradient(135deg, #ec4899, #ec4899cc)'}}>
                          <span style={{fontSize: '2rem'}}>♀</span>
                        </div>
                        <div className="titleGroup" style={{flex: 1}}>
                          <h3>Venus enters {nextVenusTransit.sign}</h3>
                          <p className="desc">Love & harmony transition</p>
                          <div className="liveBadge">
                            <div className="pulseDot"></div>
                            {isActive ? 'ACTIVE NOW' : 'UPCOMING'}
                          </div>
                        </div>
                      </div>
                      <div className="cardBody info-section">
                        <div className="infoRow">
                          <span className="infoLabel">Current Sign</span>
                          <span className="infoValue">{venusTransit?.currentSign || 'Moving'}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Next Transit</span>
                          <span className="infoValue">{nextVenusTransit.date.split(',')[0]}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Countdown</span>
                          <span className="infoValue countdown-value">{venusCountdown}</span>
                        </div>
                      </div>
                      <div className="footer">
                        Entering {nextVenusTransit.sign}
                      </div>
                    </div>
                  )
                })()}
                
                {/* Moon Transit Card - Dynamic Data */}
                {(() => {
                  const moonTransit = result.currentTransits.find(t => t.planet === 'Moon')
                  const moonUpcoming = result.upcomingTransits.Moon?.[0]
                  const nextMoonTransit = moonUpcoming
                  
                  if (!nextMoonTransit) return null
                  
                  const isActive = moonCountdown === "IN-EFFECT"
                  
                  return (
                    <div className="transit-card countdown-card-new current">
                      <div className="accent" style={{background: 'linear-gradient(90deg, #a78bfa, #a78bfadd)'}}></div>
                      <div className="cardBody">
                        <div className="iconBox" style={{background: 'linear-gradient(135deg, #a78bfa, #a78bfacc)'}}>
                          <span style={{fontSize: '2rem'}}>☽</span>
                        </div>
                        <div className="titleGroup" style={{flex: 1}}>
                          <h3>Moon enters {nextMoonTransit.sign}</h3>
                          <p className="desc">Emotional shifts & new phase</p>
                          <div className="liveBadge">
                            <div className="pulseDot"></div>
                            {isActive ? 'ACTIVE NOW' : 'UPCOMING'}
                          </div>
                        </div>
                      </div>
                      <div className="cardBody info-section">
                        <div className="infoRow">
                          <span className="infoLabel">Current Sign</span>
                          <span className="infoValue">{moonTransit?.currentSign || 'Moving'}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Next Transit</span>
                          <span className="infoValue">{nextMoonTransit.date.split(',')[0]}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Countdown</span>
                          <span className="infoValue countdown-value">{moonCountdown}</span>
                        </div>
                      </div>
                      <div className="footer">
                        Entering {nextMoonTransit.sign}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </section>

            {/* Current Planetary Transits Cards */}
            <section className="transit-section">
              <h2 className="section-title">
                Current Planetary Transits
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {result.currentTransits.map((transit, index) => {
                  // Planet color mapping
                  const planetColors = {
                    'Sun': '#fbbf24',
                    'Moon': '#a78bfa',
                    'Mercury': '#10b981',
                    'Venus': '#ec4899',
                    'Mars': '#ef4444',
                    'Jupiter': '#3b82f6',
                    'Saturn': '#6366f1',
                    'Rahu': '#8b5cf6'
                  }
                  
                  const planetColor = planetColors[transit.planet] || '#d4af37'
                  
                  return (
                    <div key={index} className="transit-card current-transit-card">
                      <div className="accent" style={{background: `linear-gradient(90deg, ${planetColor}, ${planetColor}dd)`}}></div>
                      <div className="cardBody">
                        <div className="iconBox" style={{background: `linear-gradient(135deg, ${planetColor}, ${planetColor}cc)`}}>
                          <span style={{fontSize: '2rem'}}>{transit.symbol}</span>
                        </div>
                        <div className="titleGroup" style={{flex: 1}}>
                          <h3>{transit.planet} in {transit.currentSign}</h3>
                          <p className="desc">Current planetary position</p>
                        </div>
                      </div>
                      <div className="cardBody info-section">
                        <div className="infoRow">
                          <span className="infoLabel">Duration</span>
                          <span className="infoValue">{transit.duration}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Started</span>
                          <span className="infoValue">{transit.startDate}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Ends</span>
                          <span className="infoValue">{transit.endDate}</span>
                        </div>
                      </div>
                      <div className="footer">
                        Next: {transit.nextTransit.sign}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Upcoming Transits by Planet - Tabbed Interface */}
            <section className="transit-section">
              <h2 className="section-title">
                Upcoming Planetary Transits (Next 6 Months)
              </h2>
              <div className="transit-table-card">
                {/* Planet Tabs */}
                <div className="planet-tabs-container">
                  <div className="planet-tabs">
                    {Object.keys(result.upcomingTransits).map((planet) => (
                      <button
                        key={planet}
                        onClick={() => setSelectedPlanet(planet)}
                        className={`planet-tab ${selectedPlanet === planet ? 'active' : ''}`}
                      >
                        {planet}
                      </button>
                    ))}
                  </div>
                </div>

              {/* Selected Planet's Transits as Cards */}
              <div className="upcoming-transits-section">
                <h3 className="upcoming-section-title">
                  {selectedPlanet} Transits Schedule
                </h3>
                
                {result.upcomingTransits[selectedPlanet].length > 0 ? (
                  <div className="upcoming-transit-grid">
                    {result.upcomingTransits[selectedPlanet].map((transit, index) => {
                      const planetColors = {
                        'Sun': '#f59e0b',
                        'Moon': '#a78bfa',
                        'Mercury': '#10b981',
                        'Venus': '#ec4899',
                        'Mars': '#ef4444',
                        'Jupiter': '#3b82f6',
                        'Saturn': '#6366f1',
                        'Rahu': '#8b5cf6'
                      }
                      const planetSymbols = {
                        'Mercury': '☿',
                        'Venus': '♀',
                        'Moon': '☽',
                        'Sun': '☉',
                        'Mars': '♂',
                        'Jupiter': '♃',
                        'Saturn': '♄',
                        'Rahu': '☊'
                      }
                      const zodiacSymbols = {
                        'Aries': '♈',
                        'Taurus': '♉',
                        'Gemini': '♊',
                        'Cancer': '♋',
                        'Leo': '♌',
                        'Virgo': '♍',
                        'Libra': '♎',
                        'Scorpio': '♏',
                        'Sagittarius': '♐',
                        'Capricorn': '♑',
                        'Aquarius': '♒',
                        'Pisces': '♓'
                      }
                      
                      const planetColor = planetColors[selectedPlanet] || '#d4af37'
                      const transitDate = new Date(transit.date)
                      
                      return (
                        <div key={index} className="transit-card upcoming-card">
                          <div className="accent" style={{background: `linear-gradient(90deg, ${planetColor}, ${planetColor}dd)`}}></div>
                          <div className="cardBody">
                            <div className="iconBox" style={{background: `linear-gradient(135deg, ${planetColor}, ${planetColor}cc)`}}>
                              <span style={{fontSize: '1.5rem'}}>{zodiacSymbols[transit.sign] || '✦'}</span>
                            </div>
                            <div className="titleGroup" style={{flex: 1}}>
                              <h3>{transit.sign}</h3>
                              <p className="desc">{selectedPlanet} enters {transit.sign}</p>
                            </div>
                          </div>
                          <div className="cardBody info-section">
                            <div className="infoRow">
                              <span className="infoLabel">Date</span>
                              <span className="infoValue">
                                {transitDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="infoRow">
                              <span className="infoLabel">Time</span>
                              <span className="infoValue">
                                {new Date(transit.date).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-card">
                        <span className="empty-state-text">
                          No transits scheduled for {selectedPlanet} in the next 6 months
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  )
}