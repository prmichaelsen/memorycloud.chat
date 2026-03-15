/**
 * PushPermissionPrompt — prompts user on first login to enable push notifications.
 * Handles denied state gracefully with a dismissible info banner.
 * Only shows once (tracks via localStorage).
 */

import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { useTheme } from '@/lib/theming'
import {
  getPushPermissionState,
  hasUserRespondedToPrompt,
  requestPushPermission,
  getFCMToken,
  markPromptResponded,
  isFCMConfigured,
  type PushPermissionState,
} from '@/lib/fcm'

interface PushPermissionPromptProps {
  /** Only show after first login */
  isFirstLogin?: boolean
}

export function PushPermissionPrompt({
  isFirstLogin = false,
}: PushPermissionPromptProps) {
  const t = useTheme()
  const [visible, setVisible] = useState(false)
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!isFCMConfigured()) return
    const state = getPushPermissionState()
    setPermissionState(state)

    // Show prompt if:
    // 1. Push is supported
    // 2. Permission hasn't been granted or denied yet
    // 3. User hasn't dismissed the prompt before
    // 4. It's first login or permission is still default
    if (
      state === 'default' &&
      !hasUserRespondedToPrompt() &&
      (isFirstLogin || true) // Show on any visit if not yet responded
    ) {
      // Delay to avoid overwhelming the user on load
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }

    // If unsupported, never show
    if (state === 'unsupported') {
      setVisible(false)
    }
  }, [isFirstLogin])

  const handleEnable = async () => {
    setRequesting(true)
    try {
      const result = await requestPushPermission()
      setPermissionState(result)

      if (result === 'granted') {
        // Get and register FCM token
        await getFCMToken()
        setVisible(false)
      } else if (result === 'denied') {
        // Show denied state briefly, then dismiss
        setTimeout(() => setVisible(false), 3000)
      }
    } catch {
      setVisible(false)
    } finally {
      setRequesting(false)
    }
  }

  const handleDismiss = () => {
    markPromptResponded('default')
    setVisible(false)
  }

  if (!visible) return null

  // Denied state — informational banner
  if (permissionState === 'denied') {
    return (
      <div
        className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 ${t.card} p-4 shadow-lg z-50`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 text-brand-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className={`text-sm font-medium ${t.textPrimary}`}>
              Push notifications blocked
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              To enable push notifications, update your browser notification settings
              for this site.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className={`p-1 ${t.textMuted} hover:${t.textPrimary} transition-colors`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Default state — ask permission
  return (
    <div
      className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 ${t.card} p-4 shadow-lg z-50`}
      role="dialog"
      aria-label="Enable push notifications"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-brand-primary/10 shrink-0">
          <Bell className="w-5 h-5 text-brand-primary" />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${t.textPrimary}`}>
            Stay in the loop
          </p>
          <p className={`text-xs ${t.textMuted} mt-1`}>
            Get notified about new messages, mentions, and agent responses even when
            you're not using the app.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleEnable}
              disabled={requesting}
              className={`${t.buttonPrimary} text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50`}
            >
              {requesting ? 'Enabling...' : 'Enable notifications'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className={`${t.buttonGhost} text-xs px-3 py-1.5 rounded-md transition-colors`}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className={`p-1 ${t.textMuted} hover:${t.textPrimary} transition-colors`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
