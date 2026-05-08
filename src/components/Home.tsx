import '@khmyznikov/pwa-install'
import React, { useEffect, useRef, useState } from 'react'
import { FaGithub } from 'react-icons/fa'
import { useI18n } from '../utils/i18n'

declare const __APP_VERSION__: string
declare const __REPO_URL__: string

type PwaInstallElement = HTMLElement & {
  install?: () => void
  showDialog?: (forced?: boolean) => void
  isUnderStandaloneMode?: boolean
  externalPromptEvent?: BeforeInstallPromptEvent | null
  isAppleMobilePlatform?: boolean
  isAppleDesktopPlatform?: boolean
  isAndroid?: boolean
  isAndroidFallback?: boolean
  isInstallAvailable?: boolean
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  platforms?: string[]
}

type Props = {
  hasSaved: boolean
  onNew: () => void
  onContinue: () => void
  onCreated: () => void
  error?: string | null
  hasAvailablePuzzle: boolean
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const twaReferrer = document.referrer.startsWith('android-app://')
  return standaloneMedia || iosStandalone || twaReferrer
}

function isAppleMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

export default function Home({ hasSaved, onNew, onContinue, onCreated, error, hasAvailablePuzzle }: Props){
  const { t } = useI18n()
  const installRef = useRef<PwaInstallElement | null>(null)
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [isInstalledPwa, setIsInstalledPwa] = useState(() => isStandalonePwa())
  const [installReady, setInstallReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function registerPwaInstall() {
      if (typeof window === 'undefined') return
      try {
        await window.customElements.whenDefined('pwa-install')
        if (!cancelled) {
          setInstallReady(true)
          setIsInstalledPwa(installRef.current?.isUnderStandaloneMode ?? isStandalonePwa())
        }
      } catch {
        // Ignore registration failures; the footer link simply stays inert.
      }
    }

    void registerPwaInstall()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation?.()
      promptEventRef.current = event as BeforeInstallPromptEvent
      if (installRef.current) {
        installRef.current.externalPromptEvent = event as BeforeInstallPromptEvent
      }
    }

    function handleDisplayModeChange() {
      setIsInstalledPwa(installRef.current?.isUnderStandaloneMode ?? isStandalonePwa())
    }

    function handleAppInstalled() {
      setIsInstalledPwa(true)
      promptEventRef.current = null
      if (installRef.current) {
        installRef.current.externalPromptEvent = null
      }
    }

    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)')
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', handleAppInstalled)
    standaloneMedia?.addEventListener?.('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', handleAppInstalled)
      standaloneMedia?.removeEventListener?.('change', handleDisplayModeChange)
    }
  }, [])

  function handleInstallClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const installElement = installRef.current
    if (!installElement) return

    if (promptEventRef.current) {
      installElement.externalPromptEvent = promptEventRef.current
    }

    if (isAppleMobileBrowser()) {
      installElement.isAppleMobilePlatform = true
      installElement.isAppleDesktopPlatform = false
      installElement.isAndroid = false
      installElement.isAndroidFallback = false
      installElement.isInstallAvailable = true
      installElement.showDialog?.(true)
      installElement.install?.()
      return
    }

    installElement.showDialog?.(true)
  }

  return (
    <div className="home-page">
      <div className="home-page__header">
        <h2 className="home-page__title">{t('home.welcome')}</h2>
      </div>
      <div className="home-page__main">
        <div className="home-page__actions">
          <button className="home-btn" onClick={onNew} disabled={!hasAvailablePuzzle}>
            {hasAvailablePuzzle ? t('home.newGame') : t('home.loading')}
          </button>
          {hasSaved && <button className="home-btn" onClick={onContinue}>{t('home.continue')}</button>}
          <button className="home-btn" onClick={onCreated}>{t('home.createNewGame')}</button>
        </div>
      </div>
      {error && <p className="home-page__message home-page__message--error">{error}</p>}
      {!hasSaved && !error && <p className="home-page__message home-page__message--muted">{t('home.noSavedGame')}</p>}
      <div className="home-page__footer">
        <a
          href={__REPO_URL__}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('home.viewOnGitHub')}
          className="home-page__github"
        >
          <FaGithub size={36} />
        </a>
        <p className="home-page__version">v{__APP_VERSION__}</p>
        {!isInstalledPwa && installReady && (
          <a
            href="#install"
            onClick={handleInstallClick}
            className="home-page__install"
          >
            {t('home.installApp')}
          </a>
        )}
      </div>
      {React.createElement('pwa-install', {
        ref: installRef,
        'manifest-url': `${import.meta.env.BASE_URL}manifest.webmanifest`,
        icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
        'manual-apple': true,
        'manual-chrome': true,
        'use-local-storage': true,
        'data-testid': 'pwa-install-element',
      })}
    </div>
  )
}
