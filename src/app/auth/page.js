'use client'

/**
 * Authentication Landing Module
 * 
 * This module provides the entry point landing page for user authentication in a consultation platform.
 * It presents two role-based choices: "User" (seeker) or "Astrologer" (expert), each directing to their
 * respective authentication flows. The page features animated background elements, promotional content,
 * and interactive cards with hover effects and navigation.
 * 
 * Key Features:
 * - Role selection cards with visual glow effects and feature highlights.
 * - Responsive grid layout for desktop and mobile.
 * - Branded header with logo and cosmic-themed messaging.
 * - Footer with trust-building text.
 * 
 * Dependencies:
 * - Next.js (useRouter)
 * - Lucide React icons
 * - CSS Modules: './auth.module.css' for scoped styling (assumes classes like auth-landing-page, card-glow, etc.)
 * 
 * Styling: Relies on CSS modules for animations (orbs), gradients, and interactive states (glow, hover).
 * No form handling; purely navigational.
 * 
 * @module AuthLanding
 */

import { useRouter } from 'next/navigation'
import { User, Star, ArrowRight, Sparkles } from 'lucide-react'
import styles from './auth.module.css'  

/**
 * AuthLanding Component
 * 
 * The landing page for authentication role selection.
 * Renders a visually engaging page with two clickable cards to route users to either
 * the user auth flow or astrologer auth flow based on their role.
 * 
 * @returns {JSX.Element} The authentication landing page UI.
 */
export default function AuthLanding() {
  const router = useRouter() // Next.js router for programmatic navigation

  // Main render: Landing page layout
  return (
    <div className={styles['auth-landing-page']}>
      {/* Animated background orbs – decorative floating elements for visual interest */}
      <div className={`${styles['bg-orb']} ${styles['bg-orb-1']}`} />
      <div className={`${styles['bg-orb']} ${styles['bg-orb-2']}`} />
      <div className={`${styles['bg-orb']} ${styles['bg-orb-3']}`} />

      {/* Main container – Centers content with padding */}
      <div className={styles['auth-landing-container']}>
        {/* Header – Branding and introductory messaging */}
        <div className={styles['auth-landing-header']}>
          <div className={styles['landing-logo-badge']}>
            <Sparkles className={styles['landing-logo-icon']} /> {/* Animated sparkle icon */}
          </div>
          <h1 className={styles['landing-title']}>Welcome to TheGodSays</h1>
          <p className={styles['landing-subtitle']}>
            Connect with experienced astrologers or share your expertise with seekers worldwide.
          </p>
        </div>

        {/* Cards Grid – Role selection interactive cards */}
        <div className={styles['auth-landing-grid']}>
          {/* User Card – For seekers/clients */}
          <div 
            className={`${styles['auth-choice-card']} ${styles['user-card']}`}
            onClick={() => router.push('/auth/user')} // Navigate to user auth page
          >
            <div className={`${styles['card-glow']} ${styles['user-glow']}`} /> {/* Glow overlay for visual effect */}
            <div className={styles['card-content']}>
              <div className={`${styles['card-icon-wrapper']} ${styles['user-icon-wrapper']}`}>
                <User className={styles['card-icon']} /> {/* User icon */}
              </div>
              <h2 className={styles['card-title']}>I am a User</h2>
              <p className={styles['card-description']}>
                Seek guidance from experienced astrologers for life questions, career decisions, and personal growth.
              </p>
              {/* Feature highlights for users */}
              <div className={styles['card-features']}>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['user-dot']}`} /> {/* Visual dot indicator */}
                  <span>Expert Consultations</span>
                </div>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['user-dot']}`} />
                  <span>Personalized Readings</span>
                </div>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['user-dot']}`} />
                  <span>24/7 Availability</span>
                </div>
              </div>
              <button className={`${styles['choice-btn']} ${styles['user-btn']}`}>
                <span>Continue as User</span>
                <ArrowRight className={styles['btn-arrow']} /> {/* Arrow icon for direction */}
              </button>
            </div>
          </div>

          {/* Astrologer Card – For experts/providers */}
          <div 
            className={`${styles['auth-choice-card']} ${styles['astrologer-card']}`}
            onClick={() => router.push('/auth/astrologer')} // Navigate to astrologer auth page
          >
            <div className={`${styles['card-glow']} ${styles['astrologer-glow']}`} /> {/* Glow overlay for visual effect */}
            <div className={styles['card-content']}>
              <div className={`${styles['card-icon-wrapper']} ${styles['astrologer-icon-wrapper']}`}>
                <Star className={styles['card-icon']} /> {/* Star icon for expertise */}
              </div>
              <h2 className={styles['card-title']}>I am an Astrologer</h2>
              <p className={styles['card-description']}>
                Share your astrological expertise and help people find clarity while building your practice.
              </p>
              {/* Feature highlights for astrologers */}
              <div className={styles['card-features']}>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['astrologer-dot']}`} /> {/* Visual dot indicator */}
                  <span>Build Your Reputation</span>
                </div>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['astrologer-dot']}`} />
                  <span>Flexible Scheduling</span>
                </div>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['astrologer-dot']}`} />
                  <span>Global Reach</span>
                </div>
              </div>
              <button className={`${styles['choice-btn']} ${styles['astrologer-btn']}`}>
                <span>Continue as Astrologer</span>
                <ArrowRight className={styles['btn-arrow']} /> {/* Arrow icon for direction */}
              </button>
            </div>
          </div>
        </div>

        {/* Footer – Trust-building messaging */}
        <div className={styles['auth-landing-footer']}>
          <p className={styles['footer-text']}>
            Join thousands of seekers and guides on their cosmic journey
          </p>
        </div>
      </div>
    </div>
  )
}