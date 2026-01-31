"use client";

import { useState, useEffect, useMemo } from "react";
import { Calculator, User, Calendar, Save, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import "./numerology.css";

/**
 * NumerologyPage Component
 *
 * A React component for performing comprehensive numerology calculations based on Pythagorean and Chaldean systems.
 * It computes core numbers (Destiny, Soul Urge, Dream, Power, Life Path, Mulank), composite performance scores,
 * and provides timing analysis. Includes localStorage-based history for up to 10 calculations with comparison table.
 *
 * Features:
 * - Real-time calculation on input change using useMemo.
 * - Handles master numbers (11, 22, 33) without reduction.
 * - Composite scoring averages Pythagorean and Chaldean traits across Fame, Wealth, Luck, Health, Speed.
 * - History management: save, delete, clear (max 10 entries).
 * - Responsive two-column layout with charts for system understanding.
 * - Validation for required fields before saving.
 *
 * Dependencies:
 * - React hooks: useState, useEffect, useMemo.
 * - Lucide React icons for UI elements.
 * - External CSS: './numerology.css' for styling (assumed to define orb animations, cards, etc.).
 *
 * Styling Notes:
 * - Golden/orange theme with section-based color coding (yellow for totals, orange/purple/green for cores, etc.).
 * - Progress bars for composite scores.
 * - History table with 12-point comparison columns.
 *
 * @returns {JSX.Element} The rendered numerology calculator page.
 */
export default function NumerologyPage() {
  const { t } = useTranslation();

  // Form input states
  const [fullName, setFullName] = useState(""); // User's full birth name for letter-based calculations
  const [birthDate, setBirthDate] = useState(""); // Birth date (YYYY-MM-DD) for Life Path and Mulank
  const [history, setHistory] = useState([]); // Array of saved calculation history objects

  // Numerology data constants
  /**
   * Pythagorean letter-to-number mapping (A=1, B=2, ..., I=9, J=1, etc.).
   * Used for Destiny, Soul Urge, and Dream numbers.
   */
  const PYTHAGOREAN_MAP = {
    A: 1,
    J: 1,
    S: 1,
    B: 2,
    K: 2,
    T: 2,
    C: 3,
    L: 3,
    U: 3,
    D: 4,
    M: 4,
    V: 4,
    E: 5,
    N: 5,
    W: 5,
    F: 6,
    O: 6,
    X: 6,
    G: 7,
    P: 7,
    Y: 7,
    H: 8,
    Q: 8,
    Z: 8,
    I: 9,
    R: 9,
  };

  /**
   * Chaldean letter-to-number mapping (A=1, B=2, ..., no 9 assignment).
   * Used for outer manifestation and composite scoring.
   */
  const CHALDEAN_MAP = {
    A: 1,
    I: 1,
    J: 1,
    Q: 1,
    Y: 1,
    B: 2,
    K: 2,
    R: 2,
    C: 3,
    G: 3,
    L: 3,
    S: 3,
    D: 4,
    M: 4,
    T: 4,
    E: 5,
    H: 5,
    N: 5,
    X: 5,
    U: 6,
    V: 6,
    W: 6,
    O: 7,
    Z: 7,
    F: 8,
    P: 8,
  };

  /**
   * Standard vowels for Soul Urge calculation (Y treated contextually).
   */
  const VOWELS_STANDARD = ["A", "E", "I", "O", "U"];

  /**
   * Master numbers that are not reduced further.
   */
  const MASTER_NUMBERS = [11, 22, 33];

  /**
   * localStorage key for persisting history.
   */
  const NUMEROLOGY_HISTORY_KEY = "numerology_history_v2";

  /**
   * Archetype and trait ratings (1-5 stars) for numbers 1-9.
   * Used for composite scoring across Fame, Wealth, Luck, Health, Speed.
   */
  const NUMBER_TRAITS = {
    1: {
      archetype: "Pioneer / Leader",
      Fame: 4,
      Wealth: 4,
      Luck: 3,
      Health: 2,
      Speed: 5,
    },
    2: {
      archetype: "Diplomat / Peacemaker",
      Fame: 2,
      Wealth: 2,
      Luck: 4,
      Health: 3,
      Speed: 2,
    },
    3: {
      archetype: "Creator / Performer",
      Fame: 5,
      Wealth: 3,
      Luck: 4,
      Health: 2,
      Speed: 4,
    },
    4: {
      archetype: "Builder / Strategist",
      Fame: 2,
      Wealth: 4,
      Luck: 1,
      Health: 4,
      Speed: 1,
    },
    5: {
      archetype: "Opportunist / Explorer",
      Fame: 4,
      Wealth: 4,
      Luck: 5,
      Health: 1,
      Speed: 5,
    },
    6: {
      archetype: "Magnet / Healer",
      Fame: 4,
      Wealth: 5,
      Luck: 3,
      Health: 3,
      Speed: 3,
    },
    7: {
      archetype: "Mystic / Analyst",
      Fame: 2,
      Wealth: 2,
      Luck: 2,
      Health: 4,
      Speed: 1,
    },
    8: {
      archetype: "Power / Executive",
      Fame: 3,
      Wealth: 5,
      Luck: 2,
      Health: 2,
      Speed: 2,
    },
    9: {
      archetype: "Warrior / Visionary",
      Fame: 4,
      Wealth: 2,
      Luck: 3,
      Health: 1,
      Speed: 3,
    },
  };

  /**
   * Timing analysis descriptions based on Life Path number.
   * Provides insights into success timing and karmic themes.
   */
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
    33: "Master Teacher Timing. Wisdom and guidance for others.",
  };

  // Helper functions
  /**
   * Reduces a number to a single digit, preserving master numbers (11, 22, 33).
   * Recursively sums digits until single digit or master number.
   * @param {number|null} num - Input number to reduce.
   * @returns {number|null} Reduced number or null if invalid input.
   */
  const reduceNumber = (num) => {
    if (num === null || isNaN(num) || num === 0) return null;
    let current = num;
    if (MASTER_NUMBERS.includes(current)) return current;

    while (current > 9) {
      let sum = current
        .toString()
        .split("")
        .reduce((acc, digit) => acc + parseInt(digit), 0);
      if (MASTER_NUMBERS.includes(sum) && sum !== current) return sum;
      current = sum;
    }
    return current;
  };

  /**
   * Determines if a character is a vowel, with special handling for 'Y'.
   * 'Y' is a vowel if not surrounded by vowels or at word boundaries.
   * @param {string} char - Character to check (uppercase).
   * @param {string} str - Full string for context.
   * @param {number} index - Position of char in str.
   * @returns {boolean} True if vowel.
   */
  const isVowel = (char, str, index) => {
    if (VOWELS_STANDARD.includes(char)) return true;
    if (char === "Y") {
      const prevVowel =
        index > 0 ? VOWELS_STANDARD.includes(str[index - 1]) : false;
      const nextVowel =
        index < str.length - 1
          ? VOWELS_STANDARD.includes(str[index + 1])
          : false;
      if (!prevVowel && !nextVowel) return true;
      if (index === str.length - 1 && !prevVowel) return true;
      if (index === 0 && !nextVowel) return true;
    }
    return false;
  };

  /**
   * Reduces a Life Path component (month/day/year) to single digit or master number.
   * @param {number} n - Input number (month, day, or year).
   * @returns {number} Reduced value.
   */
  const reduceLifePathComponent = (n) => {
    let sum = n;
    while (sum > 9 && ![11, 22, 33].includes(sum)) {
      sum = sum
        .toString()
        .split("")
        .reduce((acc, digit) => acc + parseInt(digit), 0);
    }
    return sum;
  };

  /**
   * Calculates Life Path number from birth date.
   * Sums reduced month + day + year.
   * @param {string} dateStr - YYYY-MM-DD birth date.
   * @returns {number|null} Life Path number or null if invalid.
   */
  const calculateLifePath = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split("-").map((v) => parseInt(v));
    if ([year, month, day].some(isNaN)) return null;
    return reduceNumber(
      reduceLifePathComponent(month) +
        reduceLifePathComponent(day) +
        reduceLifePathComponent(year),
    );
  };

  /**
   * Calculates Mulank (day number) from birth date.
   * @param {string} dateStr - YYYY-MM-DD birth date.
   * @returns {number|null} Mulank or null if invalid.
   */
  const calculateMulank = (dateStr) => {
    if (!dateStr) return null;
    const day = parseInt(dateStr.split("-")[2]);
    if (isNaN(day)) return null;
    return reduceLifePathComponent(day);
  };

  /**
   * Computes composite trait scores by averaging Pythagorean and Chaldean ratings.
   * Converts to stars (1-5) and percentages (0-100).
   * @param {number} pythagorean - Pythagorean reduced number.
   * @param {number} chaldean - Chaldean reduced number.
   * @returns {object} Composite scores for Fame, Wealth, etc.
   */
  const getCompositeScores = (pythagorean, chaldean) => {
    const pythTraits = NUMBER_TRAITS[pythagorean] || {};
    const chalTraits = NUMBER_TRAITS[chaldean] || {};
    const metrics = ["Fame", "Wealth", "Luck", "Health", "Speed"];
    const output = {};

    for (const metric of metrics) {
      const average =
        ((pythTraits[metric] || 0) + (chalTraits[metric] || 0)) / 2;
      output[metric.toLowerCase()] = {
        stars: average,
        percent: average * 20,
      };
    }
    return output;
  };

  // Main calculation function
  /**
   * Performs full numerology calculation for name and birth date.
   * Computes totals, reductions, core numbers, and composites.
   * @param {string} rawName - Raw full name input.
   * @param {string} dateStr - YYYY-MM-DD birth date.
   * @returns {object|null} Calculation results or null if insufficient data.
   */
  const performCalculation = (rawName, dateStr) => {
    const name = rawName.trim();
    const lifePath = calculateLifePath(dateStr);
    const mulank = calculateMulank(dateStr);

    if (!name && lifePath === null) return null;

    let pythagoreanTotal = 0;
    let chaldeanTotal = 0;
    let vowelSum = 0;
    let consonantSum = 0;
    let destiny = null;
    let soul = null;
    let dream = null;
    let power = null;
    let composite = null;

    if (name) {
      const cleaned = name.toUpperCase().replace(/[^A-Z]/g, "");
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        const pythValue = PYTHAGOREAN_MAP[char] || 0;
        const chalValue = CHALDEAN_MAP[char] || 0;

        pythagoreanTotal += pythValue;
        chaldeanTotal += chalValue;

        if (isVowel(char, cleaned, i)) {
          vowelSum += pythValue;
        } else {
          consonantSum += pythValue;
        }
      }

      destiny = reduceNumber(pythagoreanTotal);
      soul = reduceNumber(vowelSum);
      dream = reduceNumber(consonantSum);

      if (lifePath !== null && destiny !== null) {
        power = reduceNumber(lifePath + destiny);
      }

      const chaldeanReduced = reduceNumber(chaldeanTotal);
      if (destiny !== null && chaldeanReduced !== null) {
        composite = getCompositeScores(destiny, chaldeanReduced);
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
      composite,
    };
  };

  // Calculate results whenever inputs change
  /**
   * Memoized results object, recomputed on fullName or birthDate change.
   */
  const results = useMemo(() => {
    return performCalculation(fullName, birthDate) || {};
  }, [fullName, birthDate]);

  // History management
  /**
   * Retrieves history from localStorage.
   * @returns {array} History array or empty on error.
   */
  const getHistory = () => {
    try {
      const stored = localStorage.getItem(NUMEROLOGY_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  };

  /**
   * Saves result to history: dedupes by name+DOB, unshifts, limits to 10.
   * @param {object} result - Calculation result to save.
   */
  const saveToHistory = (result) => {
    let currentHistory = getHistory();
    const key = `${result.name.toUpperCase()}-${result.dob}`;
    currentHistory = currentHistory.filter(
      (item) => `${item.name.toUpperCase()}-${item.dob}` !== key,
    );
    currentHistory.unshift(result);
    if (currentHistory.length > 10)
      currentHistory = currentHistory.slice(0, 10);
    localStorage.setItem(
      NUMEROLOGY_HISTORY_KEY,
      JSON.stringify(currentHistory),
    );
    setHistory(currentHistory);
  };

  /**
   * Saves current results to history if valid.
   */
  const saveCurrentResult = () => {
    if (results && results.lifePath !== null && results.destiny !== null) {
      saveToHistory(results);
    }
  };

  /**
   * Deletes a history item by ID.
   * @param {number} id - Item ID to delete.
   */
  const deleteHistoryItem = (id) => {
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(NUMEROLOGY_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

  /**
   * Clears all history from localStorage.
   */
  const clearHistory = () => {
    localStorage.removeItem(NUMEROLOGY_HISTORY_KEY);
    setHistory([]);
  };

  // Load history on component mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Check if save button should be enabled
  /**
   * Determines if current results are savable (requires destiny, lifePath, composite).
   */
  const canSave =
    results &&
    results.destiny !== null &&
    results.lifePath !== null &&
    results.composite !== null;

  // Helper function to render detail rows
  /**
   * Renders a composite score row with progress bar and percentage.
   * @param {string} label - Metric label (e.g., 'Fame Index').
   * @param {object} data - Score data {percent}.
   * @returns {JSX.Element|null} Row element or null if no data.
   */
  const renderDetailRow = (label, data) => {
    if (!data) return null;

    return (
      <div key={label} className="detail-item">
        <span className="detail-label">{label}:</span>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${data.percent}%` }}
          ></div>
        </div>
        <span className="detail-percent">{data.percent.toFixed(0)}%</span>
      </div>
    );
  };

      /* ---------- ACCORDION SECTION ---------- */
    const Section = ({ title, content, children }) => {
      const [open, setOpen] = useState(false);
  
      return (
        <div
          style={{
            marginBottom: "1.25rem",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            borderRadius: "1rem",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9))",
            overflow: "hidden",
            transition: "all 0.3s ease",
          }}
        >
          {/* HEADER */}
          <button
            onClick={() => setOpen(!open)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "1rem 1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <h2
              style={{
                fontFamily: "'Georgia','Times New Roman',serif",
                fontSize: "20px",
                fontWeight: 500,
                color: "#1f2937",
                margin: 0,
              }}
            >
              {title}
            </h2>
  
            <span
              style={{
                fontSize: "1.25rem",
                color: "#b45309",
                transform: open ? "rotate(45deg)" : "rotate(0deg)",
                transition: "transform 0.25s ease",
              }}
            >
              +
            </span>
          </button>
  
          {/* CONTENT */}
          {open && (
            <div
              style={{
                padding: "0 1.25rem 1.25rem",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#374151",
                  lineHeight: 1.7,
                  marginBottom: "0.75rem",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {children}
              </p>
  
              <ul
                style={{
                  paddingLeft: "1.25rem",
                  fontSize: "0.85rem",
                  color: "#374151",
                  lineHeight: 1.8,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {content.map((item, i) => (
                  <li key={i}>✔ {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    };  

  return (
    <div
      className="numerology-container"
      style={{ paddingTop: "0.01rem", marginTop: "0.01rem" }}
    >
      <div className="app">
        {/* Orbs */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {/* Header */}
        <header
          className="header"
          style={{ paddingTop: "0.01rem", marginTop: "0.01rem" }}
        >
          <h1 className="title">{t.numerology.title}</h1>
          <p className="subtitle">{t.numerology.subtitle}</p>
        </header>

        {/* Two Column Layout */}
        <div className="two-column-layout">
          {/* Form Section - Centered */}
          <div className="form-container">
            <div className="form-wrapper">
              <div className="form-card">
                {/* Form Header */}
                <div className="form-header">
                  <div className="form-icon-circle">
                    <Calculator className="w-7 h-7 text-white" />
                  </div>
                  <div className="form-header-text">
                    <h3 className="form-header-title">
                      {t.profile.personalInfo}
                    </h3>
                    <p className="form-header-subtitle">
                      {t.numerology.description}
                    </p>
                  </div>
                </div>

                {/* Full Name Input */}
                <div className="input-group">
                  <label htmlFor="fullName" className="input-label">
                    <User
                      className="w-4 h-4 input-label-icon"
                      style={{ color: "#d4af37" }}
                    />
                    {t.numerology.fullName}
                    <span className="required-badge">
                      *{t.validation.required}
                    </span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder={t.numerology.namePlaceholder}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                  />
                </div>

                {/* Date of Birth Input */}
                <div className="input-group">
                  <label htmlFor="birthDate" className="input-label">
                    <Calendar
                      className="w-4 h-4 input-label-icon"
                      style={{ color: "#d4af37" }}
                    />
                    {t.numerology.birthDate}
                    <span className="required-badge">
                      *{t.validation.required}
                    </span>
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="input-field date-input"
                  />
                  <p className="input-hint">
                    Required for Life Path & Timing analysis
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveCurrentResult}
                  disabled={!canSave}
                  className="save-button"
                >
                  <Save className="w-5 h-5" />
                  {t.numerology.saveHistory}
                </button>

                {/* Info Text */}
                <div className="info-box">
                  <p className="info-text">
                    💡 Your calculation will be saved for comparison for
                    comparison
                    <br />
                    in the history table below
                  </p>
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
                <div className="result-card yellow">
                  <div className="card-header">
                    <div className="header-content">
                      <div className="icon-wrapper">
                        <span className="card-icon">Σ</span>
                      </div>
                      <div className="title-group">
                        <h3 className="card-title">Pythagorean Total</h3>
                        <p className="card-desc">
                          Raw sum and its reduced digit used for Destiny
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="time-row">
                      <span className="time-label">Value</span>
                      <span className="time-value">
                        {results.pythagoreanTotal
                          ? `${results.pythagoreanTotal} = ${results.pythagoreanReduced}`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="result-card yellow">
                  <div className="card-header">
                    <div className="header-content">
                      <div className="icon-wrapper">
                        <span className="card-icon">☥</span>
                      </div>
                      <div className="title-group">
                        <h3 className="card-title">Chaldean Total</h3>
                        <p className="card-desc">
                          Esoteric vibration used in composite scoring
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="time-row">
                      <span className="time-label">Value</span>
                      <span className="time-value">
                        {results.chaldeanTotal
                          ? `${results.chaldeanTotal} = ${results.chaldeanReduced}`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          {/* End RIGHT COLUMN */}
        </div>
        {/* End Two Column Layout */}

        {/* 2) Inner Engine */}
        <section className="results-section">
          <h2 className="section-title inner-engine">
            Inner Engine (Pythagorean): Purpose & Psychology
          </h2>
          <div className="grid-3">
            <div className="result-card orange">
              <div className="card-header">
                <div className="header-content">
                  <div className="icon-wrapper">
                    <span className="card-icon">1</span>
                  </div>
                  <div className="title-group">
                    <h3 className="card-title">Destiny / Expression</h3>
                    <p className="card-desc">
                      Life purpose, public path (Pythagorean total reduced)
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="time-row">
                  <span className="time-label">Number</span>
                  <span
                    className={`time-value ${
                      MASTER_NUMBERS.includes(results.destiny) ? "master" : ""
                    }`}
                  >
                    {results.destiny || "-"}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                <span className="period-number">Core Number #1</span>
              </div>
            </div>

            <div className="result-card purple">
              <div className="card-header">
                <div className="header-content">
                  <div className="icon-wrapper">
                    <span className="card-icon">2</span>
                  </div>
                  <div className="title-group">
                    <h3 className="card-title">Soul Urge / Heart's Desire</h3>
                    <p className="card-desc">Innermost desires (Vowels only)</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="time-row">
                  <span className="time-label">Number</span>
                  <span
                    className={`time-value ${
                      MASTER_NUMBERS.includes(results.soulUrge) ? "master" : ""
                    }`}
                  >
                    {results.soulUrge || "-"}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                <span className="period-number">Core Number #2</span>
              </div>
            </div>

            <div className="result-card green">
              <div className="card-header">
                <div className="header-content">
                  <div className="icon-wrapper">
                    <span className="card-icon">3</span>
                  </div>
                  <div className="title-group">
                    <h3 className="card-title">Personality / Dream</h3>
                    <p className="card-desc">
                      Outer impression (Consonants only)
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="time-row">
                  <span className="time-label">Number</span>
                  <span
                    className={`time-value ${
                      MASTER_NUMBERS.includes(results.dream) ? "master" : ""
                    }`}
                  >
                    {results.dream || "-"}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                <span className="period-number">Core Number #3</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3) Timing */}
        <section className="results-section">
          <h2 className="section-title timing">
            Timing & Karmic Script (DOB & Composite)
          </h2>
          <div className="grid-3">
            <div className="result-card gray">
              <div className="card-header">
                <div className="header-content">
                  <div className="icon-wrapper">
                    <span className="card-icon">4</span>
                  </div>
                  <div className="title-group">
                    <h3 className="card-title">Power Number</h3>
                    <p className="card-desc">
                      Activation Frequency (Life Path + Destiny)
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="time-row">
                  <span className="time-label">Number</span>
                  <span
                    className={`time-value ${
                      MASTER_NUMBERS.includes(results.powerNumber)
                        ? "master"
                        : ""
                    }`}
                  >
                    {results.powerNumber || "-"}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                <span className="period-number">Core Number #4</span>
              </div>
            </div>

            <div className="result-card blue">
              <div className="card-header">
                <div className="header-content">
                  <div className="icon-wrapper">
                    <span className="card-icon">5</span>
                  </div>
                  <div className="title-group">
                    <h3 className="card-title">Life Path</h3>
                    <p className="card-desc">
                      Unchangeable karmic script and timing modifier
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="time-row">
                  <span className="time-label">Number</span>
                  <span
                    className={`time-value ${
                      MASTER_NUMBERS.includes(results.lifePath) ? "master" : ""
                    }`}
                  >
                    {results.lifePath || "-"}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                <span className="period-number">Core Number #5</span>
              </div>
            </div>

            <div className="result-card red">
              <div className="card-header">
                <div className="header-content">
                  <div className="icon-wrapper">
                    <span className="card-icon">6</span>
                  </div>
                  <div className="title-group">
                    <h3 className="card-title">Day Number (Mulank)</h3>
                    <p className="card-desc">
                      Innate, core daily characteristics
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="time-row">
                  <span className="time-label">Number</span>
                  <span
                    className={`time-value ${
                      MASTER_NUMBERS.includes(results.mulank) ? "master" : ""
                    }`}
                  >
                    {results.mulank || "-"}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                <span className="period-number">Core Number #6</span>
              </div>
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
                Pythagorean Engine:{" "}
                <strong>
                  {results.destiny} (
                  {(NUMBER_TRAITS[results.destiny] || {}).archetype || "-"})
                </strong>{" "}
                | Chaldean Vehicle:{" "}
                <strong>
                  {results.chaldeanReduced} (
                  {(NUMBER_TRAITS[results.chaldeanReduced] || {}).archetype ||
                    "-"}
                  )
                </strong>
              </p>
              <div className="space-y-2 text-sm">
                {results.composite && (
                  <>
                    {renderDetailRow("Fame Index", results.composite.fame)}
                    {renderDetailRow("Wealth Index", results.composite.wealth)}
                    {renderDetailRow("Luck Index", results.composite.luck)}
                    {renderDetailRow("Health Index", results.composite.health)}
                    {renderDetailRow("Speed Index", results.composite.speed)}
                  </>
                )}
              </div>
            </div>

            {/* Timing Analysis */}

            {results.lifePath !== null && results.powerNumber !== null && (
              <div className="timing-card" style={{ marginTop: "2rem" }}>
                <h3 className="timing-title">
                  Timing Analysis (Life Path Modifier)
                </h3>
                <div className="timing-content">
                  <p>
                    {TIMING_ANALYSIS[results.lifePath] ||
                      "General Life Path timing suggests a steady pace of development."}
                  </p>
                  <p style={{ marginTop: "1rem" }}>
                    Your <strong>Power Number is {results.powerNumber}</strong>{" "}
                    {results.powerNumber === 1 || results.powerNumber === 5
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
            <h2
              className="section-title history"
              style={{ border: "none", padding: 0, margin: 0 }}
            >
              Calculation History (12-Point Comparison)
            </h2>
            {history.length > 0 && (
              <button onClick={clearHistory} className="clear-history-btn">
                {t.numerology.clearHistory}
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
                      const displayName =
                        item.name.length > 20
                          ? item.name.slice(0, 17) + "..."
                          : item.name;
                      const displayDob = item.dob ? item.dob.slice(5) : "N/A";
                      const metrics = item.composite || {
                        fame: { percent: 0 },
                        wealth: { percent: 0 },
                        luck: { percent: 0 },
                        health: { percent: 0 },
                        speed: { percent: 0 },
                      };

                      return (
                        <tr key={item.id}>
                          <td title={`${item.name} (${item.dob || "N/A"})`}>
                            <span className="history-name">{displayName}</span>
                            <span className="history-dob">{displayDob}</span>
                          </td>
                          <td
                            className={
                              MASTER_NUMBERS.includes(item.destiny)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {item.destiny || "-"}
                          </td>
                          <td
                            className={
                              MASTER_NUMBERS.includes(item.soulUrge)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {item.soulUrge || "-"}
                          </td>
                          <td
                            className={
                              MASTER_NUMBERS.includes(item.dream)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {item.dream || "-"}
                          </td>
                          <td
                            className={
                              MASTER_NUMBERS.includes(item.powerNumber)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {item.powerNumber || "-"}
                          </td>
                          <td
                            className={
                              MASTER_NUMBERS.includes(item.lifePath)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {item.lifePath || "-"}
                          </td>
                          <td
                            className={
                              MASTER_NUMBERS.includes(item.mulank)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {item.mulank || "-"}
                          </td>
                          <td
                            className={
                              MASTER_NUMBERS.includes(item.chaldeanReduced)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {item.chaldeanReduced || "-"}
                          </td>
                          <td className="font-semibold">
                            {metrics.fame.percent.toFixed(0)}%
                          </td>
                          <td className="font-semibold">
                            {metrics.wealth.percent.toFixed(0)}%
                          </td>
                          <td className="font-semibold">
                            {metrics.luck.percent.toFixed(0)}%
                          </td>
                          <td className="font-semibold">
                            {metrics.health.percent.toFixed(0)}%
                          </td>
                          <td className="font-semibold">
                            {metrics.speed.percent.toFixed(0)}%
                          </td>
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
                      );
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
            The <strong>Pythagorean System</strong> (Inner Self) is used for
            Destiny, Soul Urge, and Dream. The <strong>Chaldean System</strong>{" "}
            (Outer Manifestation) is used for material reality and timing
            influence.
          </p>

          <div className="grid-2">
            <div>
              <h3 className="chart-title pythagorean">
                Pythagorean Chart (Inner Self)
              </h3>
              <div className="chart-table-container">
                <table className="chart-table pythagorean">
                  <thead>
                    <tr>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <th key={num}>{num}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>A</td>
                      <td>B</td>
                      <td>C</td>
                      <td>D</td>
                      <td>E</td>
                      <td>F</td>
                      <td>G</td>
                      <td>H</td>
                      <td>I</td>
                    </tr>
                    <tr>
                      <td>J</td>
                      <td>K</td>
                      <td>L</td>
                      <td>M</td>
                      <td>N</td>
                      <td>O</td>
                      <td>P</td>
                      <td>Q</td>
                      <td>R</td>
                    </tr>
                    <tr>
                      <td>S</td>
                      <td>T</td>
                      <td>U</td>
                      <td>V</td>
                      <td>W</td>
                      <td>X</td>
                      <td>Y</td>
                      <td>Z</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="chart-title chaldean">
                Chaldean Chart (Outer Manifestation)
              </h3>
              <div className="chart-table-container">
                <table className="chart-table chaldean">
                  <thead>
                    <tr>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
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
            12-Point Analysis Summary (history): 1-Destiny, 2-Soul Urge,
            3-Dream, 4-Power, 5-Life Path, 6-Mulank, 7-Chaldean Reduced, 8-Fame,
            9-Wealth, 10-Luck, 11-Health, 12-Speed.
          </p>
        </footer>

<div className="card shadow-xl border mt-16">
  {/* HERO */}
  <div
    style={{
      borderBottom: "2px solid rgba(212,175,55,0.25)",
      paddingBottom: "1.75rem",
      marginBottom: "1.75rem",
      textAlign: "center",
    }}
  >
    <h1
      style={{
        fontFamily: "'Georgia','Times New Roman',serif",
        fontSize: "32px",
        fontWeight: 500,
        color: "#111827",
        marginBottom: "0.75rem",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        gap:"0.5rem",
      }}
    >
      AI-Powered Numerology Prediction – Discover Your Numbers & Life Path
    </h1>

    <p className="text-sm mt-1 text-slate-600">
      Numerology reveals how numbers influence your personality, decisions, and
      life cycles. We combine <strong>AI-powered analysis</strong> with
      traditional numerology principles to deliver personalized insights.
    </p>

    <div className="flex justify-center mt-4">
      <button className="btn-primary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Check Your Numerology Now</button>
    </div>
  </div>

  <Section
    title="What Is Numerology & How It Works"
    content={[
      "Life Path, Destiny & Soul Urge calculation",
      "Name and date of birth based analysis",
      "Pattern recognition across life cycles",
    ]}
  >
    Numerology studies the influence of numbers derived from your birth details
    and name. These numbers reveal strengths, challenges, and recurring life
    themes.
  </Section>

  <Section
    title="What Makes Our Numerology Different"
    content={[
      "AI-based calculation accuracy",
      "Career, relationship & decision guidance",
      "Favorable and challenging periods",
      "Practical energy balancing suggestions",
      "Option to consult astrologers",
    ]}
  >
    Most numerology tools stop at meanings. Nirali Live Astro focuses on timing,
    tendencies, and preparedness.
  </Section>

  <Section
    title="What You’ll Learn from Numerology"
    content={[
      "Natural strengths and weaknesses",
      "Career and business tendencies",
      "Relationship compatibility patterns",
      "Decision-making style",
      "Repeating life themes",
    ]}
  >
    Your numerology report acts as a mirror to understand how numbers shape your
    life path.
  </Section>

  <Section
    title="Numerology + Astrology = Better Accuracy"
    content={[
      "Numerology insights",
      "Kundli predictions",
      "Planetary transits",
    ]}
  >
    Numbers and planets work together. Combining numerology with astrology gives
    a broader and more reliable understanding of life patterns.
  </Section>

  <p className="text-sm mt-6 text-gray-500 text-center mx-auto max-w-2xl">
    Numerology offers guidance and should not replace professional advice.
  </p>
</div>

      </div>
    </div>
  );
}
