"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

type Props = {
  productId: string
  initialData: {
    name: string
    sku: string | null
    productType: string
    costPrice: number
    minMarkup: number
    servingsPerPack: number
    capsulesPerServing: number
    capsuleSizeGrams: number | null
    gramsPerServing: number | null
    scrapeInterval: string
    positionRule: string
    adjustment: number
    currency: string
  }
}

export default function EditProductForm({ productId, initialData }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: initialData.name,
    sku: initialData.sku ?? "",
    productType: initialData.productType,
    costPrice: String(initialData.costPrice),
    minMarkup: String(initialData.minMarkup),
    servingsPerPack: String(initialData.servingsPerPack),
    capsulesPerServing: String(initialData.capsulesPerServing),
    capsuleSizeGrams: initialData.capsuleSizeGrams != null ? String(initialData.capsuleSizeGrams) : "",
    gramsPerServing: initialData.gramsPerServing != null ? String(initialData.gramsPerServing) : "",
    scrapeInterval: initialData.scrapeInterval,
    positionRule: initialData.positionRule,
    adjustment: String(initialData.adjustment),
    currency: initialData.currency,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const update =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const isCapsule = form.productType === "capsule"
  const sym = CURRENCY_SYMBOL[form.currency] ?? "€"

  const totalUnits = isCapsule
    ? parseInt(form.servingsPerPack || "0") * parseInt(form.capsulesPerServing || "0")
    : parseFloat(form.servingsPerPack || "0") * parseFloat(form.gramsPerServing || "0")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          productType: form.productType,
          costPrice: parseFloat(form.costPrice),
          minMarkup: parseFloat(form.minMarkup),
          servingsPerPack: parseInt(form.servingsPerPack),
          capsulesPerServing: parseInt(form.capsulesPerServing),
          capsuleSizeGrams: form.capsuleSizeGrams ? parseFloat(form.capsuleSizeGrams) : null,
          gramsPerServing: form.gramsPerServing ? parseFloat(form.gramsPerServing) : null,
          scrapeInterval: form.scrapeInterval,
          positionRule: form.positionRule,
          adjustment: parseFloat(form.adjustment),
          currency: form.currency,
        }),
      })

      const text = await res.text()
      let data: { error?: string } = {}
      try { data = JSON.parse(text) } catch { /* non-JSON */ }

      if (!res.ok) {
        setError(data.error || `Server error (${res.status}) — please try again`)
        setLoading(false)
        return
      }

      router.push(`/products/${productId}`)
      router.refresh()
    } catch {
      setError("Network error — check your connection and try again")
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={update("name")}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
            />
          </div>

          {/* Product type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
            <select
              value={form.productType}
              onChange={update("productType")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
            >
              <option value="capsule">Capsule</option>
              <option value="powder">Powder</option>
            </select>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={update("sku")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={update("currency")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          {/* Cost price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
              <input
                type="number" step="0.01" min="0"
                value={form.costPrice} onChange={update("costPrice")}
                required
                className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
              />
            </div>
          </div>

          {/* Servings per pack */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servings per Pack</label>
            <input
              type="number" min="1"
              value={form.servingsPerPack} onChange={update("servingsPerPack")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
            />
          </div>

          {/* Capsule-specific fields */}
          {isCapsule && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capsules per Serving</label>
                <input
                  type="number" min="1"
                  value={form.capsulesPerServing} onChange={update("capsulesPerServing")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capsule Size <span className="text-gray-400 font-normal">(grams, optional)</span>
                </label>
                <input
                  type="number" step="0.001" min="0"
                  value={form.capsuleSizeGrams} onChange={update("capsuleSizeGrams")}
                  placeholder="e.g. 0.5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
                />
              </div>
            </>
          )}

          {/* Powder-specific fields */}
          {!isCapsule && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grams per Serving <span className="text-red-500">*</span>
              </label>
              <input
                type="number" step="0.1" min="0"
                value={form.gramsPerServing} onChange={update("gramsPerServing")}
                placeholder="e.g. 10"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
              />
            </div>
          )}

          {/* Pack size preview */}
          {totalUnits > 0 && (
            <div className="col-span-2 bg-[#f9faf8] rounded-lg px-4 py-2.5 text-xs text-gray-500">
              Pack: {totalUnits} {isCapsule ? "capsules" : "grams"}
              {isCapsule && form.capsuleSizeGrams
                ? ` · ${(totalUnits * parseFloat(form.capsuleSizeGrams)).toFixed(1)}g total`
                : ""}
            </div>
          )}

          {/* Min markup */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Markup</label>
            <div className="relative">
              <input
                type="number" step="0.1" min="1"
                value={form.minMarkup} onChange={update("minMarkup")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900 pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">×</span>
            </div>
          </div>

          {/* Scrape interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scrape Interval</label>
            <select
              value={form.scrapeInterval} onChange={update("scrapeInterval")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Position rule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Rule</label>
            <select
              value={form.positionRule} onChange={update("positionRule")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900"
            >
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="trimmed">Trimmed</option>
            </select>
          </div>

          {/* Adjustment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment
              <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                parseFloat(form.adjustment) >= 10
                  ? "bg-purple-100 text-purple-700"
                  : parseFloat(form.adjustment) > -5
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {parseFloat(form.adjustment) >= 10 ? "Premium" : parseFloat(form.adjustment) > -5 ? "Mid" : "Budget"}
              </span>
            </label>
            <div className="relative">
              <input
                type="number" step="1"
                value={form.adjustment} onChange={update("adjustment")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579] text-gray-900 pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Premium ≥+10% · Mid 0% · Budget ≤−10%</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Link
            href={`/products/${productId}`}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm bg-[#00343A] text-white rounded-lg hover:bg-[#004f58] disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
