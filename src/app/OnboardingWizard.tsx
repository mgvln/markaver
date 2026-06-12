"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }
const STORAGE_KEY = "markaver_onboarding_done"

type Step = 1 | 2 | 3 | 4

interface CompetitorInput {
  name: string
  url: string
}

export default function OnboardingWizard() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>(1)

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "", currency: "GBP", productType: "capsule",
    costPrice: "", servingsPerPack: "30",
  })
  const [productId, setProductId] = useState<string | null>(null)
  const [productError, setProductError] = useState("")
  const [productSaving, setProductSaving] = useState(false)

  // Competitors state
  const [competitors, setCompetitors] = useState<CompetitorInput[]>([{ name: "", url: "" }])
  const [compSaving, setCompSaving] = useState(false)
  const [compError, setCompError] = useState("")

  // Scrape state
  const [scraping, setScraping] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  const updateProduct = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setProductForm((f) => ({ ...f, [key]: e.target.value }))

  const handleCreateProduct = async () => {
    setProductSaving(true)
    setProductError("")
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: productForm.name,
        currency: productForm.currency,
        productType: productForm.productType,
        costPrice: parseFloat(productForm.costPrice),
        servingsPerPack: parseInt(productForm.servingsPerPack),
        minMarkup: 5.0,
        positionRule: "mean",
        adjustment: 20,
        scrapeInterval: "weekly",
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setProductError(data.error || "Failed to create product")
      setProductSaving(false)
      return
    }
    setProductId(data.id)
    setProductSaving(false)
    setStep(3)
  }

  const updateCompetitor = (i: number, key: keyof CompetitorInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCompetitors((cs) => cs.map((c, idx) => idx === i ? { ...c, [key]: e.target.value } : c))
    }

  const addCompetitor = () => {
    if (competitors.length < 5) setCompetitors((cs) => [...cs, { name: "", url: "" }])
  }

  const removeCompetitor = (i: number) =>
    setCompetitors((cs) => cs.filter((_, idx) => idx !== i))

  const handleSaveCompetitors = async () => {
    if (!productId) return
    const valid = competitors.filter((c) => c.name.trim() && c.url.trim())
    if (valid.length === 0) { setStep(4); return }

    setCompSaving(true)
    setCompError("")
    for (const c of valid) {
      const res = await fetch(`/api/products/${productId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: c.name, url: c.url }),
      })
      if (!res.ok) {
        const d = await res.json()
        setCompError(d.error || "Failed to add a competitor")
        setCompSaving(false)
        return
      }
    }
    setCompSaving(false)
    setStep(4)
  }

  const handleRunScrape = async () => {
    if (!productId) return
    setScraping(true)
    await fetch(`/api/products/${productId}/scrape`, { method: "POST" })
    setScraping(false)
    dismiss()
    router.push(`/products/${productId}`)
  }

  const goToProduct = () => {
    dismiss()
    if (productId) router.push(`/products/${productId}`)
    else router.refresh()
  }

  if (!visible) return null

  const sym = CURRENCY_SYMBOL[productForm.currency] ?? "£"

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative">

        {/* Step indicator */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-0 mb-6">
            {([1, 2, 3] as const).map((n, i) => (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step > n ? "bg-[#33A579] text-white" :
                  step === n ? "bg-[#00343A] text-white" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {step > n ? "✓" : n}
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-1 ${step > n ? "bg-[#33A579]" : "bg-gray-100"}`} />
                )}
              </div>
            ))}
            <div className="flex-1" />
            <button
              onClick={dismiss}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none ml-4"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="px-8 pb-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#f0faf5] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 3L29 10V22L16 29L3 22V10L16 3Z" stroke="#00343A" strokeWidth="2" fill="none"/>
                  <path d="M16 3L16 29M3 10L29 22M29 10L3 22" stroke="#33A579" strokeWidth="1.5" opacity="0.5"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#00343A] mb-2">Welcome to Markaver</h2>
              <p className="text-sm text-gray-500">
                Let&apos;s get your first product set up in 3 quick steps — add your product details, add competitors, and run your first price scrape.
              </p>
            </div>

            <div className="flex flex-col gap-2 mb-6 text-sm">
              {[
                ["1", "Create your product", "Name, cost price, pack size"],
                ["2", "Add competitors", "Paste their product URLs"],
                ["3", "Run your first scrape", "Get live market prices instantly"],
              ].map(([n, title, sub]) => (
                <div key={n} className="flex items-start gap-3 bg-[#f9faf8] rounded-lg px-4 py-3">
                  <span className="w-5 h-5 rounded-full bg-[#00343A] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                  <div>
                    <p className="font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-[#00343A] text-white py-3 rounded-xl font-medium hover:bg-[#004f58]"
            >
              Get started
            </button>
          </div>
        )}

        {/* Step 2 — Create product */}
        {step === 2 && (
          <div className="px-8 pb-8">
            <h2 className="text-lg font-bold text-[#00343A] mb-1">Create your product</h2>
            <p className="text-sm text-gray-400 mb-5">Just the essentials — you can edit everything later.</p>

            {productError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                {productError}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={updateProduct("name")}
                  placeholder="e.g. Green Juice Powder"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={productForm.currency}
                    onChange={updateProduct("currency")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product type</label>
                  <select
                    value={productForm.productType}
                    onChange={updateProduct("productType")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                  >
                    <option value="capsule">Capsule</option>
                    <option value="powder">Powder</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost price <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={productForm.costPrice}
                      onChange={updateProduct("costPrice")}
                      placeholder="0.00"
                      required
                      className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Servings per pack</label>
                  <input
                    type="number" min="1"
                    value={productForm.servingsPerPack}
                    onChange={updateProduct("servingsPerPack")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={productSaving || !productForm.name || !productForm.costPrice}
                className="flex-1 bg-[#00343A] text-white py-2.5 rounded-xl font-medium hover:bg-[#004f58] disabled:opacity-50"
              >
                {productSaving ? "Creating..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Add competitors */}
        {step === 3 && (
          <div className="px-8 pb-8">
            <h2 className="text-lg font-bold text-[#00343A] mb-1">Add competitors</h2>
            <p className="text-sm text-gray-400 mb-5">Paste the URL of each competitor&apos;s product page. You can add more later.</p>

            {compError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                {compError}
              </div>
            )}

            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={c.name}
                      onChange={updateCompetitor(i, "name")}
                      placeholder="Competitor name"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                    />
                    <input
                      type="url"
                      value={c.url}
                      onChange={updateCompetitor(i, "url")}
                      placeholder="https://..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                    />
                  </div>
                  {competitors.length > 1 && (
                    <button
                      onClick={() => removeCompetitor(i)}
                      className="text-gray-300 hover:text-red-400 mt-2 text-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {competitors.length < 5 && (
              <button
                onClick={addCompetitor}
                className="mt-3 text-sm text-[#33A579] hover:text-[#00343A] font-medium"
              >
                + Add another competitor
              </button>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600"
              >
                Skip
              </button>
              <button
                onClick={handleSaveCompetitors}
                disabled={compSaving}
                className="flex-1 bg-[#00343A] text-white py-2.5 rounded-xl font-medium hover:bg-[#004f58] disabled:opacity-50"
              >
                {compSaving ? "Saving..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <div className="px-8 pb-8 text-center">
            <div className="w-16 h-16 bg-[#f0faf5] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" stroke="#33A579" strokeWidth="2"/>
                <path d="M10 16l4 4 8-8" stroke="#33A579" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#00343A] mb-2">You&apos;re all set!</h2>
            <p className="text-sm text-gray-500 mb-8">
              Your product is ready. Run your first scrape now to pull live competitor prices, or explore the dashboard first.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleRunScrape}
                disabled={scraping}
                className="w-full bg-[#33A579] text-white py-3 rounded-xl font-medium hover:bg-[#2a8f65] disabled:opacity-50"
              >
                {scraping ? "Running scrape..." : "Run first scrape now"}
              </button>
              <button
                onClick={goToProduct}
                className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50"
              >
                Go to product page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
