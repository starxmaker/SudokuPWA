import { useEffect, useState, useRef } from 'react'

export function useBoardLayout() {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [boardPixelWidth, setBoardPixelWidth] = useState<number | null>(null)
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches,
  )

  useEffect(() => {
    const boardElement = boardRef.current
    if (boardElement === null) return

    const updateBoardPixelWidth = () => {
      const nextWidth = Math.round(boardElement.getBoundingClientRect().width)
      setBoardPixelWidth(prev => (prev === nextWidth ? prev : nextWidth))
    }

    updateBoardPixelWidth()
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateBoardPixelWidth())
      : null

    resizeObserver?.observe(boardElement)
    window.addEventListener('resize', updateBoardPixelWidth)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateBoardPixelWidth)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mediaQuery = window.matchMedia('(orientation: landscape)')
    const updateLandscape = (event?: MediaQueryListEvent) => {
      setIsLandscape(event?.matches ?? mediaQuery.matches)
    }
    updateLandscape()
    mediaQuery.addEventListener('change', updateLandscape)
    return () => mediaQuery.removeEventListener('change', updateLandscape)
  }, [])

  return { boardRef, boardPixelWidth, isLandscape }
}
