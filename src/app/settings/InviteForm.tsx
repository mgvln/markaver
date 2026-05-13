"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function InviteForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("VIEWER")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const res = await fetch("/api/org/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Failed to invite member")
    } else {
      setSuccess(`${name || email} has been added to the team.`)
      setName("")
      setEmail("")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {success && <p className="text-xs text-green-600 mb-2">{success}</p>}
      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          required
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
        >
          <option value="MANAGER">Manager</option>
          <option value="ANALYST">Analyst</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#00343A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#004f58] disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Inviting..." : "Invite"}
        </button>
      </form>
    </div>
  )
}
