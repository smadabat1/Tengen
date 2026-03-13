import { useState, useRef } from 'react'
import { toast } from 'sonner'

const CLEAR_AFTER_MS = 30 * 1000  // 30 seconds

/**
 * Clipboard hook with automatic clear after 30 seconds.
 * Returns { copy, copied, secondsLeft }
 */
export function useClipboard() {
  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)

  const copy = async (text, label = 'Password') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setSecondsLeft(30)

      // Clear existing timers
      clearTimeout(timerRef.current)
      clearInterval(countdownRef.current)

      // Show toast with countdown
      const toastId = toast.success(`${label} copied`, {
        description: 'Clipboard will be cleared in 30s',
        duration: CLEAR_AFTER_MS,
      })

      // Countdown
      let remaining = 30
      countdownRef.current = setInterval(() => {
        remaining -= 1
        setSecondsLeft(remaining)
        if (remaining <= 0) clearInterval(countdownRef.current)
      }, 1000)

      // Clear clipboard after 30s
      timerRef.current = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('')
        } catch (_) {}
        setCopied(false)
        setSecondsLeft(null)
        toast.dismiss(toastId)
        toast.info('Clipboard cleared')
      }, CLEAR_AFTER_MS)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return { copy, copied, secondsLeft }
}
