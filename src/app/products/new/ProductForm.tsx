"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export default function ProductForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "",
    sku: "",
    costPrice: "",
    minMarkup: "4.0",
    servingsPerPack: "30",
    scrapeInterval: "weekly",
    positionRule: "mean",
    adjustment: "20",
    currency: "EUR",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const update =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        sku: form.sku,
        costPrice: parseFloat(form.costPrice),
        minMarkup: parseFloat(form.minMarkup),
        servingsPerPack: parseInt(form.servingsPerPack),
        scrapeInterval: form.scrapeInterval,
        positionRule: form.positionRule,
        adjustment: parseFloat(form.adjustment),
        currency: form.currency,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Failed to create product")
      setLoading(false)
      return
    }

    router.push(`/products/${data.id}`)
  }

  const sym = CURRENCY_SYMBOL[form.currency] ?? "€"

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={update("name")}
              placeholder="e.g. GLP-1 Supporter"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={update("sku")}
              placeholder="e.g. GLP1-60"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={update("currency")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {sym}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={update("costPrice")}
                placeholder="0.00"
                required
                className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Markup
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                value={form.minMarkup}
                onChange={update("minMarkup")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579] pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                ×
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Servings per Pack
            </label>
            <input
              type="number"
              min="1"
              value={form.servingsPerPack}
              onChange={update("servingsPerPack")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scrape Interval
            </label>
            <select
              value={form.scrapeInterval}
              onChange={update("scrapeInterval")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position Rule
            </label>
            <select
              value={form.positionRule}
              onChange={update("positionRule")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            >
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="trimmed">Trimmed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={form.adjustment}
                onChange={update("adjustment")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579] pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Link
            href="/products"
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm bg-[#00343A] text-white rounded-lg hover:bg-[#004f58] disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  )
}
