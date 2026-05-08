import React from 'react'
import { DIFFICULTY_LABELS, type GameDifficulty } from './difficulties'
import enStrings from '../locales/en.json'
import esStrings from '../locales/es.json'

export const LANGUAGE_STORAGE_KEY = 'language'
export const SUPPORTED_LANGUAGES = ['en', 'es'] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export type AppLanguageSetting = AppLanguage | 'system'

type TranslationKey = keyof typeof enStrings

const DIFFICULTY_KEYS: Record<GameDifficulty, TranslationKey> = {
  VERY_EASY: 'difficulty.veryEasy',
  EASY: 'difficulty.easy',
  MEDIUM: 'difficulty.medium',
  HARD: 'difficulty.hard',
  VERY_HARD: 'difficulty.veryHard',
  EXPERT: 'difficulty.expert',
  NIGHTMARE: 'difficulty.nightmare',
  DIABOLICAL: 'difficulty.diabolical',
}

const LABEL_TO_DIFFICULTY = Object.fromEntries(
  Object.entries(DIFFICULTY_LABELS).map(([difficulty, label]) => [label, difficulty as GameDifficulty]),
) as Record<string, GameDifficulty>
const STRINGS: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: enStrings,
  es: esStrings,
}

function formatTemplate(template: string, params?: Record<string, string | number>) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`))
}

function normalizeLanguage(input: string | null | undefined): AppLanguage | null {
  if (!input) return null
  const normalized = input.toLowerCase()
  if (normalized.startsWith('es')) return 'es'
  if (normalized.startsWith('en')) return 'en'
  return null
}

export function getSystemLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'en'
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language]
  for (const candidate of candidates) {
    const language = normalizeLanguage(candidate)
    if (language) return language
  }
  return 'en'
}

export function getInitialLanguageSetting(): AppLanguageSetting {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (stored === 'system') return stored
  return normalizeLanguage(stored) ?? 'system'
}

export type I18nContextValue = {
  language: AppLanguage
  languageSetting: AppLanguageSetting
  setLanguageSetting: (language: AppLanguageSetting) => void
  localeTag: string
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  getDifficultyLabel: (difficulty: GameDifficulty) => string
  localizeDifficultyLabel: (label: string | null | undefined) => string | null
}

function createValue(
  languageSetting: AppLanguageSetting,
  setLanguageSetting: (language: AppLanguageSetting) => void,
): I18nContextValue {
  const language = languageSetting === 'system' ? getSystemLanguage() : languageSetting
  const localeTag = language === 'es' ? 'es-ES' : 'en-US'
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    formatTemplate(STRINGS[language][key] ?? enStrings[key], params)

  return {
    language,
    languageSetting,
    setLanguageSetting,
    localeTag,
    t,
    getDifficultyLabel: (difficulty: GameDifficulty) => t(DIFFICULTY_KEYS[difficulty]),
    localizeDifficultyLabel: (label: string | null | undefined) => {
      if (!label) return null
      const difficulty = LABEL_TO_DIFFICULTY[label]
      return difficulty ? t(DIFFICULTY_KEYS[difficulty]) : label
    },
  }
}

const defaultValue = createValue('system', () => {})
const I18nContext = React.createContext<I18nContextValue>(defaultValue)

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [languageSetting, setLanguageSetting] = React.useState<AppLanguageSetting>(getInitialLanguageSetting)

  React.useEffect(() => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(LANGUAGE_STORAGE_KEY, languageSetting)
  }, [languageSetting])

  const value = React.useMemo(
    () => createValue(languageSetting, setLanguageSetting),
    [languageSetting],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return React.useContext(I18nContext)
}
