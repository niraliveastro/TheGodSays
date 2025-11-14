# TheGodSays - Comprehensive Vedic Astrology Platform

A modern, full-featured Progressive Web App (PWA) for Vedic astrology services, daily Panchang, personalized astrological insights, live consultations, and advanced astrological calculations.

## Core Features

### Panchang & Timings
- **Daily Panchang**: Real-time Tithi, Nakshatra, Yoga, Karana calculations
- **Planetary Timings**: Sunrise, Sunset, Moonrise, Moonset with location-based accuracy
- **Inauspicious Periods**: Rahukalam, Gulika Kalam, Yamaganda timing calculations
- **Hora Timings**: Hourly planetary periods with quality indicators
- **Choghadiya Timings**: Auspicious and inauspicious time periods for daily activities
- **Muhurat Calculations**: Abhijit Muhurat, Amrit Kaal, Brahma Muhurat
- **Lunar Timings**: Tithi timings with start and end times
- **Festival Calendar**: Hindu festivals and auspicious days notifications

### Vedic Astrology Services

#### Birth Chart Analysis
- **Kundali Generation**: Comprehensive Janam Kundali (birth chart) with SVG visualization
- **Planetary Positions**: Detailed planetary placements with house positions
- **Divisional Charts**: D1, D9 (Navamsa) charts support
- **Ashtakoot Matching**: Comprehensive compatibility analysis for marriage matching
- **Shadbala Calculations**: Planetary strength analysis with Ishta and Kashta phala
- **Dasha System**: Vimsottari Maha Dasha and Antar Dasha predictions

#### Advanced Calculations
- **Numerology**: Complete numerology analysis including:
  - Pythagorean and Chaldean number systems
  - Life Path, Destiny, Soul Urge, Dream, Power numbers
  - Mulank (birth number) calculations
  - Composite personality traits with Fame, Wealth, Luck, Health, Speed metrics
- **Transit Analysis**: 5-year planetary transit data for all planets including:
  - Current transit positions with countdown timers
  - Upcoming transits for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu
  - Real-time countdown to next transits
- **Predictions**: Personalized daily, weekly, and monthly predictions based on birth chart
- **Cosmic Event Tracker**: Track astronomical events, planetary movements, and their astrological significance

### Live Consultation Platform

#### User Features
- **Astrologer Directory**: Browse qualified astrologers with ratings and reviews
- **Live Audio/Video Calls**: Real-time consultation via LiveKit integration
- **Call History**: Track past consultations and session recordings
- **Wallet System**: Secure payment system with Razorpay integration
- **Rating & Reviews**: Submit and view astrologer reviews

#### Astrologer Features
- **Astrologer Dashboard**: Manage availability, pricing, and earnings
- **Dynamic Pricing**: Set custom consultation rates
- **Status Management**: Online/Offline status control
- **Earnings Tracking**: View consultation history and billing reports
- **Profile Management**: Update credentials, specializations, and bio

### User Management
- **Firebase Authentication**: Secure user authentication and authorization
- **User Profiles**: Personalized user profiles with birth data storage
- **Role-Based Access**: Separate user and astrologer authentication flows
- **Protected Routes**: Middleware-based route protection

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.3 with App Router
- **React**: React 19.1.0 with Server Components
- **Styling**: Custom CSS with Tailwind CSS 3.4.18
- **UI Components**: Radix UI primitives (Dialog, Select, Slot, Toast)
- **Icons**: Lucide React + React Icons
- **Charts**: Recharts for data visualization
- **PDF Generation**: jsPDF with AutoTable for report generation

### Backend & APIs
- **Authentication**: Firebase 12.3.0 + Firebase Admin 13.5.0
- **Real-time Communication**: LiveKit Client 2.13.3 + Server SDK 2.14.0
- **Payment Gateway**: Razorpay 2.9.6
- **State Management**: TanStack Query 5.89.0 with DevTools
- **Date Handling**: date-fns 2.30.0

