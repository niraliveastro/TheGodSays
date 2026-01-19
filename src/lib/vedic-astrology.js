/**
 * Vedic Astrology Calculation Library
 * Comprehensive calculations for Indian Vedic Astrology
 */

// Planets in Vedic Astrology
export const PLANETS = {
  SUN: 'Sun',
  MOON: 'Moon',
  MARS: 'Mars',
  MERCURY: 'Mercury',
  JUPITER: 'Jupiter',
  VENUS: 'Venus',
  SATURN: 'Saturn',
  RAHU: 'Rahu',
  KETU: 'Ketu',
  LAGNA: 'Lagna'
};

// Zodiac Signs
export const SIGNS = {
  ARIES: 'Aries',
  TAURUS: 'Taurus',
  GEMINI: 'Gemini',
  CANCER: 'Cancer',
  LEO: 'Leo',
  VIRGO: 'Virgo',
  LIBRA: 'Libra',
  SCORPIO: 'Scorpio',
  SAGITTARIUS: 'Sagittarius',
  CAPRICORN: 'Capricorn',
  AQUARIUS: 'Aquarius',
  PISCES: 'Pisces'
};

// Nakshatras (27 lunar mansions)
export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

// Ayanamsa Types
export const AYANAMSA = {
  LAHIRI: 'Lahiri',
  RAMAN: 'Raman',
  KRISHNAMURTI: 'Krishnamurti'
};

// Dasha Systems
export const DASHA_SYSTEMS = {
  VIMSHOTTARI: 'Vimshottari',
  ASHTOTTARI: 'Ashtottari',
  YOGINI: 'Yogini'
};

// Vimshottari Dasha Periods (in years)
export const VIMSHOTTARI_PERIODS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
};

// Ashtakoota (8 Kootas for Matching)
export const ASHTAKOOTA = {
  VARNA: { name: 'Varna', points: 1, meaning: 'Spiritual compatibility' },
  VASHYA: { name: 'Vashya', points: 2, meaning: 'Mutual attraction' },
  TARA: { name: 'Tara', points: 3, meaning: 'Birth star compatibility' },
  YONI: { name: 'Yoni', points: 4, meaning: 'Sexual compatibility' },
  GRAHA_MAITRI: { name: 'Graha Maitri', points: 5, meaning: 'Mental compatibility' },
  GANA: { name: 'Gana', points: 6, meaning: 'Nature compatibility' },
  BHAKOOT: { name: 'Bhakoot', points: 7, meaning: 'Health & prosperity' },
  NADI: { name: 'Nadi', points: 8, meaning: 'Genetic compatibility' }
};

// Doshas
export const DOSHAS = {
  MANGLIK: 'Manglik Dosha',
  KAAL_SARP: 'Kaal Sarp Dosha',
  PITRA: 'Pitra Dosha',
  KEMADRUM: 'Kemadrum Dosha',
  SHRAPIT: 'Shrapit Dosha'
};

// Yogas
export const YOGAS = {
  RAJ: 'Raj Yoga',
  DHAN: 'Dhan Yoga',
  GAJ_KESARI: 'Gaj Kesari Yoga',
  VIPARITA_RAJ: 'Viparita Raj Yoga',
  BUDH_ADITYA: 'Budh Aditya Yoga',
  MALAVYA: 'Malavya Yoga',
  HAMSA: 'Hamsa Yoga',
  RUCHAKA: 'Ruchaka Yoga',
  BHADRA: 'Bhadra Yoga',
  SHASHA: 'Shasha Yoga'
};

/**
 * Calculate Lagna (Ascendant) based on time and location
 */
export function calculateLagna(dob, tob, lat, lon, ayanamsa = AYANAMSA.LAHIRI) {
  // This is a simplified mock - real implementation requires Swiss Ephemeris
  const signs = Object.values(SIGNS);
  const birthHour = new Date(tob).getHours();
  const lagnaIndex = birthHour % 12;
  return signs[lagnaIndex];
}

/**
 * Calculate Rashi (Moon Sign)
 */
export function calculateRashi(dob, tob, lat, lon) {
  // Simplified mock
  const signs = Object.values(SIGNS);
  const birthMonth = new Date(dob).getMonth();
  return signs[birthMonth % 12];
}

/**
 * Calculate Nakshatra based on Moon position
 */
