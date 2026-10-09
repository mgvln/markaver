"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"

const STORAGE_KEY = "markaver.cookie-notice.v1"

// Tiny store over localStorage so the notice can read it without a setState-in-effect,
// and still re-render the moment it is dismissed.
let listeners: (() => void)[] = []

function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}

function shouldShow(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage — show the notice rather than suppress it.
    return true
  }
}

// The server has no localStorage; render nothing there and let the client decide.
const shouldShowOnServer = () => false

export default function CookieNotice() {
  const visible = useSyncExternalStore(subscribe, shouldShow, shouldShowOnServer)

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    } catch {
      // Nothing to persist — the notice simply reappears next visit.
    }
    listeners.forEach((l) => l())
  }

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-50 px-4 pb-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white shadow-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-gray-700 flex-1">
          Markaver uses{" "}
          <span className="font-semibold text-[#00343A]">only essential cookies</span>{" "}
          to keep you signed in and to protect the sign-in form. We run no analytics,
          advertising or third-party tracking.{" "}
          <Link
            href="/legal/cookies"
            className="text-[#33A579] font-medium underline underline-offset-2"
          >
            Cookie policy
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 bg-[#00343A] text-white text-sm font-semibold rounded-lg px-5 py-2 hover:bg-[#024c54] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
