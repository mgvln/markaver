"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    setError("")

    const { token } = await params

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      setLoading(false)
      return
    }

    router.push("/login?reset=true")
  }

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
            <h2 className="text-[#00343A] text-3xl font-bold mb-2">Set new password</h2>
            <p className="text-gray-500">Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00343A] text-white py-3 rounded-lg font-medium hover:bg-[#004f58] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Saving..." : "Save new password"}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-emerald-700 font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
