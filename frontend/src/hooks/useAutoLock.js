import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

const LOCK_AFTER_MS = 15 * 60 * 1000   // 15 minutes
const CHECK_INTERVAL_MS = 20 * 1000    // check every 20s
const COUNTDOWN_START_MS = 60 * 1000  // show countdown last 60s

/**
 * Auto-lock hook — must be mounted inside a protected route.
 * Returns secondsRemaining (null when not in countdown phase).
 */
export function useAutoLock() {
  const { lastActivity, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [secondsRemaining, setSecondsRemaining] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity
      const remaining = LOCK_AFTER_MS - elapsed

      if (remaining <= 0) {
        // Lock
        clearInterval(interval)
        authApi.logout().catch(() => {})
        logout()
        toast.warning('Vault locked due to inactivity', { duration: 5000 })
        navigate({ to: '/login' })
        return
      }

      if (remaining <= COUNTDOWN_START_MS) {
        setSecondsRemaining(Math.ceil(remaining / 1000))
      } else {
        setSecondsRemaining(null)
      }
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [lastActivity, isAuthenticated, logout, navigate])

  return secondsRemaining
}

/**
 * Activity tracker — attach to the root of the protected layout.
 * Updates lastActivity in the store on user interaction.
 */
export function useActivityTracker() {
  const updateActivity = useAuthStore((s) => s.updateActivity)

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    const handler = () => updateActivity()

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, handler))
  }, [updateActivity])
}
