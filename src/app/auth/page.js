'use client'

import { useRouter } from 'next/navigation'
import { User, Star, ArrowRight, Sparkles } from 'lucide-react'
import styles from './auth.module.css'  

export default function AuthLanding() {
  const router = useRouter()

  return (
    <div className={styles['auth-landing-page']}>
      {/* Animated background orbs */}
      <div className={`${styles['bg-orb']} ${styles['bg-orb-1']}`} />
      <div className={`${styles['bg-orb']} ${styles['bg-orb-2']}`} />
      <div className={`${styles['bg-orb']} ${styles['bg-orb-3']}`} />

      <div className={styles['auth-landing-container']}>
        {/* Header */}
        <div className={styles['auth-landing-header']}>
          <div className={styles['landing-logo-badge']}>
            <Sparkles className={styles['landing-logo-icon']} />
          </div>
          <h1 className={styles['landing-title']}>Welcome to TheGodSays</h1>
          <p className={styles['landing-subtitle']}>
            Connect with experienced astrologers or share your expertise with seekers worldwide.
          </p>
        </div>

        {/* Cards */}
        <div className={styles['auth-landing-grid']}>
          {/* User Card */}
          <div 
            className={`${styles['auth-choice-card']} ${styles['user-card']}`}
            onClick={() => router.push('/auth/user')}
          >
            <div className={`${styles['card-glow']} ${styles['user-glow']}`} />
            <div className={styles['card-content']}>
              <div className={`${styles['card-icon-wrapper']} ${styles['user-icon-wrapper']}`}>
                <User className={styles['card-icon']} />
              </div>
              <h2 className={styles['card-title']}>I am a User</h2>
              <p className={styles['card-description']}>
                Seek guidance from experienced astrologers for life questions, career decisions, and personal growth.
              </p>
              <div className={styles['card-features']}>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['user-dot']}`} />
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
                <ArrowRight className={styles['btn-arrow']} />
              </button>
            </div>
          </div>

          {/* Astrologer Card */}
          <div 
            className={`${styles['auth-choice-card']} ${styles['astrologer-card']}`}
            onClick={() => router.push('/auth/astrologer')}
          >
            <div className={`${styles['card-glow']} ${styles['astrologer-glow']}`} />
            <div className={styles['card-content']}>
              <div className={`${styles['card-icon-wrapper']} ${styles['astrologer-icon-wrapper']}`}>
                <Star className={styles['card-icon']} />
              </div>
              <h2 className={styles['card-title']}>I am an Astrologer</h2>
              <p className={styles['card-description']}>
                Share your astrological expertise and help people find clarity while building your practice.
              </p>
              <div className={styles['card-features']}>
                <div className={styles['card-feature']}>
                  <div className={`${styles['feature-dot']} ${styles['astrologer-dot']}`} />
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
                <ArrowRight className={styles['btn-arrow']} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles['auth-landing-footer']}>
          <p className={styles['footer-text']}>
            Join thousands of seekers and guides on their cosmic journey
          </p>
        </div>
      </div>
    </div>
  )
}