"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"

const SOURCES = ["Brand", "Amazon", "H&B", "iHerb", "Boots", "Bulk", "Other"]

export default function AddCompetitorModal({ productId }: { productId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "", url: "", source: "Brand", type: "Direct",
    servings: "", claim: "", ingredients: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const update = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch(`/api/products/${productId}/competitors`, {
      method: "POST",
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
      const data = await res.json()
      setError(data.error || "Failed to add competitor")
      setLoading(false)
      return
    }

    setOpen(false)
    setForm({ name: "", url: "", source: "Brand", type: "Direct", servings: "", claim: "", ingredients: "" })
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="bg-[#00343A] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#004f58]">
          + Competitor
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-lg z-50 focus:outline-none max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-[#00343A] font-semibold text-lg mb-4">
            Add Competitor
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
                placeholder="e.g. Codeage — GLP-Advantage+" required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url" value={form.url} onChange={update("url")}
                placeholder="https://..." required
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
                placeholder="e.g. Berberine HCl, Chromium, Ceylon Cinnamon, Green Tea Extract"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Dialog.Close asChild>
                <button type="button"
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-[#00343A] text-white rounded-lg hover:bg-[#004f58] disabled:opacity-50">
                {loading ? "Adding..." : "Add Competitor"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
