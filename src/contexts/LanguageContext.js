'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(true)

  // Load saved language preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tgs:language')
      if (saved && (saved === 'en' || saved === 'hi')) {
        setLanguage(saved)
      }
    } catch (error) {
      console.error('Error loading language:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save language preference
  const changeLanguage = (lang) => {
    try {
      setLanguage(lang)
      localStorage.setItem('tgs:language', lang)
    } catch (error) {
      console.error('Error saving language:', error)
    }
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

