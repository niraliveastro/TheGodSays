// Mock data for Panchang application
export const mockPanchangData = {
  date: "2025-09-20",
  tithi: "Ashtami",
  nakshatra: "Rohini",
  yoga: "Siddhi",
  karana: "Vanija",
  sunrise: "06:10 AM",
  sunset: "06:25 PM",
  moonrise: "08:15 PM",
  moonset: "07:45 AM",
  rahukalam: "09:00 AM - 10:30 AM",
  gulika: "06:30 AM - 08:00 AM",
  yamaganda: "01:30 PM - 03:00 PM",
  // Additional auspicious/inauspicious timings
  abhijitMuhurat: "12:05 PM - 12:50 PM",
  brahmaMuhurat: "04:30 AM - 05:15 AM",
  amritKaal: "02:20 AM - 03:10 AM",
  durMuhurat: "10:30 AM - 11:15 AM",
  varjyam: "08:10 PM - 09:55 PM",
  goodBadTimes: "Good: 10:00 AM - 12:00 PM; Bad: 03:00 PM - 04:00 PM",
  festivals: [
    {
      name: "Navratri Begins",
      icon: "temple",
      description: "Nine nights of divine feminine energy"
    }
  ],
  horaTimings: [
    { planet: "Sun", start: "06:10 AM", end: "07:10 AM", quality: "Good" },
    { planet: "Venus", start: "07:10 AM", end: "08:10 AM", quality: "Excellent" },
    { planet: "Mercury", start: "08:10 AM", end: "09:10 AM", quality: "Good" },
    { planet: "Moon", start: "09:10 AM", end: "10:10 AM", quality: "Excellent" },
    { planet: "Saturn", start: "10:10 AM", end: "11:10 AM", quality: "Average" },
    { planet: "Jupiter", start: "11:10 AM", end: "12:10 PM", quality: "Excellent" },
    { planet: "Mars", start: "12:10 PM", end: "01:10 PM", quality: "Good" },
    { planet: "Sun", start: "01:10 PM", end: "02:10 PM", quality: "Good" },
    { planet: "Venus", start: "02:10 PM", end: "03:10 PM", quality: "Excellent" },
    { planet: "Mercury", start: "03:10 PM", end: "04:10 PM", quality: "Good" },
    { planet: "Moon", start: "04:10 PM", end: "05:10 PM", quality: "Excellent" },
    { planet: "Saturn", start: "05:10 PM", end: "06:10 PM", quality: "Average" }
  ]
};

export const mockPersonalizedData = {
  userProfile: {
    name: "John Doe",
    lagna: "Virgo",
    moonSign: "Virgo",
    nakshatra: "Hasta",
    birthDate: "1990-05-15",
    birthTime: "14:30",
    birthPlace: "Mumbai, India"
  },
  dasha: {
    mahadasha: "Jupiter",
    antardasha: "Jupiter-Saturn",
    meaning: "Period of wisdom and expansion with some challenges"
  },
  personalizedNotes: [
    "Moon in Rohini favors your Virgo Moon → good for studies",
    "Jupiter's influence brings opportunities for spiritual growth",
    "Avoid important decisions during Rahukalam (09:00 AM - 10:30 AM)"
  ],
  recommendedHoras: [
    { planet: "Jupiter", start: "11:10 AM", end: "12:10 PM", reason: "Your ruling planet, excellent for spiritual activities" },
    { planet: "Moon", start: "09:10 AM", end: "10:10 AM", reason: "Favorable for emotional well-being" },
    { planet: "Venus", start: "07:10 AM", end: "08:10 AM", reason: "Good for relationships and creativity" }
  ]
};

export const mockCalendarData = {
  month: "September 2025",
  days: [
    { date: 1, tithi: "Purnima", festival: null, isToday: false },
    { date: 2, tithi: "Pratipada", festival: null, isToday: false },
    { date: 3, tithi: "Dwitiya", festival: null, isToday: false },
    { date: 4, tithi: "Tritiya", festival: null, isToday: false },
    { date: 5, tithi: "Chaturthi", festival: null, isToday: false },
    { date: 6, tithi: "Panchami", festival: null, isToday: false },
    { date: 7, tithi: "Shashthi", festival: null, isToday: false },
    { date: 8, tithi: "Saptami", festival: null, isToday: false },
    { date: 9, tithi: "Ashtami", festival: null, isToday: false },
    { date: 10, tithi: "Navami", festival: null, isToday: false },
    { date: 11, tithi: "Dashami", festival: null, isToday: false },
    { date: 12, tithi: "Ekadashi", festival: null, isToday: false },
    { date: 13, tithi: "Dwadashi", festival: null, isToday: false },
    { date: 14, tithi: "Trayodashi", festival: null, isToday: false },
    { date: 15, tithi: "Chaturdashi", festival: null, isToday: false },
    { date: 16, tithi: "Amavasya", festival: null, isToday: false },
    { date: 17, tithi: "Pratipada", festival: null, isToday: false },
    { date: 18, tithi: "Dwitiya", festival: null, isToday: false },
    { date: 19, tithi: "Tritiya", festival: null, isToday: false },
    { date: 20, tithi: "Ashtami", festival: "Navratri Begins", isToday: true },
    { date: 21, tithi: "Navami", festival: null, isToday: false },
    { date: 22, tithi: "Dashami", festival: null, isToday: false },
    { date: 23, tithi: "Ekadashi", festival: null, isToday: false },
    { date: 24, tithi: "Dwadashi", festival: null, isToday: false },
    { date: 25, tithi: "Trayodashi", festival: null, isToday: false },
    { date: 26, tithi: "Chaturdashi", festival: null, isToday: false },
    { date: 27, tithi: "Purnima", festival: null, isToday: false },
    { date: 28, tithi: "Pratipada", festival: null, isToday: false },
    { date: 29, tithi: "Dwitiya", festival: null, isToday: false },
    { date: 30, tithi: "Tritiya", festival: null, isToday: false }
  ]
};