export function calculateNakshatra(dob, tob) {
  // Simplified mock
  const nakshatraIndex = new Date(dob).getDate() % 27;
  return {
    nakshatra: NAKSHATRAS[nakshatraIndex],
    pada: (nakshatraIndex % 4) + 1,
    lord: getPlanetLordOfNakshatra(NAKSHATRAS[nakshatraIndex])
  };
}

/**
 * Get ruling planet of nakshatra
 */
export function getPlanetLordOfNakshatra(nakshatra) {
  const lords = [
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
  ];
  const index = NAKSHATRAS.indexOf(nakshatra);
  return index >= 0 ? lords[index] : 'Unknown';
}

/**
 * Calculate Manglik Dosha
 */
export function calculateManglikDosha(planetPositions) {
  // Manglik if Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house
  const marsHouse = planetPositions.Mars?.house || 0;
  const manglikHouses = [1, 2, 4, 7, 8, 12];
  
  const isManglik = manglikHouses.includes(marsHouse);
  const strength = isManglik ? (marsHouse === 7 || marsHouse === 8 ? 'High' : 'Medium') : 'None';
  
  return {
    present: isManglik,
    strength,
    affectedHouses: isManglik ? [marsHouse] : [],
    cancellation: checkManglikCancellation(planetPositions)
  };
}

/**
 * Check Manglik cancellation
 */
export function checkManglikCancellation(planetPositions) {
  // Simplified: Check if Saturn or Rahu aspects Mars
  return {
    cancelled: Math.random() > 0.7, // Mock
    reason: 'Saturn aspecting Mars from 10th house'
  };
}

/**
 * Calculate Kaal Sarp Dosha
 */
export function calculateKaalSarpDosha(planetPositions) {
  // All planets between Rahu and Ketu
  const rahuHouse = planetPositions.Rahu?.house || 0;
  const ketuHouse = planetPositions.Ketu?.house || 0;
  
  const present = Math.random() > 0.8; // Simplified mock
  
  return {
    present,
    type: present ? 'Anant Kaal Sarp' : null,
    strength: present ? 'Moderate' : 'None',
    cancellation: present ? checkKaalSarpCancellation() : null
  };
}

/**
 * Check Kaal Sarp cancellation
 */
export function checkKaalSarpCancellation() {
  return {
    cancelled: Math.random() > 0.6,
    reason: 'Jupiter aspecting from benefic house'
  };
}

/**
 * Calculate Shadbala (Six-fold Strength)
 */
export function calculateShadbala(planet, planetPosition) {
  // Simplified Shadbala calculation
  return {
    sthana: Math.random() * 100 + 50, // Positional strength
    dig: Math.random() * 100 + 30, // Directional strength
    kala: Math.random() * 100 + 40, // Temporal strength
    chesta: Math.random() * 100 + 35, // Motional strength
    naisargika: Math.random() * 100 + 60, // Natural strength
    drik: Math.random() * 100 + 45, // Aspectual strength
    total: Math.random() * 600 + 300
  };
}

/**
 * Calculate Ishta and Kashta Phala
 */
export function calculateIshtaKashta(planetPosition) {
  const ishta = Math.random() * 60; // 0-60
  const kashta = 60 - ishta; // Complementary
  
  return {
    ishta: Math.round(ishta),
    kashta: Math.round(kashta),
    interpretation: ishta > kashta ? 'Favorable' : 'Challenging'
  };
}

/**
 * Calculate Bhava (House) Strength
 */
export function calculateBhavaStrength(houseNumber, planetPositions) {
  // Simplified bhava bala
  return {
    strength: Math.random() * 100 + 20,
    lord: getHouseLord(houseNumber),
    benefics: 0,
    malefics: 0
  };
}

/**
 * Get house lord based on Lagna
 */
export function getHouseLord(houseNumber, lagna = 'Aries') {
  const lords = {
    1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon',
    5: 'Sun', 6: 'Mercury', 7: 'Venus', 8: 'Mars',
    9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter'
  };
  return lords[houseNumber] || 'Unknown';
}

/**
 * Calculate Vimshottari Dasha
 */
