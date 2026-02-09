'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StarIcon, PhoneCallIcon, X, MessageCircle } from 'lucide-react'

export default function BlogFloatingCTA() {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Show CTA after user scrolls down a bit
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      
      // Show CTA after scrolling 30% of the page
      if (scrollPosition > windowHeight * 0.3) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    // Initial check
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleExpand = () => {
    setIsMinimized(false)
  }

  // Don't show anything until user scrolls
  if (!isVisible && !isMinimized) {
    return null
  }

  // Show minimized icon
  if (isMinimized) {
    return (
      <button
        className="blog-cta-minimized"
        onClick={handleExpand}
        aria-label="Open astrologer contact options"
        type="button"
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  // Show full CTA card
  return (
    <section className="blog-cta-section">
      <div className="blog-cta-container">
        <button 
          className="blog-cta-close"
          onClick={handleMinimize}
          aria-label="Minimize"
          type="button"
        >
          <X size={18} />
        </button>
        <h2 className="blog-cta-title">
          Connect with an astrologer via <strong>Call/Chat starting from ₹49.99</strong>
        </h2>

        <div className="blog-cta-actions">
          <Link href="/kundli-prediction/" className="btn btn-primary">
            <StarIcon size={16} /> AI Predictions
          </Link>

          <Link
            href="/talk-to-astrologer/"
            className="btn btn-secondary"
          >
            <PhoneCallIcon size={16} /> Talk to Astrologer
          </Link>
        </div>
      </div>
    </section>
  )
}