### Infrastructure
- **PWA Support**: Offline-first Progressive Web App capabilities
- **API Routes**: Next.js API routes for backend functionality
- **CSRF Protection**: Custom CSRF token implementation
- **Rate Limiting**: API rate limiting middleware
- **Caching**: LocalStorage and in-memory caching strategies

## API Endpoints

### Astrology Calculations (`/api/astro/[...endpoint]`)
Comprehensive astrology calculation API with support for 40+ endpoints:

**Panchang & Timings**
- `tithi-timings` - Lunar day calculations
- `nakshatra-timings` - Lunar mansion timings
- `yoga-durations` - Yoga period calculations
- `karana-timings` - Half lunar day timings
- `hora-timings` - Planetary hour timings
- `choghadiya-timings` - Auspicious time periods
- `abhijit-muhurat` - Abhijit Muhurat timing
- `amrit-kaal` - Amrit Kaal timing
- `brahma-muhurat` - Brahma Muhurat timing
- `rahu-kalam` - Rahu Kalam period
- `yama-gandam` - Yama Gandam period
- `gulika-kalam` - Gulika Kalam period
- `dur-muhurat` - Inauspicious periods
- `varjyam` - Varjyam timings
- `good-bad-times` - Combined auspicious/inauspicious analysis

**Calendar & Metadata**
- `vedic-weekday` - Traditional weekday calculation
- `lunar-month-info` - Lunar month details
- `ritu-information` - Seasonal information
- `samvat-information` - Era and calendar info
- `aayanam` - Precession of equinoxes

**Chart & Planetary Analysis**
- `horoscope-chart-svg-code` - Generate Kundali SVG
- `planets` - Basic planetary positions
- `planets/extended` - Extended planetary data with dignity
- `planets/tropical` - Tropical planetary positions
- `western/natal-wheel-chart` - Western astrology chart

**Dasha Systems**
- `vimsottari/dasa-information` - Current Dasha details
- `vimsottari/maha-dasas` - Maha Dasha list
- `vimsottari/maha-dasas-and-antar-dasas` - Combined Maha + Antar Dasha

**Advanced Calculations**
- `shadbala/summary` - Planetary strength analysis
- `match-making/ashtakoot-score` - Compatibility analysis

### User & Authentication (`/api/user/profile`)
- `GET` - Fetch user profile data
- `PUT` - Update user profile information

### Astrologer Management (`/api/astrologer/status`)
- `GET` - Get astrologer online/offline status

### Call Management (`/api/calls`)
- `POST` - Initiate consultation call
- `GET` - Retrieve active call sessions
- `/api/calls/history` - Get call history

### LiveKit Integration (`/api/livekit/create-session`)
- `POST` - Create LiveKit room session for audio/video calls

### Payment System
- `/api/payments/config` - Get Razorpay configuration
- `/api/payments/verify` - Verify payment signature
- `/api/payments/wallet` - Wallet operations

### Pricing & Billing
- `/api/pricing` - Get astrologer pricing
- `/api/billing` - Billing and invoice generation

### Reviews System (`/api/reviews`)
- `GET` - Fetch astrologer reviews
- `POST` - Submit new review
- `DELETE` - Remove review
- `/api/reviews/recalculate` - Recalculate rating statistics

## Project Structure