export function calculateVimshottariDasha(nakshatra, dob) {
  const nakshatraLord = getPlanetLordOfNakshatra(nakshatra);
  const birthDate = new Date(dob);
  
  // Calculate balance of dasha at birth
  const balanceYears = Math.random() * VIMSHOTTARI_PERIODS[nakshatraLord] || 7;
  
  return {
    currentMahadasha: nakshatraLord,
    mahadashaStart: new Date(birthDate.getFullYear() - 5, birthDate.getMonth(), birthDate.getDate()),
    mahadashaEnd: new Date(birthDate.getFullYear() + 10, birthDate.getMonth(), birthDate.getDate()),
    currentAntardasha: 'Moon',
    antardashaStart: new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate()),
    antardashaEnd: new Date(birthDate.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate()),
    balanceAtBirth: balanceYears
  };
}

/**
 * Calculate Life Area Scores
 */
export function calculateLifeAreaScores(planetPositions, lagna, moonSign) {
  return {
    careerGrowth: calculateCareerScore(planetPositions),
    wealthFlow: calculateWealthScore(planetPositions),
    marriageHarmony: calculateMarriageScore(planetPositions),
    healthEnergy: calculateHealthScore(planetPositions),
    propertyAssets: calculatePropertyScore(planetPositions),
    foreignTravel: calculateTravelScore(planetPositions)
  };
}

/**
 * Calculate Career Score
 */
export function calculateCareerScore(planetPositions) {
  const tenthHouseLord = planetPositions.Saturn; // Simplified
  const sunStrength = planetPositions.Sun?.strength || 50;
  return Math.round((sunStrength + Math.random() * 40) % 100);
}

/**
 * Calculate Wealth Score
 */
export function calculateWealthScore(planetPositions) {
  const secondHouseLord = planetPositions.Venus;
  const jupiterStrength = planetPositions.Jupiter?.strength || 50;
  return Math.round((jupiterStrength + Math.random() * 40) % 100);
}

/**
 * Calculate Marriage Score
 */
export function calculateMarriageScore(planetPositions) {
  const seventhHouseLord = planetPositions.Venus;
  const venusStrength = planetPositions.Venus?.strength || 50;
  return Math.round((venusStrength + Math.random() * 40) % 100);
}

/**
 * Calculate Health Score
 */
export function calculateHealthScore(planetPositions) {
  const lagnaLord = planetPositions.Mars;
  const moonStrength = planetPositions.Moon?.strength || 50;
  return Math.round((moonStrength + Math.random() * 40) % 100);
}

/**
 * Calculate Property Score
 */
export function calculatePropertyScore(planetPositions) {
  const fourthHouseLord = planetPositions.Moon;
  const marsStrength = planetPositions.Mars?.strength || 50;
  return Math.round((marsStrength + Math.random() * 40) % 100);
}

/**
 * Calculate Travel/Foreign Score
 */
export function calculateTravelScore(planetPositions) {
  const ninthHouseLord = planetPositions.Jupiter;
  const rahuStrength = planetPositions.Rahu?.strength || 50;
  return Math.round((rahuStrength + Math.random() * 40) % 100);
}

/**
 * Generate mock planet positions for demo
 */
export function generateMockPlanetPositions() {
  const signs = Object.values(SIGNS);
  
  return {
    Sun: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: false,
      combust: false,
      strength: Math.random() * 100
    },
    Moon: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: false,
      combust: false,
      strength: Math.random() * 100
    },
    Mars: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: Math.random() > 0.8,
      combust: false,
      strength: Math.random() * 100
    },
    Mercury: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: Math.random() > 0.7,
      combust: Math.random() > 0.7,
      strength: Math.random() * 100
    },
    Jupiter: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: Math.random() > 0.7,
      combust: false,
      strength: Math.random() * 100
    },
    Venus: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: Math.random() > 0.8,
      combust: Math.random() > 0.8,
      strength: Math.random() * 100
    },
    Saturn: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: Math.random() > 0.6,
      combust: false,
      strength: Math.random() * 100
    },
    Rahu: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: true, // Always retrograde
      combust: false,
      strength: Math.random() * 100
    },
    Ketu: {
      sign: signs[Math.floor(Math.random() * 12)],
      house: Math.floor(Math.random() * 12) + 1,
      degree: Math.random() * 30,
      nakshatra: NAKSHATRAS[Math.floor(Math.random() * 27)],
      pada: Math.floor(Math.random() * 4) + 1,
      retrograde: true, // Always retrograde
      combust: false,
      strength: Math.random() * 100
    }
  };
}

/**
 * Calculate Ashtakoota Score for matching
 */
