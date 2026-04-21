import '@khmyznikov/pwa-install'
import React, { useEffect, useRef, useState } from 'react'
import { FaGithub } from 'react-icons/fa'

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

export default function Home({ hasSaved, onNew, onContinue, onCreated, error }: Props){
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
    <div style={{padding:20,display:'flex',flexDirection:'column',alignItems:'center',gap:12,minHeight:'calc(100vh - 72px)'}}>
      <div style={{width:'100%',maxWidth:720,textAlign:'center'}}>
        <h2 style={{margin:0,paddingTop:'6vh'}}>Welcome</h2>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',width:'100%'}}>
        <div style={{display:'flex',flexDirection:'column',gap:20,alignItems:'stretch',width:'100%',maxWidth:240}}>
          <button className="home-btn" onClick={onNew}>New Game</button>
          {hasSaved && <button className="home-btn" onClick={onContinue}>Continue</button>}
          <button className="home-btn" onClick={onCreated}>Create new game</button>
        </div>
      </div>
      {error && <p style={{color:'#e53935',fontWeight:600}}>{error}</p>}
      {!hasSaved && !error && <p style={{color:'#666'}}>No saved game found — start a new puzzle.</p>}
      <a
        href={__REPO_URL__}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on GitHub"
        style={{color:'#999',display:'flex',alignItems:'center',textDecoration:'none'}}
      >
        <FaGithub size={36} />
      </a>
      <p style={{color:'#999',fontSize:'0.75rem',margin:0}}>v{__APP_VERSION__}</p>
      {!isInstalledPwa && installReady && (
        <a
          href="#install"
          onClick={handleInstallClick}
          style={{color:'#999',fontSize:'0.75rem',textDecoration:'underline'}}
        >
          Install app
        </a>
      )}
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
