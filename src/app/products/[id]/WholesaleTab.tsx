"use client"
import { useState, useEffect, useCallback } from "react"

const BASE_MARGIN = 0.40

interface Tier {
  id: string
  name: string
  minQty: number
  maxQty: number | null
  discount: number
}

interface Props {
  productId: string
  costPrice: number
  sym: string
}

const DEFAULT_TIERS = [
  { name: "Sample", minQty: 1, maxQty: 2, discount: 0 },
  { name: "Reseller", minQty: 3, maxQty: 11, discount: 5 },
  { name: "Distributor", minQty: 12, maxQty: 35, discount: 10 },
  { name: "Strategic Partner", minQty: 36, maxQty: null, discount: 15 },
]

function calcTierPrice(costPrice: number, discount: number): number {
  const baseWholesale = costPrice / (1 - BASE_MARGIN)
  return baseWholesale * (1 - discount / 100)
}

function calcMargin(costPrice: number, price: number): number {
  return ((price - costPrice) / price) * 100
}

export default function WholesaleTab({ productId, costPrice, sym }: Props) {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", minQty: "", maxQty: "", discount: "" })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const baseWholesale = costPrice / (1 - BASE_MARGIN)

  const fetchTiers = useCallback(async () => {
    const res = await fetch(`/api/products/${productId}/wholesale`)
    const data = await res.json()
    setTiers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [productId])

  useEffect(() => { fetchTiers() }, [fetchTiers])

  const seedDefaults = async () => {
    setSaving(true)
    for (const t of DEFAULT_TIERS) {
      await fetch(`/api/products/${productId}/wholesale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      })
    }
    await fetchTiers()
    setSaving(false)
  }

  const openEdit = (tier: Tier) => {
    setEditId(tier.id)
    setForm({
      name: tier.name,
      minQty: String(tier.minQty),
      maxQty: tier.maxQty != null ? String(tier.maxQty) : "",
      discount: String(tier.discount),
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const body = {
      name: form.name,
      minQty: form.minQty,
      maxQty: form.maxQty || null,
      discount: form.discount,
    }

    if (editId) {
      await fetch(`/api/products/${productId}/wholesale/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`/api/products/${productId}/wholesale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }

    setForm({ name: "", minQty: "", maxQty: "", discount: "" })
    setEditId(null)
    setShowForm(false)
    await fetchTiers()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/products/${productId}/wholesale/${id}`, { method: "DELETE" })
    await fetchTiers()
  }

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  if (loading) return <div className="p-8 text-center text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-8 flex flex-col gap-6">

      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#00343A] mb-1">Wholesale Pricing</h3>
            <p className="text-xs text-gray-400">40% gross margin model · Base wholesale price</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-[#00343A]">{sym}{baseWholesale.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Base price (0% discount)</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Cost price</p>
            <p className="font-semibold font-mono">{sym}{costPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Target margin</p>
            <p className="font-semibold">40.0%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Gross profit (base)</p>
            <p className="font-semibold font-mono">{sym}{(baseWholesale - costPrice).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tiers table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-[#00343A]">Volume Tiers</h3>
          <div className="flex gap-2">
            {tiers.length === 0 && (
              <button
                onClick={seedDefaults}
                disabled={saving}
                className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Load defaults
              </button>
            )}
            <button
              onClick={() => { setEditId(null); setForm({ name: "", minQty: "", maxQty: "", discount: "" }); setShowForm(true) }}
              className="text-xs bg-[#00343A] text-white px-3 py-1.5 rounded-lg hover:bg-[#004f58]"
            >
              + Add tier
            </button>
          </div>
        </div>

        {tiers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm">No tiers yet. Click &ldquo;Load defaults&rdquo; to add standard supplement wholesale tiers.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9faf8] border-b border-gray-200">
                {["Tier", "Qty range", "Discount", "Price / unit", "Gross margin", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => {
                const price = calcTierPrice(costPrice, tier.discount)
                const margin = calcMargin(costPrice, price)
                const marginWarn = margin < 30

                return (
                  <tr key={tier.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm text-[#00343A]">{tier.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {tier.minQty}{tier.maxQty != null ? `–${tier.maxQty}` : "+"} units
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {tier.discount > 0 ? `-${tier.discount}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      {sym}{price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        marginWarn ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(tier)}
                        className="text-xs text-gray-400 hover:text-[#00343A] mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tier.id)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-[#00343A] mb-4">{editId ? "Edit tier" : "New tier"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tier name</label>
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                placeholder="e.g. Reseller"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min qty</label>
              <input
                type="number"
                min="1"
                value={form.minQty}
                onChange={update("minQty")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max qty <span className="text-gray-400">(blank = unlimited)</span></label>
              <input
                type="number"
                min="1"
                value={form.maxQty}
                onChange={update("maxQty")}
                placeholder="—"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
              <input
                type="number"
                min="0"
                max="99"
                step="0.5"
                value={form.discount}
                onChange={update("discount")}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33A579]"
              />
            </div>
            {form.discount && form.minQty && (
              <div className="flex items-center">
                <div className="bg-[#f9faf8] rounded-lg px-3 py-2 text-xs">
                  <span className="text-gray-400">Price: </span>
                  <span className="font-mono font-semibold text-gray-900">{sym}{calcTierPrice(costPrice, parseFloat(form.discount || "0")).toFixed(2)}</span>
                  <span className="text-gray-400 ml-2">Margin: </span>
                  <span className="font-semibold text-gray-900">{calcMargin(costPrice, calcTierPrice(costPrice, parseFloat(form.discount || "0"))).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.minQty}
              className="px-4 py-2 text-sm bg-[#00343A] text-white rounded-lg hover:bg-[#004f58] disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Save changes" : "Add tier"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null) }}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
