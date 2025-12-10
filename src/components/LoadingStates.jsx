'use client'

import { 
  Rocket, 
  Star, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  Heart, 
  Phone, 
  Wallet,
  Hash,
  Zap,
  Users,
  User,
  Settings,
  Moon,
  Sun
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

/**
 * Reusable Loading Component with Page-Specific Animations
 */
export function PageLoading({ type = 'default', message = null }) {
  const { theme } = useTheme()
  const isCosmic = theme === 'cosmic'

  const loadingConfigs = {
    // Cosmic Event Tracker
    cosmic: {
      icon: Rocket,
      message: message || 'Scanning the cosmos for celestial visitors...',
      colors: {
        bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        text: '#6b7280'
      }
    },
    // Predictions / AI Predictions
    predictions: {
      icon: Sparkles,
      message: message || 'Consulting the stars for your predictions...',
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Panchang
    panchang: {
      icon: Calendar,
      message: message || 'Calculating today\'s Panchang...',
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Matching / Compatibility
    matching: {
      icon: Heart,
      message: message || 'Analyzing compatibility between charts...',
      colors: {
        bg: 'linear-gradient(135deg, #ec4899, #f43f5e)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Talk to Astrologer
    astrologer: {
      icon: Phone,
      message: message || 'Connecting you with an astrologer...',
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Wallet
    wallet: {
      icon: Wallet,
      message: message || 'Loading your wallet...',
      colors: {
        bg: 'linear-gradient(135deg, #10b981, #059669)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Numerology
    numerology: {
      icon: Hash,
      message: message || 'Calculating your numerology...',
      colors: {
        bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Transit
    transit: {
      icon: Zap,
      message: message || 'Analyzing planetary transits...',
      colors: {
        bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Profile
    profile: {
      icon: User,
      message: message || 'Loading your profile...',
      colors: {
        bg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Kundali
    kundali: {
      icon: Star,
      message: message || 'Generating your birth chart...',
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    },
    // Default
    default: {
      icon: Moon,
      message: message || 'Loading...',
      colors: {
        bg: isCosmic 
          ? 'linear-gradient(135deg, rgba(22, 33, 62, 0.9), rgba(30, 40, 70, 0.9))'
          : 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: isCosmic ? '#d4af37' : '#6b7280'
      }
    }
  }

  const config = loadingConfigs[type] || loadingConfigs.default
  const Icon = config.icon

  return (
    <div 
      className="page-loading-container"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        padding: '2rem',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: isCosmic 
          ? '#0a0a0f'
          : 'linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)',
      }}
    >
      <div 
        className="page-loading-spinner"
        style={{
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: config.colors.bg,
          borderRadius: '9999px',
          boxShadow: `0 0 30px ${isCosmic ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.3)'}`,
          animation: 'loadingPulse 2s ease-in-out infinite',
          border: isCosmic ? '1px solid rgba(212, 175, 55, 0.3)' : 'none',
        }}
      >
        <Icon 
          className="page-loading-icon"
          style={{
            width: '48px',
            height: '48px',
            color: 'white',
            animation: 'loadingFloat 3s ease-in-out infinite',
          }}
        />
      </div>
      <p 
        className="page-loading-text"
        style={{
          fontSize: '1.125rem',
          color: config.colors.text,
          fontWeight: 500,
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        {config.message}
      </p>
      <style jsx>{`
        @keyframes loadingPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.05);
          }
        }
        
        @keyframes loadingFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(10deg);
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Inline loading spinner for smaller components
 */
export function InlineLoading({ size = 24, color = '#d4af37' }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `3px solid ${color}20`,
          borderTop: `3px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

