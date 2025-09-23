// Static monthly calendar data to match the reference UI (September 2025)
// Each cell contains: date, monthOffset (-1 prev, 0 current, 1 next), tithiBand, sunrise, sunset,
// line1, line2, isFestival, isToday, icons (small emoji strings for placeholders)

export const WEEKDAYS = [
  { en: 'SUN', hi: 'रवि' },
  { en: 'MON', hi: 'सोम' },
  { en: 'TUE', hi: 'मंगल' },
  { en: 'WED', hi: 'बुध' },
  { en: 'THU', hi: 'गुरु' },
  { en: 'FRI', hi: 'शुक्र' },
  { en: 'SAT', hi: 'शनि' },
]

export const staticHeader = {
  selectedBanner: {
    leftTitle: '16, Ashwina',
    leftSubtitle: 'Shukla Paksha, Pratipada',
    era: '2082 Kaliyukta, Vikrama Samvata',
    location: 'Bhopal, India',
  },
  rightTitle: '22',
  rightSubtitle1: 'September 2025',
  rightSubtitle2: 'Monday',
  ribbons: ['Navratri Begins', 'Ghatasthapana', 'Surya Grahan *Anshika', 'Ishti'],
}

// Grid is 6 rows x 7 columns; include previous/next month overflow days with monthOffset
export const staticMonth = {
  monthLabel: 'September 2025',
  weekStart: 0, // 0 = Sunday
  rows: [
    [
      { date: 31, monthOffset: -1, tithiBand: 'Ashtami Shukla', sunrise: '06:06', sunset: '18:17', line1: 'Vrishchika 19:55', line2: 'Vishakha 10:53', tone: 'muted' },
      { date: 1, monthOffset: 0, tithiBand: 'Navami Shukla', sunrise: '06:06', sunset: '18:17', line1: 'Vrishchika 19:55', line2: 'Vishakha 10:53' },
      { date: 2, monthOffset: 0, tithiBand: 'Dashami Shukla', sunrise: '06:07', sunset: '18:16', line1: 'Chitra', line2: '—' },
      { date: 3, monthOffset: 0, tithiBand: 'Ekadashi Shukla', sunrise: '06:07', sunset: '18:14', line1: 'Hasta', line2: '—' },
      { date: 4, monthOffset: 0, tithiBand: 'Dwadashi Shukla', sunrise: '06:08', sunset: '18:13', line1: 'Chitra 12:48', line2: '—' },
      { date: 5, monthOffset: 0, tithiBand: 'Trayodashi Shukla', sunrise: '06:08', sunset: '18:12', line1: 'Purnima 06:01', line2: '—' },
      { date: 6, monthOffset: 0, tithiBand: 'Chaturdashi Shukla', sunrise: '06:09', sunset: '18:11', line1: 'Anuradha 22:55', line2: '—' },
    ],
    [
      { date: 7, monthOffset: 0, tithiBand: 'Purnima Shukla', sunrise: '06:09', sunset: '18:10', line1: 'Vrishchika 19:55', line2: 'Vishakha 10:53', tone: 'highlight' },
      { date: 8, monthOffset: 0, tithiBand: 'Pratipada Krishna', sunrise: '06:10', sunset: '18:09', line1: 'Pushya 08:24', line2: '—' },
      { date: 9, monthOffset: 0, tithiBand: 'Dwitiya Krishna', sunrise: '06:10', sunset: '18:08', line1: 'Ashlesha 12:12', line2: '—' },
      { date: 10, monthOffset: 0, tithiBand: 'Tritiya Krishna', sunrise: '06:10', sunset: '18:07', line1: 'Magha 18:06', line2: '—' },
      { date: 11, monthOffset: 0, tithiBand: 'Chaturthi Krishna', sunrise: '06:11', sunset: '18:06', line1: 'Purva Phalguni 24:50', line2: '—' },
      { date: 12, monthOffset: 0, tithiBand: 'Panchami Krishna', sunrise: '06:11', sunset: '18:05', line1: 'Uttara Phalguni', line2: '—' },
      { date: 13, monthOffset: 0, tithiBand: 'Shashthi Krishna', sunrise: '06:12', sunset: '18:04', line1: 'Hasta 11:30', line2: '—' },
    ],
    [
      { date: 14, monthOffset: 0, tithiBand: 'Saptami Krishna', sunrise: '06:12', sunset: '18:03', line1: 'Chitra', line2: '—', icons: ['🌑'] },
      { date: 15, monthOffset: 0, tithiBand: 'Ashtami Krishna', sunrise: '06:12', sunset: '18:02', line1: 'Swati 10:05', line2: '—' },
      { date: 16, monthOffset: 0, tithiBand: 'Navami Krishna', sunrise: '06:13', sunset: '18:01', line1: 'Vishakha 20:04', line2: '—' },
      { date: 17, monthOffset: 0, tithiBand: 'Dashami Krishna', sunrise: '06:13', sunset: '18:00', line1: 'Anuradha 25:02', line2: '—' },
      { date: 18, monthOffset: 0, tithiBand: 'Ekadashi Krishna', sunrise: '06:13', sunset: '17:59', line1: 'Jyeshtha', line2: '—' },
      { date: 19, monthOffset: 0, tithiBand: 'Dwadashi Krishna', sunrise: '06:14', sunset: '17:58', line1: 'Mula 07:59', line2: '—' },
      { date: 20, monthOffset: 0, tithiBand: 'Trayodashi Krishna', sunrise: '06:14', sunset: '17:57', line1: 'Purvashada 13:02', line2: '—' },
    ],
    [
      { date: 21, monthOffset: 0, tithiBand: 'Chaturdashi Krishna', sunrise: '06:15', sunset: '17:56', line1: 'Uttara 18:06', line2: '—', isFestival: true },
      { date: 22, monthOffset: 0, tithiBand: 'Pratipada Shukla', sunrise: '06:15', sunset: '17:55', line1: 'Kanya Sankranti', line2: 'Sun: 06:15 | 17:55', isToday: true, tone: 'selected' },
      { date: 23, monthOffset: 0, tithiBand: 'Dwitiya Shukla', sunrise: '06:15', sunset: '17:54', line1: 'Chandra Darshan', line2: '—' },
      { date: 24, monthOffset: 0, tithiBand: 'Tritiya Shukla', sunrise: '06:16', sunset: '17:53', line1: '—', line2: '—' },
      { date: 25, monthOffset: 0, tithiBand: 'Chaturthi Shukla', sunrise: '06:16', sunset: '17:52', line1: '—', line2: '—' },
      { date: 26, monthOffset: 0, tithiBand: 'Panchami Shukla', sunrise: '06:17', sunset: '17:51', line1: '—', line2: '—' },
      { date: 27, monthOffset: 0, tithiBand: 'Shashthi Shukla', sunrise: '06:17', sunset: '17:50', line1: '—', line2: '—' },
    ],
    [
      { date: 28, monthOffset: 0, tithiBand: 'Saptami Shukla', sunrise: '06:18', sunset: '17:49', line1: '—', line2: '—' },
      { date: 29, monthOffset: 0, tithiBand: 'Ashtami Shukla', sunrise: '06:18', sunset: '17:48', line1: '—', line2: '—' },
      { date: 30, monthOffset: 0, tithiBand: 'Navami Shukla', sunrise: '06:18', sunset: '17:47', line1: '—', line2: '—' },
      { date: 1, monthOffset: 1, tithiBand: 'Dashami Shukla', sunrise: '06:19', sunset: '17:46', line1: '—', line2: '—', tone: 'muted' },
      { date: 2, monthOffset: 1, tithiBand: 'Ekadashi Shukla', sunrise: '06:19', sunset: '17:45', line1: '—', line2: '—', tone: 'muted' },
      { date: 3, monthOffset: 1, tithiBand: 'Dwadashi Shukla', sunrise: '06:20', sunset: '17:44', line1: '—', line2: '—', tone: 'muted' },
      { date: 4, monthOffset: 1, tithiBand: 'Trayodashi Shukla', sunrise: '06:20', sunset: '17:43', line1: '—', line2: '—', tone: 'muted' },
    ],
    [
      { date: 5, monthOffset: 1, tithiBand: 'Chaturdashi Shukla', sunrise: '06:21', sunset: '17:42', line1: '—', line2: '—', tone: 'muted' },
      { date: 6, monthOffset: 1, tithiBand: 'Purnima Shukla', sunrise: '06:21', sunset: '17:41', line1: '—', line2: '—', tone: 'muted' },
      { date: 7, monthOffset: 1, tithiBand: 'Pratipada Krishna', sunrise: '06:22', sunset: '17:40', line1: '—', line2: '—', tone: 'muted' },
      { date: 8, monthOffset: 1, tithiBand: 'Dwitiya Krishna', sunrise: '06:22', sunset: '17:39', line1: '—', line2: '—', tone: 'muted' },
      { date: 9, monthOffset: 1, tithiBand: 'Tritiya Krishna', sunrise: '06:22', sunset: '17:38', line1: '—', line2: '—', tone: 'muted' },
      { date: 10, monthOffset: 1, tithiBand: 'Chaturthi Krishna', sunrise: '06:23', sunset: '17:37', line1: '—', line2: '—', tone: 'muted' },
      { date: 11, monthOffset: 1, tithiBand: 'Panchami Krishna', sunrise: '06:23', sunset: '17:36', line1: '—', line2: '—', tone: 'muted' },
    ],
  ],
}
