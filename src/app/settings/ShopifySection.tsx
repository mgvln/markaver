"use client"
import { useState } from "react"

type ShopifyProduct = {
  id: string
  name: string
  sku: string
  price: string
  inStock: boolean
}

type ImportRow = ShopifyProduct & {
  selected: boolean
  costPrice: string
  currency: string
  productType: string
  servingsPerPack: string
}

type ImportResult = { name: string; ok: boolean; error?: string }
type Step = "connect" | "select" | "importing" | "done"

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export default function ShopifySection() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("connect")

  const [storeUrl, setStoreUrl] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState("")

  const [rows, setRows] = useState<ImportRow[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [importProgress, setImportProgress] = useState(0)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)
    setConnectError("")

    const res = await fetch("/api/org/shopify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeUrl, accessToken }),
    })
    const data = await res.json()

    if (!res.ok) {
      setConnectError(data.error || "Failed to connect")
      setConnecting(false)
      return
    }

    setRows(
      (data.products as ShopifyProduct[]).map((p) => ({
        ...p,
        selected: true,
        costPrice: "",
        currency: "GBP",
        productType: "capsule",
        servingsPerPack: "30",
      }))
    )
    setConnecting(false)
    setStep("select")
  }

  const toggleAll = (checked: boolean) =>
    setRows((rs) => rs.map((r) => ({ ...r, selected: checked })))

  const updateRow = (id: string, key: keyof ImportRow, value: string | boolean) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)))

  const selectedRows = rows.filter((r) => r.selected)

  const handleImport = async () => {
    setStep("importing")
    const out: ImportResult[] = []

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i]
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name,
          sku: row.sku || undefined,
          productType: row.productType,
          costPrice: parseFloat(row.costPrice) || 0,
          currency: row.currency,
          servingsPerPack: parseInt(row.servingsPerPack) || 30,
          minMarkup: 5.0,
          positionRule: "mean",
          adjustment: 20,
          scrapeInterval: "weekly",
        }),
      })
      const data = await res.json()
      out.push({ name: row.name, ok: res.ok, error: !res.ok ? (data.error || "Failed") : undefined })
      setImportProgress(Math.round(((i + 1) / selectedRows.length) * 100))
    }

    setResults(out)
    setStep("done")
  }

  const reset = () => {
    setStep("connect")
    setStoreUrl("")
    setAccessToken("")
    setRows([])
    setResults([])
    setImportProgress(0)
    setConnectError("")
  }

  if (!open) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#00343A] mb-1">Shopify Import</h3>
            <p className="text-xs text-gray-400">Import your product catalogue from a Shopify store.</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 ml-4 text-sm bg-[#00343A] text-white px-4 py-2 rounded-lg hover:bg-[#004f58]"
          >
            Connect store
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-[#00343A]">Shopify Import</h3>
        <button onClick={() => { setOpen(false); reset() }} className="text-gray-300 hover:text-gray-500 text-lg">✕</button>
      </div>

      {/* Step 1 — Connect */}
      {step === "connect" && (
        <form onSubmit={handleConnect} className="flex flex-col gap-4">
          <div className="bg-[#f9faf8] border border-gray-100 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-1">How to get your access token</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to your Shopify admin → <strong>Apps</strong> → <strong>Develop apps</strong></li>
              <li>Click <strong>Create an app</strong> → give it any name</li>
              <li>Under <strong>Configuration</strong>, add <strong>read_products</strong> scope</li>
              <li>Click <strong>Install app</strong> → copy the <strong>Admin API access token</strong></li>
            </ol>
          </div>

          {connectError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {connectError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store URL</label>
            <input
              type="text"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="mystore.myshopify.com"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            />
            <p className="text-xs text-gray-400 mt-1">Your .myshopify.com domain</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Admin API Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#33A579]"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setOpen(false); reset() }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="flex-1 bg-[#00343A] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#004f58] disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect & fetch products"}
            </button>
          </div>
        </form>
      )}

      {/* Step 2 — Select */}
      {step === "select" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              Found <strong>{rows.length}</strong> products.
              Select which to import and set cost prices.
            </p>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#f9faf8] z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every((r) => r.selected)}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Product</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Shopify Price</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Cost Price</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Currency</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Type</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Servings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const sym = CURRENCY_SYMBOL[row.currency] ?? "£"
                    return (
                      <tr key={row.id} className={`border-b border-gray-50 ${!row.selected ? "opacity-40" : ""}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => updateRow(row.id, "selected", e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900 text-xs leading-tight">{row.name}</p>
                          {row.sku && <p className="text-gray-400 text-xs">{row.sku}</p>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">
                          {row.price ? `£${row.price}` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{sym}</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.costPrice}
                              onChange={(e) => updateRow(row.id, "costPrice", e.target.value)}
                              placeholder="0.00"
                              disabled={!row.selected}
                              className="w-full border border-gray-200 rounded px-2 py-1 pl-5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#33A579] disabled:bg-gray-50"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.currency}
                            onChange={(e) => updateRow(row.id, "currency", e.target.value)}
                            disabled={!row.selected}
                            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#33A579] disabled:bg-gray-50"
                          >
                            <option value="GBP">GBP</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.productType}
                            onChange={(e) => updateRow(row.id, "productType", e.target.value)}
                            disabled={!row.selected}
                            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#33A579] disabled:bg-gray-50"
                          >
                            <option value="capsule">Capsule</option>
                            <option value="powder">Powder</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            value={row.servingsPerPack}
                            onChange={(e) => updateRow(row.id, "servingsPerPack", e.target.value)}
                            disabled={!row.selected}
                            className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#33A579] disabled:bg-gray-50"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {selectedRows.length} of {rows.length} selected
              {selectedRows.some((r) => !r.costPrice) && (
                <span className="text-amber-500 ml-2">· some cost prices are empty (will default to 0)</span>
              )}
            </p>
            <button
              onClick={handleImport}
              disabled={selectedRows.length === 0}
              className="bg-[#33A579] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#2a8f65] disabled:opacity-50"
            >
              Import {selectedRows.length} product{selectedRows.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Importing */}
      {step === "importing" && (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-gray-700 mb-4">Importing products…</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div
              className="bg-[#33A579] h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{importProgress}%</p>
        </div>
      )}

      {/* Step 4 — Done */}
      {step === "done" && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#f0faf5] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#33A579" strokeWidth="1.5"/>
                <path d="M6 10l3 3 5-5" stroke="#33A579" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Import complete</p>
              <p className="text-xs text-gray-400">
                {results.filter((r) => r.ok).length} imported ·{" "}
                {results.filter((r) => !r.ok).length} failed
              </p>
            </div>
          </div>

          {results.some((r) => !r.ok) && (
            <div className="mb-4 border border-red-100 rounded-xl overflow-hidden">
              <p className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 border-b border-red-100">Failed</p>
              {results.filter((r) => !r.ok).map((r, i) => (
                <div key={i} className="px-4 py-2 text-xs border-b border-red-50 last:border-0">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="text-red-400 ml-2">{r.error}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Import more
            </button>
            <a
              href="/products"
              className="flex-1 text-center bg-[#00343A] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#004f58]"
            >
              View products
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
