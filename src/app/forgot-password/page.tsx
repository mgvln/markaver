"use client"
import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        setError("Something went wrong. Please try again.")
        setLoading(false)
        return
      }
      setSubmitted(true)
    } catch {
      setError("Network error. Please try again.")
    }
    setLoading(false)
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
          {submitted ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[#00343A] text-2xl font-bold mb-2">Check your inbox</h2>
              <p className="text-gray-500 text-sm mb-6">
                If an account exists for <strong>{email}</strong>, you will receive a reset link shortly.
              </p>
              <Link href="/login" className="text-emerald-700 font-medium hover:underline text-sm">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-[#00343A] text-3xl font-bold mb-2">Forgot password</h2>
                <p className="text-gray-500">Enter your email and we will send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00343A] text-white py-3 rounded-lg font-medium hover:bg-[#004f58] transition-colors disabled:opacity-50 mt-2"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <Link href="/login" className="text-emerald-700 font-medium hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
