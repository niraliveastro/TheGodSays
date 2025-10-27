'use client'

import { useState, useEffect } from 'react'
import { Calculator, Star, Hash, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function NumerologyPage() {
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  // Numerology calculations
  const PYTHAGOREAN_MAP = {
    A: 1, J: 1, S: 1, B: 2, K: 2, T: 2, C: 3, L: 3, U: 3, D: 4, M: 4, V: 4,
    E: 5, N: 5, W: 5, F: 6, O: 6, X: 6, G: 7, P: 7, Y: 7, H: 8, Q: 8, Z: 8,
    I: 9, R: 9
  }

  const CHALDEAN_MAP = {
    A: 1, I: 1, J: 1, Q: 1, Y: 1, B: 2, K: 2, R: 2, C: 3, G: 3, L: 3, S: 3,
    D: 4, M: 4, T: 4, E: 5, H: 5, N: 5, X: 5, U: 6, V: 6, W: 6, O: 7, Z: 7,
    F: 8, P: 8
  }

  const VOWELS_STANDARD = ['A', 'E', 'I', 'O', 'U']
  const MASTER_NUMBERS = [11, 22, 33]

  const NUMBER_TRAITS = {
    1: { archetype: "Pioneer / Leader", Fame: 4, Wealth: 4, Luck: 3, Health: 2, Speed: 5 },
    2: { archetype: "Diplomat / Peacemaker", Fame: 2, Wealth: 2, Luck: 4, Health: 3, Speed: 2 },
    3: { archetype: "Creator / Performer", Fame: 5, Wealth: 3, Luck: 4, Health: 2, Speed: 4 },
    4: { archetype: "Builder / Strategist", Fame: 2, Wealth: 4, Luck: 1, Health: 4, Speed: 1 },
    5: { archetype: "Opportunist / Explorer", Fame: 4, Wealth: 4, Luck: 5, Health: 1, Speed: 5 },
    6: { archetype: "Magnet / Healer", Fame: 4, Wealth: 5, Luck: 3, Health: 3, Speed: 3 },
    7: { archetype: "Mystic / Analyst", Fame: 2, Wealth: 2, Luck: 2, Health: 4, Speed: 1 },
    8: { archetype: "Power / Executive", Fame: 3, Wealth: 5, Luck: 2, Health: 2, Speed: 2 },
    9: { archetype: "Warrior / Visionary", Fame: 4, Wealth: 2, Luck: 3, Health: 1, Speed: 3 }
  }

  const TIMING_ANALYSIS = {
    1: "Early Success (before 30). Natural leadership abilities manifest quickly.",
    5: "Early Success (before 30). Dynamic energy creates rapid opportunities.",
    8: "Mid-Life Wealth (35–45). Executive power peaks in maturity.",
    7: "Delayed Fame / Lasting Legacy. Deep wisdom develops over time.",
    2: "Collaborative Timing. Success through partnerships and cooperation.",
    3: "Creative Flow Timing. Artistic and expressive talents shine through.",
    4: "Methodical Timing. Steady building creates lasting foundations.",
    6: "Service Timing. Healing and nurturing abilities guide the path.",
    9: "Humanitarian Timing. Visionary leadership serves the greater good.",
    11: "Master Intuition Timing. Spiritual insights guide major decisions.",
    22: "Master Builder Timing. Large-scale manifestation abilities.",
    33: "Master Teacher Timing. Wisdom and guidance for humanity."
  }

  const reduceNumber = (num) => {
    if (num === null || isNaN(num) || num === 0) return null
    let current = num
    if (MASTER_NUMBERS.includes(current)) return current
    
    while (current > 9) {
      let sum = current.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0)
      if (MASTER_NUMBERS.includes(sum) && sum !== current) return sum
      current = sum
    }
    return current
  }

  const isVowel = (char, string, index) => {
    if (VOWELS_STANDARD.includes(char)) return true
    if (char === 'Y') {
      const prevVowel = index > 0 ? VOWELS_STANDARD.includes(string[index - 1]) : false
      const nextVowel = index < string.length - 1 ? VOWELS_STANDARD.includes(string[index + 1]) : false
      if (!prevVowel && !nextVowel) return true
      if (index === string.length - 1 && !prevVowel) return true
      if (index === 0 && !nextVowel) return true
    }
    return false
  }

  const reduceLifePathComponent = (num) => {
    let sum = num
    while (sum > 9 && ![11, 22, 33].includes(sum)) {
      sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0)
    }
    return sum
  }

  const calculateLifePath = (dateStr) => {
    if (!dateStr) return null
    const [year, month, day] = dateStr.split('-').map(v => parseInt(v))
    if ([year, month, day].some(isNaN)) return null
    return reduceNumber(reduceLifePathComponent(month) + reduceLifePathComponent(day) + reduceLifePathComponent(year))
  }

  const calculateMulank = (dateStr) => {
    if (!dateStr) return null
    const day = parseInt(dateStr.split('-')[2])
    if (isNaN(day)) return null
    return reduceLifePathComponent(day)
  }

  const getCompositeScores = (pythagorean, chaldean) => {
    const pythTraits = NUMBER_TRAITS[pythagorean] || {}
    const chalTraits = NUMBER_TRAITS[chaldean] || {}
    const metrics = ['Fame', 'Wealth', 'Luck', 'Health', 'Speed']
    const output = {}

    for (const metric of metrics) {
      const average = ((pythTraits[metric] || 0) + (chalTraits[metric] || 0)) / 2
      output[metric.toLowerCase()] = {
        stars: average,
        percent: average * 20
      }
    }
    return output
  }

  const performCalculation = (rawName, dateStr) => {
    const name = rawName.trim()
    const lifePath = calculateLifePath(dateStr)
    const mulank = calculateMulank(dateStr)
    
    if (!name && lifePath === null) return null

    let pythagoreanTotal = 0
    let chaldeanTotal = 0
    let vowelSum = 0
    let consonantSum = 0
    let destiny = null
    let soul = null
    let dream = null
    let power = null
    let composite = null

    if (name) {
      const cleaned = name.toUpperCase().replace(/[^A-Z]/g, '')
      
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i]
        const pythValue = PYTHAGOREAN_MAP[char] || 0
        const chalValue = CHALDEAN_MAP[char] || 0
        
        pythagoreanTotal += pythValue
        chaldeanTotal += chalValue
        
        if (isVowel(char, cleaned, i)) {
          vowelSum += pythValue
        } else {
          consonantSum += pythValue
        }
      }

      destiny = reduceNumber(pythagoreanTotal)
      soul = reduceNumber(vowelSum)
      dream = reduceNumber(consonantSum)
      
      if (lifePath !== null && destiny !== null) {
        power = reduceNumber(lifePath + destiny)
      }
      
      const chaldeanReduced = reduceNumber(chaldeanTotal)
      if (destiny !== null && chaldeanReduced !== null) {
        composite = getCompositeScores(destiny, chaldeanReduced)
      }
    }

    return {
      id: Date.now(),
      name,
      dob: dateStr,
      pythagoreanTotal,
      pythagoreanReduced: reduceNumber(pythagoreanTotal),
      chaldeanTotal,
      chaldeanReduced: reduceNumber(chaldeanTotal),
      destiny,
      soulUrge: soul,
      dream,
      powerNumber: power,
      lifePath,
      mulank,
      composite
    }
  }

  const calculateAndDisplay = () => {
    const res = performCalculation(fullName, birthDate)
    setResult(res)
  }

  const saveCurrentResult = () => {
    if (result && result.lifePath !== null && result.destiny !== null) {
      const newHistory = [result, ...history.filter(item => 
        `${item.name.toUpperCase()}-${item.dob}` !== `${result.name.toUpperCase()}-${result.dob}`
      )].slice(0, 10)
      
      setHistory(newHistory)
      localStorage.setItem('numerology_history_v2', JSON.stringify(newHistory))
    }
  }

  const deleteHistoryItem = (id) => {
    const newHistory = history.filter(item => item.id !== id)
    setHistory(newHistory)
    localStorage.setItem('numerology_history_v2', JSON.stringify(newHistory))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('numerology_history_v2')
  }

  useEffect(() => {
    calculateAndDisplay()
  }, [fullName, birthDate])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('numerology_history_v2')
      if (saved) {
        setHistory(JSON.parse(saved))
      }
    } catch (e) {
      console.warn('Failed to load history:', e)
    }
  }, [])

  const canSave = result && result.destiny !== null && result.lifePath !== null && result.composite !== null

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-8 md:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-8">
            Universal Numerology Analyzer
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600 max-w-4xl mx-auto px-4">
            Composite Scoring System: Inner Engine (Pythagorean) × Outer Vehicle (Chaldean)
          </p>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:gap-12 items-start">
          {/* CENTERED FORM - Smaller width */}
          <div className="flex justify-center mb-8 lg:mb-12">
            <div className="w-full max-w-xs sm:max-w-sm">
              <Card className="p-4 sm:p-6 lg:p-8">
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label htmlFor="fullName" className="block text-lg sm:text-xl lg:text-2xl font-bold text-gray-700 mb-2 sm:mb-3">
                      Full Birth Name:
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="e.g., Emily Ann Brown"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-lg sm:text-xl lg:text-2xl h-12 sm:h-14 lg:h-16"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="birthDate" className="block text-lg sm:text-xl lg:text-2xl font-bold text-gray-700 mb-2 sm:mb-3">
                      Date of Birth (Required for Life Path & Timing):
                    </label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="text-lg sm:text-xl lg:text-2xl h-12 sm:h-14 lg:h-16"
                    />
                  </div>
                  
                  <Button
                    onClick={saveCurrentResult}
                    disabled={!canSave}
                    className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-semibold"
                    size="lg"
                  >
                    Save Calculation to History
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <main className="space-y-8 sm:space-y-12 lg:space-y-16">
            {/* Outer Vehicle Section - Horizontal Row Format */}
            <section className="space-y-6 sm:space-y-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 border-b pb-4 mb-6 sm:mb-8 text-center">
                Outer Vehicle: Chaldean Vibration & Manifestation
              </h2>
              <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:gap-10 xl:gap-12">
                <Card className="p-6 sm:p-8 lg:p-10 hover:shadow-2xl transition-shadow duration-300 border-2">
                  <CardContent className="p-0 text-center">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">
                      Pythagorean Total (Raw = Reduced)
                    </p>
                    <p className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-800 mb-3 sm:mb-4">
                      {result?.pythagoreanTotal ? `${result.pythagoreanTotal} = ${result.pythagoreanReduced}` : '-'}
                    </p>
                    <p className="text-base sm:text-lg lg:text-xl text-gray-500">
                      Raw sum and its reduced digit used for Destiny.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="p-6 sm:p-8 lg:p-10 hover:shadow-2xl transition-shadow duration-300 border-2">
                  <CardContent className="p-0 text-center">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 uppercase tracking-wider mb-3 sm:mb-4">
                      Chaldean Total (Raw = Reduced)
                    </p>
                    <p className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-800 mb-3 sm:mb-4">
                      {result?.chaldeanTotal ? `${result.chaldeanTotal} = ${result.chaldeanReduced}` : '-'}
                    </p>
                    <p className="text-base sm:text-lg lg:text-xl text-gray-500">
                      Esoteric vibration used in composite scoring.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Inner Engine Section */}
            <section className="space-y-6 sm:space-y-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 border-b pb-4 mb-6 sm:mb-8 text-center">
                Inner Engine (Pythagorean): Purpose & Psychology
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
                <Card className="p-8 sm:p-10 lg:p-12 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2">
                  <CardContent className="p-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 uppercase tracking-wider mb-4 sm:mb-6">
                      Destiny / Expression (#1)
                    </p>
                    <div className={`text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-4 sm:mb-6 text-blue-700 ${MASTER_NUMBERS.includes(result?.destiny) ? 'text-red-500' : ''}`}>
                      {result?.destiny || '-'}
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-500">
                      Life purpose, public path (Pythagorean total reduced).
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="p-8 sm:p-10 lg:p-12 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2">
                  <CardContent className="p-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 uppercase tracking-wider mb-4 sm:mb-6">
                      Soul Urge / Heart's Desire (#2)
                    </p>
                    <div className={`text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-4 sm:mb-6 text-green-700 ${MASTER_NUMBERS.includes(result?.soulUrge) ? 'text-red-500' : ''}`}>
                      {result?.soulUrge || '-'}
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-500">
                      Innermost desires (Vowels only).
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="p-8 sm:p-10 lg:p-12 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2">
                  <CardContent className="p-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-teal-600 uppercase tracking-wider mb-4 sm:mb-6">
                      Personality / Dream (#3)
                    </p>
                    <div className={`text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-4 sm:mb-6 text-teal-700 ${MASTER_NUMBERS.includes(result?.dream) ? 'text-red-500' : ''}`}>
                      {result?.dream || '-'}
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-500">
                      Outer impression (Consonants only).
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Timing Section */}
            <section className="space-y-6 sm:space-y-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 border-b pb-4 mb-6 sm:mb-8 text-center">
                Timing & Karmic Script (DOB & Composite)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
                <Card className="p-8 sm:p-10 lg:p-12 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2">
                  <CardContent className="p-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 uppercase tracking-wider mb-4 sm:mb-6">
                      Power Number (#4)
                    </p>
                    <div className={`text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-4 sm:mb-6 text-red-700 ${MASTER_NUMBERS.includes(result?.powerNumber) ? 'text-red-500' : ''}`}>
                      {result?.powerNumber || '-'}
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-500">
                      Activation Frequency (Life Path + Destiny).
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="p-8 sm:p-10 lg:p-12 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2">
                  <CardContent className="p-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 uppercase tracking-wider mb-4 sm:mb-6">
                      Life Path (#5)
                    </p>
                    <div className={`text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-4 sm:mb-6 text-orange-700 ${MASTER_NUMBERS.includes(result?.lifePath) ? 'text-red-500' : ''}`}>
                      {result?.lifePath || '-'}
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-500">
                      Unchangeable karmic script and timing modifier.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="p-8 sm:p-10 lg:p-12 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2">
                  <CardContent className="p-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 uppercase tracking-wider mb-4 sm:mb-6">
                      Day Number (Mulank - #6)
                    </p>
                    <div className={`text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-4 sm:mb-6 text-purple-700 ${MASTER_NUMBERS.includes(result?.mulank) ? 'text-red-500' : ''}`}>
                      {result?.mulank || '-'}
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-500">
                      Innate, core daily characteristics.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Composite Scoring */}
            {canSave && (
              <section className="space-y-6 sm:space-y-8">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 border-b pb-3">
                  Composite Performance Scoring (Inner Engine × Outer Vehicle)
                </h2>
                
                <Card className="p-4 sm:p-6 lg:p-8 border-l-4 border-green-500 bg-green-50">
                  <CardContent className="p-0">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                      Composite Index Summary
                    </h3>
                    <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-4 sm:mb-6 font-medium italic">
                      Pythagorean Engine: <strong className="text-blue-600">{result?.destiny} ({NUMBER_TRAITS[result?.destiny]?.archetype || '-'})</strong> |
                      Chaldean Vehicle: <strong className="text-yellow-600">{result?.chaldeanReduced} ({NUMBER_TRAITS[result?.chaldeanReduced]?.archetype || '-'})</strong>
                    </p>
                    
                    {result?.composite && (
                      <div className="space-y-4 sm:space-y-6">
                        {Object.entries(result.composite).map(([key, data]) => (
                          <div key={key} className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center space-x-4">
                              <span className="font-semibold text-gray-700 text-lg sm:text-xl lg:text-2xl capitalize min-w-0">
                                {key} Index:
                              </span>
                              <span className="text-yellow-500 text-xl sm:text-2xl lg:text-3xl">
                                {'★'.repeat(Math.round(data.stars))}
                              </span>
                            </div>
                            <span className="font-bold text-gray-800 text-xl sm:text-2xl lg:text-3xl">
                              {data.percent.toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timing Analysis */}
                {result?.lifePath && (
                  <Card className="p-4 sm:p-6 lg:p-8 bg-blue-50 border-l-4 border-blue-500">
                    <CardContent className="p-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                        Timing Analysis (Life Path Modifier)
                      </h3>
                      <div className="space-y-4 sm:space-y-6">
                        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                          {TIMING_ANALYSIS[result.lifePath] || "General Life Path timing suggests a steady pace of development."}
                        </p>
                        {result.powerNumber && (
                          <div className="bg-white p-3 sm:p-4 rounded-lg border border-blue-200">
                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                              Your <strong className="text-blue-600">Power Number is {result.powerNumber}</strong>{' '}
                              {(result.powerNumber === 1 || result.powerNumber === 5) 
                                ? <span className="text-green-600 font-medium">(High Activation). This accelerates your Life Path's potential.</span>
                                : <span className="text-orange-600 font-medium">(Steady Activation). Expect compounding results with patience.</span>
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </section>
            )}

            {/* History Section */}
            <section className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-3">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800">
                  Calculation History (12-Point Comparison)
                </h2>
                {history.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearHistory}
                    className="text-base sm:text-lg lg:text-xl"
                  >
                    Clear History
                  </Button>
                )}
              </div>
              
              <Card className="p-2 sm:p-4 lg:p-6">
                {history.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calculator className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 italic text-base sm:text-lg lg:text-xl">
                      No calculation history yet. Save your first calculation to start building your numerology profile.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <div className="min-w-[800px] sm:min-w-full">
                      <table className="w-full bg-white rounded-lg shadow-inner">
                        <thead>
                          <tr className="bg-gray-100 text-gray-600 uppercase text-sm sm:text-base lg:text-lg leading-normal">
                            <th className="py-3 px-2 sm:px-3 text-left sticky left-0 bg-gray-100 min-w-[120px] sm:min-w-[150px] z-10">
                              Name / DOB
                            </th>
                            <th className="py-3 px-1 sm:px-2 text-center text-blue-600 font-bold min-w-[40px]">#1</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-green-600 font-bold min-w-[40px]">#2</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-teal-600 font-bold min-w-[40px]">#3</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-red-600 font-bold min-w-[40px]">#4</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-orange-600 font-bold min-w-[40px]">#5</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-purple-600 font-bold min-w-[40px]">#6</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-yellow-600 font-bold min-w-[40px]">#7</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-red-700 font-bold min-w-[50px] sm:min-w-[70px]">Fame</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-yellow-700 font-bold min-w-[50px] sm:min-w-[70px]">Wealth</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-blue-700 font-bold min-w-[50px] sm:min-w-[70px]">Luck</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-green-700 font-bold min-w-[50px] sm:min-w-[70px]">Health</th>
                            <th className="py-3 px-1 sm:px-2 text-center text-indigo-700 font-bold min-w-[50px] sm:min-w-[70px]">Speed</th>
                            <th className="py-3 px-1 sm:px-2 text-center sticky right-0 bg-gray-100 min-w-[40px] z-10"></th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm sm:text-base lg:text-lg">
                          {history.map((item) => (
                            <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 sm:px-3 text-left font-semibold text-gray-800 sticky left-0 bg-white z-10">
                                <div className="whitespace-nowrap">
                                  <div className="font-medium text-sm sm:text-base lg:text-lg">
                                    {item.name.length > 15 ? item.name.slice(0, 12) + '...' : item.name}
                                  </div>
                                  <div className="text-sm sm:text-base text-gray-400">
                                    {item.dob ? item.dob.slice(5) : 'N/A'}
                                  </div>
                                </div>
                              </td>
                              <td className={`py-3 px-1 sm:px-2 text-center ${MASTER_NUMBERS.includes(item.destiny) ? 'font-bold text-red-500' : 'font-medium'}`}>
                                {item.destiny || '-'}
                              </td>
                              <td className={`py-3 px-1 sm:px-2 text-center ${MASTER_NUMBERS.includes(item.soulUrge) ? 'font-bold text-red-500' : 'font-medium'}`}>
                                {item.soulUrge || '-'}
                              </td>
                              <td className={`py-3 px-1 sm:px-2 text-center ${MASTER_NUMBERS.includes(item.dream) ? 'font-bold text-red-500' : 'font-medium'}`}>
                                {item.dream || '-'}
                              </td>
                              <td className={`py-3 px-1 sm:px-2 text-center ${MASTER_NUMBERS.includes(item.powerNumber) ? 'font-bold text-red-500' : 'font-medium'}`}>
                                {item.powerNumber || '-'}
                              </td>
                              <td className={`py-3 px-1 sm:px-2 text-center ${MASTER_NUMBERS.includes(item.lifePath) ? 'font-bold text-red-500' : 'font-medium'}`}>
                                {item.lifePath || '-'}
                              </td>
                              <td className={`py-3 px-1 sm:px-2 text-center ${MASTER_NUMBERS.includes(item.mulank) ? 'font-bold text-red-500' : 'font-medium'}`}>
                                {item.mulank || '-'}
                              </td>
                              <td className={`py-3 px-1 sm:px-2 text-center ${MASTER_NUMBERS.includes(item.chaldeanReduced) ? 'font-bold text-red-500' : 'font-medium'}`}>
                                {item.chaldeanReduced || '-'}
                              </td>
                              <td className="py-3 px-1 sm:px-2 text-center text-xs font-semibold">
                                {item.composite?.fame?.percent?.toFixed(0) || 0}%
                              </td>
                              <td className="py-3 px-1 sm:px-2 text-center text-xs font-semibold">
                                {item.composite?.wealth?.percent?.toFixed(0) || 0}%
                              </td>
                              <td className="py-3 px-1 sm:px-2 text-center text-xs font-semibold">
                                {item.composite?.luck?.percent?.toFixed(0) || 0}%
                              </td>
                              <td className="py-3 px-1 sm:px-2 text-center text-xs font-semibold">
                                {item.composite?.health?.percent?.toFixed(0) || 0}%
                              </td>
                              <td className="py-3 px-1 sm:px-2 text-center text-xs font-semibold">
                                {item.composite?.speed?.percent?.toFixed(0) || 0}%
                              </td>
                              <td className="py-3 px-1 sm:px-2 text-center sticky right-0 bg-white z-10">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteHistoryItem(item.id)}
                                  className="text-red-400 hover:text-red-600 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </section>

            {/* System Charts */}
            <section className="space-y-4 sm:space-y-6">
              <Card className="p-4 sm:p-6 lg:p-8">
                <CardContent className="p-0 space-y-4 sm:space-y-6">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 border-b pb-3">
                    Understanding the Core Systems
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 italic leading-relaxed">
                    The <strong className="text-blue-600">Pythagorean System</strong> (Inner Self) is used for Destiny, Soul Urge, and Dream.
                    The <strong className="text-yellow-600">Chaldean System</strong> (Outer Manifestation) is used for material reality and timing influence.
                  </p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-700">
                        Pythagorean Chart (Inner Self)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr>
                              {[1,2,3,4,5,6,7,8,9].map(num => (
                                <th key={num} className="border border-gray-300 bg-blue-50 p-2 sm:p-3 text-center font-bold text-blue-700">
                                  {num}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {['A','B','C','D','E','F','G','H','I'].map(letter => (
                                <td key={letter} className="border border-gray-300 p-2 sm:p-3 text-center font-medium">
                                  {letter}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              {['J','K','L','M','N','O','P','Q','R'].map(letter => (
                                <td key={letter} className="border border-gray-300 p-2 sm:p-3 text-center font-medium">
                                  {letter}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              {['S','T','U','V','W','X','Y','Z',''].map(letter => (
                                <td key={letter} className="border border-gray-300 p-2 sm:p-3 text-center font-medium">
                                  {letter}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-yellow-700">
                        Chaldean Chart (Outer Manifestation)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr>
                              {[1,2,3,4,5,6,7,8].map(num => (
                                <th key={num} className="border border-gray-300 bg-yellow-50 p-2 sm:p-3 text-center font-bold text-yellow-700">
                                  {num}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">A, I, J, Q, Y</td>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">B, K, R</td>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">C, G, L, S</td>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">D, M, T</td>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">E, H, N, X</td>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">U, V, W</td>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">O, Z</td>
                              <td className="border border-gray-300 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">F, P</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <footer className="text-center text-xs sm:text-sm text-gray-500 pt-4 sm:pt-6">
              <p className="leading-relaxed max-w-4xl mx-auto">
                12-Point Analysis Summary (history): 1-Destiny, 2-Soul Urge, 3-Dream, 4-Power, 5-Life Path, 
                6-Mulank, 7-Chaldean Reduced, 8-Fame, 9-Wealth, 10-Luck, 11-Health, 12-Speed.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}