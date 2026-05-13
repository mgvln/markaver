"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  connected: boolean
  savedChannel: string | null
}

export default function SlackSection({ connected, savedChannel }: Props) {
  const router = useRouter()
  const [channel, setChannel] = useState(savedChannel ?? "")
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const saveChannel = async () => {
    setSaving(true)
    await fetch("/api/org/slack", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackChannel: channel }),
    })
    setSaving(false)
    router.refresh()
  }

  const disconnect = async () => {
    if (!confirm("Disconnect Slack from this organisation?")) return
    setDisconnecting(true)
    await fetch("/api/org/slack", { method: "DELETE" })
    setDisconnecting(false)
    router.refresh()
  }

  if (!connected) {
    return (
      <a
        href="/api/slack/oauth"
        className="inline-flex items-center gap-2 bg-[#4A154B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3b1040] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 54 54" fill="currentColor">
          <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" />
          <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" />
          <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" />
          <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.249m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" />
        </svg>
        Connect Slack
      </a>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
          Connected
        </span>
        <button
          onClick={disconnect}
          disabled={disconnecting}
          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="#general"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579] w-48"
        />
        <button
          onClick={saveChannel}
          disabled={saving}
          className="bg-[#00343A] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#004f58] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save channel"}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Enter the channel name (e.g. <code className="font-mono">#alerts</code>) where Slack notifications will be sent.
      </p>
    </div>
  )
}
