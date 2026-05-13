"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RemoveMemberButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    if (!confirm("Remove this member from the organisation?")) return
    setLoading(true)

    const res = await fetch(`/api/org/members/${userId}`, { method: "DELETE" })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error || "Failed to remove member")
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  )
}