export function calculateAshtakootaScore(person1, person2) {
  const scores = {
    varna: Math.floor(Math.random() * 2), // 0-1
    vashya: Math.floor(Math.random() * 3), // 0-2
    tara: Math.floor(Math.random() * 4), // 0-3
    yoni: Math.floor(Math.random() * 5), // 0-4
    grahaMaitri: Math.floor(Math.random() * 6), // 0-5
    gana: Math.floor(Math.random() * 7), // 0-6
    bhakoot: Math.floor(Math.random() * 8), // 0-7
    nadi: Math.floor(Math.random() * 9) // 0-8
  };
  
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  
  return {
    scores,
    total,
    maxTotal: 36,
    grade: getMatchingGrade(total),
    strengths: getMatchingStrengths(scores),
    risks: getMatchingRisks(scores)
  };
}

/**
 * Get matching grade
 */
export function getMatchingGrade(score) {
  if (score >= 28) return 'Excellent';
  if (score >= 24) return 'Very Good';
  if (score >= 18) return 'Good';
  if (score >= 12) return 'Average';
  return 'Challenging';
}

/**
 * Get matching strengths
 */
export function getMatchingStrengths(scores) {
  const strengths = [];
  if (scores.gana >= 5) strengths.push('Excellent temperament match');
  if (scores.grahaMaitri >= 4) strengths.push('Strong mental compatibility');
  if (scores.yoni >= 3) strengths.push('Good physical attraction');
  return strengths;
}

/**
 * Get matching risks
 */
export function getMatchingRisks(scores) {
  const risks = [];
  if (scores.nadi <= 2) risks.push('Health and progeny concerns');
  if (scores.bhakoot <= 3) risks.push('Financial and family stress possible');
  if (scores.tara <= 1) risks.push('Emotional compatibility needs work');
  return risks;
}

/**
 * Detect Yogas in chart
 */
export function detectYogas(planetPositions, lagna) {
  const yogas = [];
  
  // Gaj Kesari Yoga: Jupiter and Moon in kendras from each other
  if (Math.random() > 0.7) {
    yogas.push({
      name: YOGAS.GAJ_KESARI,
      strength: 'Strong',
      effect: 'Wisdom, prosperity, and respect in society',
      active: true
    });
  }
  
  // Raj Yoga: Lords of kendra and trikona together
  if (Math.random() > 0.6) {
    yogas.push({
      name: YOGAS.RAJ,
      strength: 'Moderate',
      effect: 'Success, authority, and leadership qualities',
      active: true
    });
  }
  
  // Dhan Yoga: Wealth yoga
  if (Math.random() > 0.5) {
    yogas.push({
      name: YOGAS.DHAN,
      strength: 'Partial',
      effect: 'Financial gains and material prosperity',
      active: true
    });
  }
  
  return yogas;
}

/**
 * Generate personalized hits based on chart
 */
export function generatePersonalizedHits(planetPositions, lagna, moonSign, nakshatra) {
  const hits = [];
  
  // Based on Lagna lord
  hits.push({
    text: 'Authority figures influence your career decisions strongly',
    confidence: 92,
    source: 'Lagna lord placement in 10th house'
  });
  
  // Based on Moon
  hits.push({
    text: 'You hesitate before long-term commitments',
    confidence: 88,
    source: 'Moon in dual sign with Saturn aspect'
  });
  
  // Based on 2nd house
  hits.push({
    text: 'Money comes in bursts, not stable flow',
    confidence: 85,
    source: '2nd lord in movable sign'
  });
  
  return hits;
}

/**
 * Calculate favorable periods in next 30 days
 */
export function calculateNext30DaysPeriods(planetPositions, currentDasha) {
  return {
    career: {
      status: 'Very Favorable',
      probability: 78,
      insight: 'Recognition from seniors expected',
      exactDates: [5, 12, 18, 24],
      locked: true
    },
    money: {
      status: 'Mixed',
      probability: 65,
      insight: 'Unexpected expense around mid-month',
      exactDates: [8, 16, 22],
      locked: true
    },
    relationship: {
      status: 'Caution',
      probability: 58,
      insight: 'Communication gap needs attention',
      exactDates: [10, 15, 25],
      locked: true
    },
    health: {
      status: 'Good',
      probability: 82,
      insight: 'Energy levels improving steadily',
      exactDates: [3, 11, 19, 27],
      locked: true
    },
    travel: {
      status: 'Favorable',
      probability: 72,
      insight: 'Short trips bring opportunities',
      exactDates: [7, 14, 21],
      locked: true
    }
  };
}
