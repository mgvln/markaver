"use client"
import { useState } from "react"
import { signOut } from "next-auth/react"

export default function GdprSection({ isOwner }: { isOwner: boolean }) {
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")

  const handleExport = () => {
    window.location.href = "/api/org/export"
  }

  const handleDelete = async () => {
    if (confirm !== "DELETE") return
    setDeleting(true)
    setError("")
    const res = await fetch("/api/org", { method: "DELETE" })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || "Failed to delete organisation")
      setDeleting(false)
      return
    }
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-[#00343A] mb-1">Data &amp; Privacy</h3>
      <p className="text-xs text-gray-400 mb-5">
        Export a copy of all your organisation&apos;s data, or permanently delete your account.
      </p>

      <div className="flex flex-col gap-3">
        {/* Export */}
        <div className="flex items-center justify-between bg-[#f9faf8] rounded-lg px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Export data</p>
            <p className="text-xs text-gray-400">Download all products, competitors, price history, and recommendations as JSON.</p>
          </div>
          <button
            onClick={handleExport}
            className="ml-4 shrink-0 text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-white"
          >
            Download
          </button>
        </div>

        {/* Delete */}
        {isOwner && (
          <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-red-700">Delete organisation</p>
              <p className="text-xs text-red-400">Permanently remove all data. This cannot be undone.</p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="ml-4 shrink-0 text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-lg font-bold text-red-700 mb-2">Delete organisation</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete your organisation, all products, all competitor data, and all price history. There is no undo.
            </p>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </p>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setConfirm("") }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirm !== "DELETE" || deleting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
