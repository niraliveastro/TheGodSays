'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage()

  // Toggle between languages
  const handleToggle = () => {
    const newLanguage = language === 'en' ? 'hi' : 'en'
    changeLanguage(newLanguage)
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Toggle Button Container */}
      <div className="relative group">
        {/* Hover glow effect */}
        <div className="absolute -inset-px bg-gradient-to-r from-amber-400 via-gold to-amber-500 rounded-full opacity-0 group-hover:opacity-75 blur-sm transition-all duration-300"></div>
        
        {/* Toggle Button - Single clickable area */}
        <button
          onClick={handleToggle}
          className="relative flex items-center bg-gradient-to-br from-white to-amber-50/50 border border-gold/20 rounded-full p-0.5 hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10 transition-all duration-200 cursor-pointer"
          aria-label={`Switch to ${language === 'en' ? 'Hindi' : 'English'}`}
        >
          {/* Sliding indicator background */}
          <div
            className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-gradient-to-br from-amber-400 to-gold rounded-full transition-all duration-300 ease-out shadow-md pointer-events-none"
            style={{
              left: language === 'en' ? '2px' : 'calc(50%)',
            }}
          />
          
          {/* ENG Label */}
          <span
            className={`relative z-10 px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 pointer-events-none ${
              language === 'en'
                ? 'text-white'
                : 'text-gray-600'
            }`}
          >
            ENG
          </span>
          
          {/* HIN Label */}
          <span
            className={`relative z-10 px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 pointer-events-none ${
              language === 'hi'
                ? 'text-white'
                : 'text-gray-600'
            }`}
          >
            HIN
          </span>
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .relative.inline-flex {
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  )
}