```
src/
├── app/
│   ├── layout.js                    # Root layout with providers
│   ├── page.js                      # Home page (Generic Panchang)
│   ├── providers.js                 # TanStack Query provider
│   ├── middleware.js                # Route protection middleware
│   │
│   ├── auth/                        # Authentication pages
│   │   ├── page.js                  # Auth landing page
│   │   ├── user/                    # User authentication
│   │   └── astrologer/              # Astrologer authentication
│   │
│   ├── panchang/                    # Panchang features
│   │   ├── page.js                  # Generic Panchang
│   │   ├── personalized/            # Personalized Panchang
│   │   ├── calender/                # Calendar view
│   │   ├── choghadiya-timings/      # Choghadiya page
│   │   ├── hora-timings/            # Hora timings
│   │   ├── tithi-timings/           # Tithi calculations
│   │   ├── kundali/                 # Kundali generation
│   │   └── maha-dasas/              # Dasha analysis
│   │
│   ├── numerology/                  # Numerology calculator
│   ├── matching/                    # Kundali matching
│   ├── predictions/                 # Astrological predictions
│   ├── transit/                     # Planetary transit tracker
│   ├── cosmic-event-tracker/        # Cosmic events
│   │
│   ├── talk-to-astrologer/          # Consultation platform
│   │   ├── page.js                  # Astrologer listing
│   │   ├── room/[room]/             # Video call room
│   │   └── voice/[room]/            # Audio call room
│   │
│   ├── astrologer-dashboard/        # Astrologer dashboard
│   │   └── pricing/                 # Pricing management
│   │
│   ├── account/                     # User accounts
│   ├── wallet/                      # Wallet management
│   ├── profile/                     # Profile pages
│   │
│   └── api/                         # API routes
│       ├── astro/[...endpoint]/     # Astrology calculations
│       ├── user/profile/            # User profile API
│       ├── astrologer/status/       # Astrologer status
│       ├── calls/                   # Call management
│       ├── livekit/create-session/  # LiveKit sessions
│       ├── payments/                # Payment APIs
│       ├── pricing/                 # Pricing API
│       ├── billing/                 # Billing API
│       └── reviews/                 # Review system
│
├── components/
│   ├── ui/                          # Radix UI components
│   │   ├── badge.js
│   │   ├── button.js
│   │   ├── card.js
│   │   └── input.js
│   │
│   ├── calendar/                    # Calendar components
│   │   ├── MonthlyCalendar.jsx
│   │   ├── CalendarCell.jsx
│   │   ├── CalendarCell2.jsx
│   │   └── HinduDateCard.jsx
│   │
│   ├── Navigation.js                # Main navigation
│   ├── AuthGuard.js                 # Route protection
│   ├── AstrologyForm.js             # Astrology input forms
│   ├── AstrologyOptions.js          # Calculation options
│   ├── AstrologyResult.js           # Result display
│   ├── AstrologyResults.js          # Multiple results
│   ├── PanchangCard.js              # Panchang data cards
│   ├── TimingsSection.js            # Inauspicious timings
│   ├── FestivalCard.js              # Festival display
│   ├── HoraTimeline.js              # Hora timeline
│   ├── ChoghadiyaForm.js            # Choghadiya input
│   ├── ChoghadiyaResults.js         # Choghadiya display
│   ├── DateSelector.js              # Date picker
│   ├── Wallet.jsx                   # Wallet component
│   ├── PricingManager.jsx           # Pricing management
│   ├── ReviewModal.jsx              # Review submission
│   ├── Modal.jsx                    # Generic modal
│   ├── CallNotification.jsx         # Call notifications
│   ├── CallConnectingNotification.jsx
│   ├── VoiceCallNotification.jsx
│   ├── ConnectingNotification.jsx
│   ├── PWAInstaller.js              # PWA installation
│   └── ServiceWorkerRegistration.js # SW registration
│
├── lib/
│   ├── api.js                       # Astrology API client
│   ├── firebase.js                  # Firebase client
│   ├── firebase-admin.js            # Firebase admin
│   ├── razorpay.js                  # Razorpay integration
│   ├── billing.js                   # Billing utilities
│   ├── pricing.js                   # Pricing logic
│   ├── wallet.js                    # Wallet operations
│   ├── validation.js                # Form validation
│   ├── csrf.js                      # CSRF protection
│   ├── rateLimit.js                 # Rate limiting
│   ├── utils.js                     # Utility functions
│   ├── mockData.js                  # Mock data for dev
│   ├── nasaAPI.js                   # NASA API integration
│   └── staticCalendarSep2025.js     # Static calendar data
│
├── contexts/
│   └── AuthContext.js               # Authentication context
│
└── public/
    ├── manifest.json                # PWA manifest
    ├── sw.js                        # Service worker
    └── test.txt                     # Test files
```

## Key Features Breakdown

