"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export const dynamic = "force-dynamic"

const STEPS = ["Organisation", "First product", "Competitors", "Pricing rule"] as const

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579] focus:border-transparent"
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5"

type Competitor = { name: string; url: string }

// Seeded when the user picks "start with sample data" — a real, scrapeable product
// so the dashboard is not empty on first login. Monthly interval keeps scrape cost low.
const SAMPLE = {
  product: {
    name: "Creatine Monohydrate (sample)",
    sku: "SAMPLE-CM-300G",
    productType: "powder",
    costPrice: 3.62,
    servingsPerPack: 60,
    gramsPerServing: 5,
    currency: "GBP",
    scrapeInterval: "monthly",
    positionRule: "trimmed",
    adjustment: 20,
  },
  competitors: [
    { name: "MyProtein Creatine Monohydrate", url: "https://www.myprotein.com/p/sports-nutrition/creatine-monohydrate-powder/10530050/" },
    { name: "Bulk Creatine Monohydrate", url: "https://www.bulk.com/uk/products/creatine-monohydrate/bpb-cmon-0000" },
    { name: "The Protein Works Creatine", url: "https://www.theproteinworks.com/creatine-monohydrate" },
  ],
}

export default function SetupWizard() {
  const { data: session, update, status } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [orgName, setOrgName] = useState("")
  const [productId, setProductId] = useState<string | null>(null)

  const [product, setProduct] = useState({
    name: "",
    productType: "capsule",
    costPrice: "",
    servingsPerPack: "30",
    currency: "EUR",
  })
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { name: "", url: "" },
    { name: "", url: "" },
    { name: "", url: "" },
  ])
  const [rule, setRule] = useState({
    positionRule: "trimmed",
    adjustment: "20",
    scrapeInterval: "weekly",
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    // Only bounce out if they already had an org before the wizard began — once we
    // create one mid-wizard the session gains an orgId and this would fire wrongly.
    if (!started && status === "authenticated" && session?.user?.orgId) router.push("/")
  }, [status, session, router, started])

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Something went wrong")
    return data
  }

  const createOrg = async () => {
    if (!orgName.trim()) return setError("Please enter an organisation name")
    setLoading(true)
    setError("")
    try {
      setStarted(true)
      const data = await post("/api/auth/setup-org", { orgName })
      await update({ orgId: data.orgId })
      setStep(2)
    } catch (e) {
      setStarted(false)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const createProduct = async () => {
    if (!product.name.trim()) return setError("Please enter a product name")
    if (product.costPrice === "") return setError("Please enter your cost price")
    setLoading(true)
    setError("")
    try {
      const created = await post("/api/products", {
        ...product,
        gramsPerServing: product.productType === "powder" ? 5 : null,
      })
      setProductId(created.id)
      setStep(3)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const useSampleData = async () => {
    setLoading(true)
    setError("")
    try {
      const created = await post("/api/products", SAMPLE.product)
      for (const c of SAMPLE.competitors) {
        await post(`/api/products/${created.id}/competitors`, { ...c, type: "direct" })
      }
      setProductId(created.id)
      setRule({ positionRule: "trimmed", adjustment: "20", scrapeInterval: "monthly" })
      setStep(4)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const saveCompetitors = async () => {
    const filled = competitors.filter((c) => c.url.trim())
    setLoading(true)
    setError("")
    try {
      for (const c of filled) {
        await post(`/api/products/${productId}/competitors`, {
          name: c.name.trim() || new URL(c.url).hostname.replace(/^www\./, ""),
          url: c.url.trim(),
          type: "direct",
        })
      }
      setStep(4)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const finish = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      })
      if (!res.ok) throw new Error("Could not save pricing rule")
      router.push(`/products/${productId}`)
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  if (status === "loading") return null

  return (
    <div className="min-h-screen bg-[#f9faf8] flex flex-col">
      <header className="bg-[#00343A] px-6 py-5">
        <p className="text-white font-bold text-lg leading-none">Markaver</p>
        <p className="text-[#33A579] text-xs mt-1">Pricing Intelligence</p>
      </header>

      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-10">
        {/* Progress */}
        <ol className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => {
            const n = i + 1
            const done = n < step
            const active = n === step
            return (
              <li key={label} className="flex-1">
                <div
                  className={`h-1 rounded-full mb-2 ${
                    done || active ? "bg-[#33A579]" : "bg-gray-200"
                  }`}
                />
                <p
                  className={`text-[11px] font-medium ${
                    active ? "text-[#00343A]" : done ? "text-[#33A579]" : "text-gray-400"
                  }`}
                >
                  {n}. {label}
                </p>
              </li>
            )
          })}
        </ol>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ---------- Step 1 ---------- */}
          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-[#00343A] mb-1">
                Create your organisation
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Everything in Markaver — products, competitors, pricing — belongs to an
                organisation. You can invite your team once this is set up.
              </p>
              <label className={LABEL}>Organisation name</label>
              <input
                className={INPUT}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Rawcreation"
                onKeyDown={(e) => e.key === "Enter" && createOrg()}
                autoFocus
              />
              <button
                onClick={createOrg}
                disabled={loading}
                className="mt-6 w-full bg-[#00343A] text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-[#024c54] disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating…" : "Continue"}
              </button>
            </>
          )}

          {/* ---------- Step 2 ---------- */}
          {step === 2 && (
            <>
              <h1 className="text-xl font-bold text-[#00343A] mb-1">
                Add your first product
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                This is the product you want priced. Cost price stays private — it is
                only used to calculate your markup and margin.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={LABEL}>Product name</label>
                  <input
                    className={INPUT}
                    value={product.name}
                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                    placeholder="e.g. Magnesium Glycinate"
                    autoFocus
                  />
                </div>
                <div>
                  <label className={LABEL}>Type</label>
                  <select
                    className={INPUT}
                    value={product.productType}
                    onChange={(e) => setProduct({ ...product, productType: e.target.value })}
                  >
                    <option value="capsule">Capsule</option>
                    <option value="powder">Powder</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Currency</label>
                  <select
                    className={INPUT}
                    value={product.currency}
                    onChange={(e) => setProduct({ ...product, currency: e.target.value })}
                  >
                    <option value="EUR">EUR €</option>
                    <option value="GBP">GBP £</option>
                    <option value="USD">USD $</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Cost price per pack</label>
                  <input
                    className={INPUT}
                    type="number"
                    step="0.01"
                    value={product.costPrice}
                    onChange={(e) => setProduct({ ...product, costPrice: e.target.value })}
                    placeholder="5.67"
                  />
                </div>
                <div>
                  <label className={LABEL}>Servings per pack</label>
                  <input
                    className={INPUT}
                    type="number"
                    value={product.servingsPerPack}
                    onChange={(e) =>
                      setProduct({ ...product, servingsPerPack: e.target.value })
                    }
                    placeholder="30"
                  />
                </div>
              </div>

              <button
                onClick={createProduct}
                disabled={loading}
                className="mt-6 w-full bg-[#00343A] text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-[#024c54] disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving…" : "Continue"}
              </button>

              <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500 mb-2">
                  Just want to look around first?
                </p>
                <button
                  onClick={useSampleData}
                  disabled={loading}
                  className="text-sm font-semibold text-[#33A579] hover:underline disabled:opacity-50"
                >
                  Start with sample data instead
                </button>
                <p className="text-[11px] text-gray-400 mt-1">
                  Creates a demo product with three real competitors you can delete later.
                </p>
              </div>
            </>
          )}

          {/* ---------- Step 3 ---------- */}
          {step === 3 && (
            <>
              <h1 className="text-xl font-bold text-[#00343A] mb-1">Add competitors</h1>
              <p className="text-sm text-gray-500 mb-6">
                Paste product page URLs for the competitors you want tracked. Markaver
                scrapes these on a schedule to work out the market average. You can add
                more later.
              </p>

              <div className="flex flex-col gap-4">
                {competitors.map((c, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3">
                    <input
                      className={INPUT}
                      value={c.name}
                      onChange={(e) => {
                        const next = [...competitors]
                        next[i] = { ...next[i], name: e.target.value }
                        setCompetitors(next)
                      }}
                      placeholder={`Name (optional)`}
                    />
                    <input
                      className={`${INPUT} col-span-2`}
                      value={c.url}
                      onChange={(e) => {
                        const next = [...competitors]
                        next[i] = { ...next[i], url: e.target.value }
                        setCompetitors(next)
                      }}
                      placeholder="https://competitor.com/products/…"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={saveCompetitors}
                disabled={loading}
                className="mt-6 w-full bg-[#00343A] text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-[#024c54] disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving…" : "Continue"}
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={loading}
                className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 py-1.5 disabled:opacity-50"
              >
                Skip for now
              </button>
            </>
          )}

          {/* ---------- Step 4 ---------- */}
          {step === 4 && (
            <>
              <h1 className="text-xl font-bold text-[#00343A] mb-1">
                Choose your pricing rule
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                This decides where you sit against the market. You can change it per
                product at any time.
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className={LABEL}>Market anchor</label>
                  <select
                    className={INPUT}
                    value={rule.positionRule}
                    onChange={(e) => setRule({ ...rule, positionRule: e.target.value })}
                  >
                    <option value="trimmed">Trimmed mean — ignores outliers (recommended)</option>
                    <option value="mean">Mean — simple average</option>
                    <option value="median">Median — middle price</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Position (% above the anchor)</label>
                  <input
                    className={INPUT}
                    type="number"
                    value={rule.adjustment}
                    onChange={(e) => setRule({ ...rule, adjustment: e.target.value })}
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className={LABEL}>How often should we check prices?</label>
                  <select
                    className={INPUT}
                    value={rule.scrapeInterval}
                    onChange={(e) => setRule({ ...rule, scrapeInterval: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every two weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 bg-[#f9faf8] border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-600">
                  Alerts are sent after every scrape cycle. Connect Slack, or build custom
                  triggers, from <strong>Settings</strong> once you are set up.
                </p>
              </div>

              <button
                onClick={finish}
                disabled={loading}
                className="mt-6 w-full bg-[#33A579] text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-[#2b8c66] disabled:opacity-50 transition-colors"
              >
                {loading ? "Finishing…" : "Finish setup"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
