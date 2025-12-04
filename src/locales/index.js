import { en } from './en'
import { hi } from './hi'

export const translations = {
  en,
  hi,
}

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
]

export function getTranslation(language) {
  return translations[language] || translations.en
}