### Kundali (Birth Chart) System
- Interactive form with place autocomplete using geocoding
- Calendar widget for date selection with year/month navigation
- 12/24 hour time format support with AM/PM toggle
- Automatic timezone detection based on coordinates
- SVG-based chart generation with proper house divisions
- Gender selection (Male/Female/Other)
- Multi-language support

### Matching (Compatibility Analysis)
- Dual input forms for both partners
- Ashtakoot (8-point) compatibility scoring
- Detailed analysis of:
  - Varna (Spiritual compatibility)
  - Vashya (Mutual attraction)
  - Tara (Birth star compatibility)
  - Yoni (Nature compatibility)
  - Graha Maitri (Planetary friendship)
  - Gana (Temperament)
  - Bhakoot (Emotional compatibility)
  - Nadi (Health compatibility)
- Individual Shadbala analysis for both partners
- Current Dasha information
- Planetary positions comparison
- Ishta and Kashta phala calculations

### Numerology System
- Pythagorean number system (1-9 mapping)
- Chaldean number system (1-8 mapping)
- Multiple number calculations:
  - Expression/Destiny Number
  - Soul Urge Number
  - Personality/Dream Number
  - Power Number
  - Life Path Number
  - Mulank (Birth Number)
- Composite personality analysis:
  - Fame potential
  - Wealth indicators
  - Luck factor
  - Health prospects
  - Speed/Success timing
- Calculation history with localStorage persistence
- Visual star rating display for personality traits

### Transit Analysis
- Real-time planetary position tracking
- 5-year transit data for all major planets
- Next immediate transit countdown with live timers
- Current transit details with duration calculations
- Tabbed interface for planet-specific transit schedules
- Visual countdown display showing days, hours, minutes, seconds
- Color-coded planet indicators
- Zodiac symbol integration

### Consultation Platform
- LiveKit-powered audio/video calls
- Real-time connection status
- Call quality indicators
- Screen sharing support (video calls)
- Call duration tracking
- Per-minute billing system
- Automatic wallet deduction
- Call recording capabilities
- Call history with timestamps
- Rating system post-consultation

## Environment Setup

Create a `.env.local` file with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_admin_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Razorpay Payment Gateway
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret
NEXT_PUBLIC_LIVEKIT_URL=your_livekit_url

# External APIs
NASA_API_KEY=your_nasa_api_key
```

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development Workflow

1. The application runs on `http://localhost:3000` by default
2. API routes are available at `http://localhost:3000/api/*`
3. Use the TanStack Query DevTools for debugging (development only)
4. Check browser console for service worker status

## PWA Features

- **Offline Support**: Cached resources for offline viewing
- **Installable**: Can be installed as native app on mobile/desktop
- **App-like Experience**: Fullscreen mode, splash screen
- **Background Sync**: Sync data when connection is restored
- **Push Notifications**: (Ready for implementation)
- **Fast Loading**: Optimized performance with caching strategies

## Security Features

- **CSRF Protection**: Token-based CSRF validation
- **Rate Limiting**: API request throttling to prevent abuse
- **Firebase Security Rules**: Firestore and Authentication rules
- **Payment Verification**: Server-side Razorpay signature verification
- **Route Protection**: Middleware-based authentication checks
- **Input Validation**: Comprehensive form validation
- **XSS Prevention**: Input sanitization and CSP headers

## Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component usage
- **Lazy Loading**: Dynamic imports for heavy components
- **Caching Strategy**: 
  - localStorage for persistent user data
  - In-memory cache for API responses
  - Service Worker cache for assets
- **Query Optimization**: TanStack Query for efficient data fetching
- **CSS Optimization**: Custom CSS with minimal Tailwind usage

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari: iOS 12+
- Chrome Mobile: Android 5+

## Contributing

This project is part of the TheGodSays platform. For contribution guidelines, please contact the development team.

## License

Proprietary - All rights reserved by TheGodSays/SpaceNOS

## Support

For technical support or queries:
- Platform: TheGodSays
- Organization: SpaceNOS