"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ProductRowActions({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${productName}"? This will remove all competitors, snapshots, and recommendations. This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" })
    if (res.ok) {
      router.refresh()
    } else {
      alert("Failed to delete product. Please try again.")
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <Link
        href={`/products/${productId}/edit`}
        className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-50"
      >
        {deleting ? "..." : "Delete"}
      </button>
    </div>
  )
}
