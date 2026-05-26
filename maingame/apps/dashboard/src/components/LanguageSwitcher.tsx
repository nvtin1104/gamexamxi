/**
 * Language Switcher Component
 * Allows users to switch between supported languages
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  ]

  return (
    <div className="flex items-center gap-2 border-2 border-gray-300 rounded px-2 py-1">
      <Globe size={16} className="text-gray-600" />
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="bg-transparent border-none outline-none cursor-pointer text-sm"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * Simple button version (smaller footprint)
 */
export function LanguageSwitcherButton() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'vi' : 'en'
    i18n.changeLanguage(nextLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1 border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors"
      title={`Current: ${i18n.language}`}
    >
      {i18n.language.toUpperCase()}
    </button>
  )
}
