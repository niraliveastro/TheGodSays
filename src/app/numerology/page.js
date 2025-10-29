'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Calculator,
  User,
  Calendar,
  Save,
  Trash2
} from 'lucide-react'
import './numerology.css'

export default function NumerologyPage() {
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [history, setHistory] = useState([])

  // Numerology data constants
  const PYTHAGOREAN_MAP = {
    A:1, J:1, S:1, B:2, K:2, T:2, C:3, L:3, U:3, D:4, M:4, V:4,
    E:5, N:5, W:5, F:6, O:6, X:6, G:7, P:7, Y:7, H:8, Q:8, Z:8, I:9, R:9
  }

  const CHALDEAN_MAP = {
    A:1, I:1, J:1, Q:1, Y:1, B:2, K:2, R:2, C:3, G:3, L:3, S:3,
    D:4, M:4, T:4, E:5, H:5, N:5, X:5, U:6, V:6, W:6, O:7, Z:7, F:8, P:8
  }

  const VOWELS_STANDARD = ['A', 'E', 'I', 'O', 'U']
  const MASTER_NUMBERS = [11, 22, 33]
  const NUMEROLOGY_HISTORY_KEY = 'numerology_history_v2'

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
    1: "Early Success (before 30). Strong leadership presence opens doors quickly.",
    5: "Early Success (before 30). Adaptability creates opportunities early.",
    8: "Mid-Life Wealth (35–45). Material success peaks during prime years.",
    7: "Delayed Fame / Lasting Legacy. Recognition comes later but endures.",
    2: "Collaborative Timing. Success through partnerships and relationships.",
    3: "Creative Flow Timing. Artistic and expressive talents flourish.",
    4: "Methodical Timing. Steady progress with consistent effort.",
    6: "Service Timing. Fulfillment through helping others.",
    9: "Humanitarian Timing. Impact through service to humanity.",
    11: "Master Intuition Timing. Spiritual insights guide success.",
    22: "Master Builder Timing. Large-scale projects and lasting impact.",
    33: "Master Teacher Timing. Wisdom and guidance for others."
  }

  // Helper functions
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

  const isVowel = (char, str, index) => {
    if (VOWELS_STANDARD.includes(char)) return true
    if (char === 'Y') {
      const prevVowel = index > 0 ? VOWELS_STANDARD.includes(str[index - 1]) : false
      const nextVowel = index < str.length - 1 ? VOWELS_STANDARD.includes(str[index + 1]) : false
      if (!prevVowel && !nextVowel) return true
      if (index === str.length - 1 && !prevVowel) return true
      if (index === 0 && !nextVowel) return true
    }
    return false
  }

  const reduceLifePathComponent = (n) => {
    let sum = n
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

  // Main calculation function
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

  // Calculate results whenever inputs change
  const results = useMemo(() => {
    return performCalculation(fullName, birthDate) || {}
  }, [fullName, birthDate])

  // History management
  const getHistory = () => {
    try {
      const stored = localStorage.getItem(NUMEROLOGY_HISTORY_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      return []
    }
  }

  const saveToHistory = (result) => {
    let currentHistory = getHistory()
    const key = `${result.name.toUpperCase()}-${result.dob}`
    currentHistory = currentHistory.filter(item => `${item.name.toUpperCase()}-${item.dob}` !== key)
    currentHistory.unshift(result)
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(0, 10)
    localStorage.setItem(NUMEROLOGY_HISTORY_KEY, JSON.stringify(currentHistory))
    setHistory(currentHistory)
  }

  const saveCurrentResult = () => {
    if (results && results.lifePath !== null && results.destiny !== null) {
      saveToHistory(results)
    }
  }

  const deleteHistoryItem = (id) => {
    const updated = history.filter(item => item.id !== id)
    localStorage.setItem(NUMEROLOGY_HISTORY_KEY, JSON.stringify(updated))
    setHistory(updated)
  }

  const clearHistory = () => {
    localStorage.removeItem(NUMEROLOGY_HISTORY_KEY)
    setHistory([])
  }

  // Load history on component mount
  useEffect(() => {
    setHistory(getHistory())
  }, [])

  // Check if save button should be enabled
  const canSave = results && results.destiny !== null && results.lifePath !== null && results.composite !== null

  // Helper function to render detail rows
  const renderDetailRow = (label, data) => {
    if (!data) return null
    
    return (
      <div key={label} className="detail-item">
        <span className="detail-label">{label}:</span>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{width: `${data.percent}%`}}
          ></div>
        </div>
        <span className="detail-percent">{data.percent.toFixed(0)}%</span>
      </div>
    )
  }

  return (
    <div className="numerology-container">
      <div className="numerology-content">
        {/* Header */}
        <header className="numerology-header">
          <h1 className="numerology-title">
            Universal Numerology Analyzer
          </h1>
          <p className="numerology-subtitle">
            Composite Scoring System: Inner Engine (Pythagorean) × Outer Vehicle (Chaldean)
          </p>
        </header>

        {/* Two Column Layout: Form (65%) + Outer Vehicle (35%) */}
        <div className="two-column-layout">
          {/* LEFT COLUMN - Form Section (65%) */}
          <div className="left-column-form">
            <div className="form-container">
              <div className="form-wrapper">
                <div className="form-card">
                  {/* Form Header */}
                  <div className="form-header">
                    <div className="form-icon-circle">
                      <Calculator className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="form-header-title">Enter Your Details</h3>
                  </div>

              {/* Full Name Input */}
              <div className="input-group">
                <label htmlFor="fullName" className="input-label">
                  <User className="w-4 h-4 input-label-icon" style={{color: '#d97706'}} />
                  Full Birth Name
                  <span className="required-badge">*Required</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g., Emily Ann Brown"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                />
              </div>
              
              {/* Date of Birth Input */}
              <div className="input-group">
                <label htmlFor="birthDate" className="input-label">
                  <Calendar className="w-4 h-4 input-label-icon" style={{color: '#9333ea'}} />
                  Date of Birth
                  <span className="required-badge">*Required</span>
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="input-field date-input"
                />
                <p className="input-hint">Required for Life Path & Timing analysis</p>
              </div>
              
              {/* Save Button */}
              <button
                onClick={saveCurrentResult}
                disabled={!canSave}
                className="save-button"
              >
                <Save className="w-5 h-5" />
                Save to History
              </button>
              
              {/* Info Text */}
              <div className="info-box">
                <p className="info-text">
                  💡 Your calculation will be saved in the history table below
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End LEFT COLUMN */}

      {/* RIGHT COLUMN - Outer Vehicle Section (35%) */}
      <div className="right-column-outer-vehicle">
        <section className="results-section outer-vehicle-section">
          <h2 className="section-title outer-vehicle">
            Outer Vehicle: Chaldean Vibration & Manifestation
          </h2>
          <div className="grid-2-vertical">
            <div className="result-card blue center">
              <p className="card-label text-blue-600">
                Pythagorean Total (Raw = Reduced)
              </p>
              <p className="card-value text-blue-700">
                {results.pythagoreanTotal ? `${results.pythagoreanTotal} = ${results.pythagoreanReduced}` : '-'}
              </p>
              <p className="card-description">
                Raw sum and its reduced digit used for Destiny.
              </p>
            </div>
            <div className="result-card yellow center">
              <p className="card-label text-yellow-600">
                Chaldean Total (Raw = Reduced)
              </p>
              <p className="card-value text-yellow-700">
                {results.chaldeanTotal ? `${results.chaldeanTotal} = ${results.chaldeanReduced}` : '-'}
              </p>
              <p className="card-description">
                Esoteric vibration used in composite scoring.
              </p>
            </div>
          </div>
        </section>
      </div>
      {/* End RIGHT COLUMN */}
    </div>
    {/* End Two Column Layout */}

        {/* Results Section - Full Width Below */}
        <div className="space-y-12">
          {/* Inner Engine */}
          <section className="results-section">
              <h2 className="section-title inner-engine">
                Inner Engine (Pythagorean): Purpose & Psychology
              </h2>
              <div className="grid-3">
                <div className="result-card blue center">
                  <p className="card-label text-blue-600">
                    Destiny / Expression (#1)
                  </p>
                  <div className={`card-value ${MASTER_NUMBERS.includes(results.destiny) ? 'master' : 'text-blue-700'}`}>
                    {results.destiny || '-'}
                  </div>
                  <p className="card-description">
                    Life purpose, public path (Pythagorean total reduced).
                  </p>
                </div>
                
                <div className="result-card green center">
                  <p className="card-label text-green-600">
                    Soul Urge / Heart's Desire (#2)
                  </p>
                  <div className={`card-value ${MASTER_NUMBERS.includes(results.soulUrge) ? 'master' : 'text-green-700'}`}>
                    {results.soulUrge || '-'}
                  </div>
                  <p className="card-description">
                    Innermost desires (Vowels only).
                  </p>
                </div>
                
                <div className="result-card teal center">
                  <p className="card-label text-teal-600">
                    Personality / Dream (#3)
                  </p>
                  <div className={`card-value ${MASTER_NUMBERS.includes(results.dream) ? 'master' : 'text-teal-700'}`}>
                    {results.dream || '-'}
                  </div>
                  <p className="card-description">
                    Outer impression (Consonants only).
                  </p>
                </div>
              </div>
            </section>

            {/* 3) Timing */}
            <section className="results-section">
              <h2 className="section-title timing">
                Timing & Karmic Script (DOB & Composite)
              </h2>
              <div className="grid-3">
                <div className="result-card red center">
                  <p className="card-label text-red-600">
                    Power Number (#4)
                  </p>
                  <div className={`card-value ${MASTER_NUMBERS.includes(results.powerNumber) ? 'master' : 'text-red-700'}`}>
                    {results.powerNumber || '-'}
                  </div>
                  <p className="card-description">
                    Activation Frequency (Life Path + Destiny).
                  </p>
                </div>
                
                <div className="result-card orange center">
                  <p className="card-label text-orange-600">
                    Life Path (#5)
                  </p>
                  <div className={`card-value ${MASTER_NUMBERS.includes(results.lifePath) ? 'master' : 'text-orange-700'}`}>
                    {results.lifePath || '-'}
                  </div>
                  <p className="card-description">
                    Unchangeable karmic script and timing modifier.
                  </p>
                </div>
                
                <div className="result-card purple center">
                  <p className="card-label text-purple-600">
                    Day Number (Mulank - #6)
                  </p>
                  <div className={`card-value ${MASTER_NUMBERS.includes(results.mulank) ? 'master' : 'text-purple-700'}`}>
                    {results.mulank || '-'}
                  </div>
                  <p className="card-description">
                    Innate, core daily characteristics.
                  </p>
                </div>
              </div>
            </section>

            {/* Composite Scoring */}
            {canSave && (
              <section className="results-section">
                <h2 className="section-title composite">
                  Composite Performance Scoring (Inner Engine × Outer Vehicle)
                </h2>
                
                <div className="composite-card">
                  <h3 className="composite-title">Composite Index Summary</h3>
                  <p className="composite-subtitle">
                    Pythagorean Engine: <strong>{results.destiny} ({(NUMBER_TRAITS[results.destiny] || {}).archetype || '-'})</strong> |
                    Chaldean Vehicle: <strong>{results.chaldeanReduced} ({(NUMBER_TRAITS[results.chaldeanReduced] || {}).archetype || '-'})</strong>
                  </p>
                  <div className="space-y-2 text-sm">
                    {results.composite && (
                      <>
                        {renderDetailRow('Fame Index', results.composite.fame)}
                        {renderDetailRow('Wealth Index', results.composite.wealth)}
                        {renderDetailRow('Luck Index', results.composite.luck)}
                        {renderDetailRow('Health Index', results.composite.health)}
                        {renderDetailRow('Speed Index', results.composite.speed)}
                      </>
                    )}
                  </div>
                </div>

                {/* Timing Analysis */}
                {results.lifePath !== null && results.powerNumber !== null && (
                  <div className="timing-card" style={{marginTop: '2rem'}}>
                    <h3 className="timing-title">Timing Analysis (Life Path Modifier)</h3>
                    <div className="timing-content">
                      <p>{TIMING_ANALYSIS[results.lifePath] || "General Life Path timing suggests a steady pace of development."}</p>
                      <p style={{marginTop: '1rem'}}>
                        Your <strong>Power Number is {results.powerNumber}</strong> {(results.powerNumber === 1 || results.powerNumber === 5) 
                          ? "(High Activation). This accelerates your Life Path's potential." 
                          : "(Steady Activation). Expect compounding results with patience."}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* History */}
            <section className="results-section">
              <div className="history-header">
                <h2 className="section-title history" style={{border: 'none', padding: 0, margin: 0}}>Calculation History (12-Point Comparison)</h2>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="clear-history-btn"
                  >
                    Clear History
                  </button>
                )}
              </div>
              
              <div className="history-card">
                {history.length === 0 ? (
                  <p className="history-empty">No calculation history yet.</p>
                ) : (
                  <div className="history-table-container">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Name / DOB</th>
                          <th className="text-blue-600">#1</th>
                          <th className="text-green-600">#2</th>
                          <th className="text-teal-600">#3</th>
                          <th className="text-red-600">#4</th>
                          <th className="text-orange-600">#5</th>
                          <th className="text-purple-600">#6</th>
                          <th className="text-yellow-600">#7</th>
                          <th className="text-red-700">Fame</th>
                          <th className="text-yellow-700">Wealth</th>
                          <th className="text-blue-700">Luck</th>
                          <th className="text-green-700">Health</th>
                          <th className="text-indigo-700">Speed</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => {
                          const displayName = item.name.length > 20 ? item.name.slice(0, 17) + '...' : item.name
                          const displayDob = item.dob ? item.dob.slice(5) : 'N/A'
                          const metrics = item.composite || {
                            fame: { percent: 0 },
                            wealth: { percent: 0 },
                            luck: { percent: 0 },
                            health: { percent: 0 },
                            speed: { percent: 0 }
                          }
                          
                          return (
                            <tr key={item.id}>
                              <td title={`${item.name} (${item.dob || 'N/A'})`}>
                                <span className="history-name">{displayName}</span>
                                <span className="history-dob">{displayDob}</span>
                              </td>
                              <td className={MASTER_NUMBERS.includes(item.destiny) ? 'font-bold text-red-600' : ''}>
                                {item.destiny || '-'}
                              </td>
                              <td className={MASTER_NUMBERS.includes(item.soulUrge) ? 'font-bold text-red-600' : ''}>
                                {item.soulUrge || '-'}
                              </td>
                              <td className={MASTER_NUMBERS.includes(item.dream) ? 'font-bold text-red-600' : ''}>
                                {item.dream || '-'}
                              </td>
                              <td className={MASTER_NUMBERS.includes(item.powerNumber) ? 'font-bold text-red-600' : ''}>
                                {item.powerNumber || '-'}
                              </td>
                              <td className={MASTER_NUMBERS.includes(item.lifePath) ? 'font-bold text-red-600' : ''}>
                                {item.lifePath || '-'}
                              </td>
                              <td className={MASTER_NUMBERS.includes(item.mulank) ? 'font-bold text-red-600' : ''}>
                                {item.mulank || '-'}
                              </td>
                              <td className={MASTER_NUMBERS.includes(item.chaldeanReduced) ? 'font-bold text-red-600' : ''}>
                                {item.chaldeanReduced || '-'}
                              </td>
                              <td className="font-semibold">{metrics.fame.percent.toFixed(0)}%</td>
                              <td className="font-semibold">{metrics.wealth.percent.toFixed(0)}%</td>
                              <td className="font-semibold">{metrics.luck.percent.toFixed(0)}%</td>
                              <td className="font-semibold">{metrics.health.percent.toFixed(0)}%</td>
                              <td className="font-semibold">{metrics.speed.percent.toFixed(0)}%</td>
                              <td>
                                <button
                                  onClick={() => deleteHistoryItem(item.id)}
                                  className="delete-btn"
                                  aria-label={`Delete ${item.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* System Charts */}
            <section className="system-charts-card">
              <h2 className="system-charts-title">
                Understanding the Core Systems
              </h2>
              <p className="system-charts-description">
                The <strong>Pythagorean System</strong> (Inner Self) is used for Destiny, Soul Urge, and Dream.
                The <strong>Chaldean System</strong> (Outer Manifestation) is used for material reality and timing influence.
              </p>
              
              <div className="grid-2">
                <div>
                  <h3 className="chart-title pythagorean">Pythagorean Chart (Inner Self)</h3>
                  <div className="chart-table-container">
                    <table className="chart-table pythagorean">
                      <thead>
                        <tr>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <th key={num}>{num}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>A</td><td>B</td><td>C</td><td>D</td><td>E</td><td>F</td><td>G</td><td>H</td><td>I</td>
                        </tr>
                        <tr>
                          <td>J</td><td>K</td><td>L</td><td>M</td><td>N</td><td>O</td><td>P</td><td>Q</td><td>R</td>
                        </tr>
                        <tr>
                          <td>S</td><td>T</td><td>U</td><td>V</td><td>W</td><td>X</td><td>Y</td><td>Z</td><td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div>
                  <h3 className="chart-title chaldean">Chaldean Chart (Outer Manifestation)</h3>
                  <div className="chart-table-container">
                    <table className="chart-table chaldean">
                      <thead>
                        <tr>
                          {[1,2,3,4,5,6,7,8].map(num => (
                            <th key={num}>{num}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>A, I, J, Q, Y</td>
                          <td>B, K, R</td>
                          <td>C, G, L, S</td>
                          <td>D, M, T</td>
                          <td>E, H, N, X</td>
                          <td>U, V, W</td>
                          <td>O, Z</td>
                          <td>F, P</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <footer className="numerology-footer">
              <p>
                12-Point Analysis Summary (history): 1-Destiny, 2-Soul Urge, 3-Dream, 4-Power, 5-Life Path, 
                6-Mulank, 7-Chaldean Reduced, 8-Fame, 9-Wealth, 10-Luck, 11-Health, 12-Speed.
              </p>
            </footer>
          </div>
          {/* End space-y-12 */}
        </div>
        {/* End numerology-content */}
      </div>
      )
{/* End numerology-container */}
  }
    