"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export const dynamic = "force-dynamic"

export default function SetupPage() {
  const { data: session, update, status } = useSession()
  const router = useRouter()
  const [orgName, setOrgName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && session?.user?.orgId) router.push("/")
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/setup-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Failed to create organisation")
      setLoading(false)
      return
    }

    await update({ orgId: data.orgId })
    router.push("/")
  }

  if (status === "loading") return null

  return (
    <div className="min-h-screen bg-[#f9faf8] flex">
      <div className="hidden lg:flex w-1/2 bg-[#00343A] flex-col justify-between p-12">
        <div>
          <h1 className="text-white font-bold text-2xl">Markaver</h1>
          <p className="text-[#33A579] text-sm mt-1">Pricing Intelligence</p>
        </div>
        <h2 className="text-white text-3xl font-light leading-relaxed">
          Stop guessing.<br />Start pricing<br />with confidence.
        </h2>
        <p className="text-white opacity-30 text-sm">2026 Markaver · Rawcreation</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-[#00343A] text-3xl font-bold mb-2">Set up your organisation</h2>
            <p className="text-gray-500">
              Welcome, {session?.user?.name ?? session?.user?.email}. Create your organisation to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Rawcreation"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00343A] text-white py-3 rounded-lg font-medium hover:bg-[#004f58] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Creating..." : "Create organisation"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
