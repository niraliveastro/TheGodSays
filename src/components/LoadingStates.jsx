'use client'

import { useState, useEffect } from 'react'
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
/**
 * Reusable Loading Component with Page-Specific Animations
 * Supports rotating messages for better user engagement
 */
export function PageLoading({ type = 'default', message = null, rotatingMessages = null }) {
  // Rotating messages state
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  
  const loadingConfigs = {
    // Cosmic Event Tracker
    cosmic: {
      icon: Rocket,
      message: message || 'Scanning the cosmos for celestial visitors...',
      rotatingMessages: rotatingMessages || [
        'Scanning the cosmos...',
        'Detecting near-Earth objects...',
        'Analyzing orbital data...',
        'Calculating trajectories...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: '#6b7280'
      }
    },
    // Predictions / AI Predictions
    predictions: {
      icon: Sparkles,
      message: message || 'Consulting the stars for your predictions...',
      rotatingMessages: rotatingMessages || [
        'Consulting the stars...',
        'Analyzing your birth chart...',
        'Calculating planetary positions...',
        'Generating predictions...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: '#6b7280'
      }
    },
    // Panchang
    panchang: {
      icon: Calendar,
      message: message || 'Calculating today\'s Panchang...',
      rotatingMessages: rotatingMessages || [
        'Calculating today\'s Panchang...',
        'Fetching tithi timings...',
        'Calculating nakshatra...',
        'Determining auspicious times...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: '#6b7280'
      }
    },
    // Matching / Compatibility
    matching: {
      icon: Heart,
      message: message || 'Analyzing compatibility between charts...',
      rotatingMessages: rotatingMessages || [
        'Analyzing compatibility...',
        'Comparing birth charts...',
        'Calculating gunas...',
        'Evaluating planetary positions...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #ec4899, #f43f5e)',
        text: '#6b7280'
      }
    },
    // Talk to Astrologer
    astrologer: {
      icon: Phone,
      message: message || 'Connecting you with an astrologer...',
      rotatingMessages: rotatingMessages || [
        'Finding available astrologers...',
        'Checking availability...',
        'Loading astrologer profiles...',
        'Preparing connection...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: '#6b7280'
      }
    },
    // Wallet
    wallet: {
      icon: Wallet,
      message: message || 'Loading your wallet...',
      rotatingMessages: rotatingMessages || [
        'Loading your wallet...',
        'Fetching balance...',
        'Loading transactions...',
        'Calculating totals...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #10b981, #059669)',
        text: '#6b7280'
      }
    },
    // Numerology
    numerology: {
      icon: Hash,
      message: message || 'Calculating your numerology...',
      rotatingMessages: rotatingMessages || [
        'Calculating your numerology...',
        'Analyzing name numbers...',
        'Computing life path...',
        'Determining destiny number...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        text: '#6b7280'
      }
    },
    // Transit
    transit: {
      icon: Zap,
      message: message || 'Analyzing planetary transits...',
      rotatingMessages: rotatingMessages || [
        'Analyzing planetary transits...',
        'Calculating current positions...',
        'Comparing with birth chart...',
        'Determining effects...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        text: '#6b7280'
      }
    },
    // Profile
    profile: {
      icon: User,
      message: message || 'Loading your profile...',
      rotatingMessages: rotatingMessages || [
        'Loading your profile...',
        'Loading your calls...',
        'Loading your wallet...',
        'Loading family members...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: '#6b7280'
      }
    },
    // Kundali
    kundali: {
      icon: Star,
      message: message || 'Generating your birth chart...',
      rotatingMessages: rotatingMessages || [
        'Generating your birth chart...',
        'Calculating planetary positions...',
        'Determining houses...',
        'Analyzing aspects...',
        'Almost there...'
      ],
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: '#6b7280'
      }
    },
    // Default
    default: {
      icon: Moon,
      message: message || 'Loading...',
      colors: {
        bg: 'linear-gradient(135deg, #d4af37, #b8972e)',
        text: '#6b7280'
      }
    }
  }

  const config = loadingConfigs[type] || loadingConfigs.default
  const Icon = config.icon
  
  // Use rotatingMessages prop if provided, otherwise use config's rotatingMessages
  const activeRotatingMessages = rotatingMessages || config.rotatingMessages
  
  // Handle rotating messages
  useEffect(() => {
    if (activeRotatingMessages && activeRotatingMessages.length > 1) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % activeRotatingMessages.length)
      }, 2000) // Change message every 2 seconds
      
      return () => clearInterval(interval)
    }
  }, [activeRotatingMessages])
  
  // Determine which message to show
  let displayMessage = config.message
  if (activeRotatingMessages && activeRotatingMessages.length > 0) {
    displayMessage = activeRotatingMessages[currentMessageIndex]
  }

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
        background: 'linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)',
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
          boxShadow: `0 0 30px ${'rgba(212, 175, 55, 0.3)'}`,
          animation: 'loadingPulse 2s ease-in-out infinite',
          border: 'none',
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
        key={currentMessageIndex}
        style={{
          fontSize: '1.125rem',
          color: config.colors.text,
          fontWeight: 500,
          textAlign: 'center',
          maxWidth: '400px',
          transition: 'opacity 0.3s ease-in-out',
          animation: 'fadeIn 0.3s ease-in-out',
        }}
      >
        {displayMessage}
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
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

