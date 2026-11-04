import { useEffect } from 'react'
import type { Actions } from '../data/actions'

function deviceInfo() {
  const ua = navigator.userAgent
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android (browser)' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Browser'
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return {
    platform: 'webapp', appVersion: standalone ? 'web-app (beginscherm)' : 'web-app (browser)', device,
    notifications: 'Notification' in window && Notification.permission === 'granted',
  }
}

/** Reports "last seen" and device info for the admin site: on open, when the tab becomes visible, and every minute. */
export function usePresence(actions: Actions) {
  useEffect(() => {
    const report = (opened: boolean) => void actions.presence(opened, deviceInfo()).catch(() => {})
    const first = window.setTimeout(() => report(true), 1500)
    const tick = window.setInterval(() => report(false), 60_000)
    const onVisible = () => document.visibilityState === 'visible' && report(true)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [actions])
}
