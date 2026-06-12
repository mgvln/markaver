"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import type { CompetitorRow } from "./ProductTabs"

const SOURCES = ["Brand", "Amazon", "H&B", "iHerb", "Boots", "Bulk", "Other"]

type Props = {
  productId: string
  competitor: CompetitorRow | null
  open: boolean
  onClose: () => void
}

export default function EditCompetitorModal({ productId, competitor, open, onClose }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "", url: "", source: "Brand", type: "Direct",
    servings: "", claim: "", ingredients: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (competitor) {
      setForm({
        name: competitor.name,
        url: competitor.url,
        source: competitor.source ?? "Brand",
        type: competitor.type === "direct" ? "Direct" : "Indirect",
        servings: competitor.servings != null ? String(competitor.servings) : "",
        claim: competitor.claim ?? "",
        ingredients: competitor.ingredients ?? "",
      })
      setError("")
    }
  }, [competitor])

  const update = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!competitor) return
    setLoading(true)
    setError("")

    const res = await fetch(`/api/products/${productId}/competitors/${competitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        url: form.url,
        source: form.source,
        type: form.type.toLowerCase(),
        servings: form.servings ? parseInt(form.servings) : null,
        claim: form.claim || null,
        ingredients: form.ingredients || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Failed to update competitor")
      setLoading(false)
      return
    }

    onClose()
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-lg z-50 focus:outline-none max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-[#00343A] font-semibold text-lg mb-4">
            Edit Competitor
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <p className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
                {error}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Competitor Name</label>
              <input
                type="text" value={form.name} onChange={update("name")}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url" value={form.url} onChange={update("url")}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select value={form.source} onChange={update("source")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900">
                  {SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={update("type")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900">
                  <option>Direct</option>
                  <option>Indirect</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servings <span className="text-gray-400 font-normal text-xs">(their pack)</span>
                </label>
                <input
                  type="number" min="1" value={form.servings} onChange={update("servings")}
                  placeholder="e.g. 30"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Main Positioning / Claim <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text" value={form.claim} onChange={update("claim")}
                placeholder="e.g. Weight management, support wellness routine"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Active Ingredients <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.ingredients} onChange={update("ingredients")}
                placeholder="e.g. Berberine HCl, Chromium, Ceylon Cinnamon"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-[#00343A] text-white rounded-lg hover:bg-[#004f58] disabled:opacity-50">
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
