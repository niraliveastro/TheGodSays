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
      <div className="relative">
        {/* Toggle Button - Single clickable area */}
        <button
          onClick={handleToggle}
          className="relative flex items-center bg-gradient-to-br from-white to-amber-50/50 border border-amber-200/60 rounded-full p-0.5 transition-all duration-200 cursor-pointer hover:border-amber-400 active:scale-[0.98]"
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
            className={`lang-toggle-label relative z-10 px-3 py-1.5 text-sm font-bold uppercase tracking-wide rounded-full transition-all duration-300 pointer-events-none antialiased ${
              language === 'en'
                ? 'text-white drop-shadow-sm'
                : 'text-gray-800'
            }`}
          >
            ENG
          </span>
          
          {/* Hindi (हिंदी) Label */}
          <span
            className={`lang-toggle-label relative z-10 px-3 py-1.5 text-sm font-bold rounded-full transition-all duration-300 pointer-events-none antialiased ${
              language === 'hi'
                ? 'text-white drop-shadow-sm'
                : 'text-gray-800'
            }`}
          >
            हिंदी
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
