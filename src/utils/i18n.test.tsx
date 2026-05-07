import { afterEach, describe, expect, it } from 'vitest'
import { getInitialLanguageSetting, getSystemLanguage, LANGUAGE_STORAGE_KEY } from './i18n'

const originalLanguage = navigator.language
const originalLanguages = navigator.languages

function setNavigatorLanguages(language: string, languages: string[]) {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  })
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  })
}

afterEach(() => {
  localStorage.removeItem(LANGUAGE_STORAGE_KEY)
  setNavigatorLanguages(originalLanguage, [...originalLanguages])
})

describe('i18n language selection', () => {
  it('uses spanish when the system prefers spanish', () => {
    setNavigatorLanguages('es-ES', ['es-ES', 'en-US'])
    expect(getSystemLanguage()).toBe('es')
  })

  it('falls back to english for unsupported system languages', () => {
    setNavigatorLanguages('fr-FR', ['fr-FR', 'de-DE'])
    expect(getSystemLanguage()).toBe('en')
  })

  it('keeps system mode when no preference is stored', () => {
    expect(getInitialLanguageSetting()).toBe('system')
  })

  it('uses the stored language setting when present', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es')
    expect(getInitialLanguageSetting()).toBe('es')
  })
})
