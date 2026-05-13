"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RunNowButton({ productId }: { productId: string }) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleRun = async () => {
    setState("loading")
    setMessage("")

    const res = await fetch(`/api/products/${productId}/scrape`, { method: "POST" })
    const data = await res.json()

    if (!res.ok) {
      setState("error")
      setMessage(data.error || "Scrape failed")
      setTimeout(() => setState("idle"), 4000)
      return
    }

    setState("done")
    setMessage(`Scraped ${data.scraped} competitor${data.scraped !== 1 ? "s" : ""}`)
    router.refresh()
    setTimeout(() => setState("idle"), 4000)
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className={`text-xs ${state === "error" ? "text-red-500" : "text-green-600"}`}>
          {message}
        </span>
      )}
      <button
        onClick={handleRun}
        disabled={state === "loading"}
        className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
      >
        {state === "loading" && (
          <svg className="animate-spin h-3 w-3 text-gray-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {state === "loading" ? "Running..." : "Run now"}
      </button>
    </div>
  )
}
