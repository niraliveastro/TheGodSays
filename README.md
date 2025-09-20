# Panchang Web Application

A modern, mobile-first Progressive Web App (PWA) for daily Panchang and personalized astrological insights.

## Features

### Generic Panchang (v0)
- Daily Tithi, Nakshatra, Yoga, Karana
- Sunrise, Sunset, Moonrise, Moonset timings
- Rahukalam, Gulika, Yamaganda periods
- Hora timings with quality indicators
- Festival notifications

### Personalized Panchang (v1)
- User birth details input (Date, Time, Place)
- Personalized astrological profile (Lagna, Moon Sign, Nakshatra)
- Current Dasha period information
- Personalized daily recommendations
- Recommended Horas based on user profile

### Calendar View (v1.5)
- Monthly calendar with Panchang highlights
- Festival and important day markers
- Tithi information for each day
- Monthly summary cards

## Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + ShadCN UI components
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React
- **PWA**: next-pwa for offline support
- **Mobile-First**: Responsive design optimized for mobile devices

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── layout.js          # Root layout with providers
│   ├── page.js            # Home page (Generic Panchang)
│   ├── personalized/
│   │   └── page.js        # Personalized Panchang page
│   ├── calendar/
│   │   └── page.js        # Calendar view page
│   ├── providers.js       # React Query provider
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # ShadCN UI components
│   ├── Navigation.js      # Main navigation
│   ├── PanchangCard.js    # Panchang data cards
│   ├── TimingsSection.js  # Inauspicious timings
│   ├── FestivalCard.js    # Festival display
│   └── HoraTimeline.js    # Hora timings timeline
└── lib/
    ├── utils.js           # Utility functions
    └── mockData.js        # Mock data for development
```

## PWA Features

- **Offline Support**: Cached resources for offline viewing
- **Installable**: Can be installed on mobile devices
- **Responsive**: Optimized for mobile-first experience
- **Fast Loading**: Optimized performance and caching

## Development

The application uses mock data for development. In production, this would be replaced with real API calls to a backend service that calculates Panchang data using astronomical algorithms.

## License

This project is part of TheGodSays platform.