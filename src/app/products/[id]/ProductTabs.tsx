"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import TrendsTab, { type PricePoint, type AmpPoint } from "./TrendsTab"
import TriggersTab, { type TriggerRow } from "./TriggersTab"
import RecommendationTab, { type RecFull } from "./RecommendationTab"
import WholesaleTab from "./WholesaleTab"
import { TooltipIcon } from "@/components/TooltipIcon"
import EditCompetitorModal from "./EditCompetitorModal"

const AMP_TOOLTIP = "Average Market Price — the mean price of all tracked competitors for this product"
const SRP_TOOLTIP = "Suggested Retail Price — your recommended selling price based on the market average and your position rule"

export type CompetitorRow = {
  id: string
  name: string
  url: string
  source: string | null
  type: string
  claim: string | null
  ingredients: string | null
  servings: number | null
  scrapeFailCount: number
  manualPrice: number | null
  snap: {
    price: number
    pricePerServing: number | null
    pricePer30Days: number | null
    pricePerKg: number | null
    inStock: boolean
    isOutlier: boolean
  } | null
}

export type RecData = RecFull

interface Props {
  productId: string
  sym: string
  productType: string
  costPrice: number
  minMarkup: number
  servingsPerPack: number
  gramsPerServing?: number | null
  adjustment: number
  positionRule: string
  competitors: CompetitorRow[]
  rec: RecData
  priceData: PricePoint[]
  ampData: AmpPoint[]
  competitorNames: string[]
  triggers: TriggerRow[]
}

export default function ProductTabs({
  productId, sym, productType, costPrice, minMarkup, servingsPerPack, gramsPerServing,
  adjustment, positionRule, competitors, rec, priceData, ampData, competitorNames, triggers,
}: Props) {
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    `Research (${competitors.length})`,
    "Trends",
    "Recommendation",
    "Wholesale",
    `Triggers (${triggers.length})`,
    "Notes",
  ]

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-200 bg-white px-2 md:px-8 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm border-b-2 transition-colors ${
              i === activeTab
                ? "border-[#00343A] text-[#00343A] font-medium"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && (
        <ResearchTab
          competitors={competitors}
          rec={rec}
          sym={sym}
          productType={productType}
          servingsPerPack={servingsPerPack}
          adjustment={adjustment}
          positionRule={positionRule}
          productId={productId}
        />
      )}
      {activeTab === 1 && (
        <TrendsTab
          priceData={priceData}
          ampData={ampData}
          competitorNames={competitorNames}
          sym={sym}
        />
      )}
      {activeTab === 2 && (
        <RecommendationTab
          rec={rec}
          costPrice={costPrice}
          minMarkup={minMarkup}
          positionRule={positionRule}
          adjustment={adjustment}
          servingsPerPack={servingsPerPack}
          productType={productType}
          gramsPerServing={gramsPerServing}
          sym={sym}
        />
      )}
      {activeTab === 3 && (
        <WholesaleTab
          productId={productId}
          costPrice={costPrice}
          sym={sym}
        />
      )}
      {activeTab === 4 && (
        <TriggersTab productId={productId} initialTriggers={triggers} />
      )}
      {activeTab === 5 && <PlaceholderTab label="Notes" />}
    </>
  )
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-gray-400 text-sm">{label} — coming soon.</p>
    </div>
  )
}

interface ResearchProps {
  competitors: CompetitorRow[]
  rec: RecData
  sym: string
  productType: string
  servingsPerPack: number
  adjustment: number
  positionRule: string
  productId: string
}

const AMP_PER_KG_ROWS: [string, keyof NonNullable<RecData>][] = [
  ["AMP — Mean", "ampMeanPerKg"],
  ["AMP — Median", "ampMedianPerKg"],
  ["AMP — Trimmed (default)", "ampTrimmedPerKg"],
]

function ResearchTab({ competitors, rec, sym, productType, servingsPerPack, adjustment, positionRule, productId }: ResearchProps) {
  const isPowder = productType === "powder"
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorRow | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [manualPriceInputs, setManualPriceInputs] = useState<Record<string, string>>({})
  const [savingManualPrice, setSavingManualPrice] = useState<string | null>(null)
  const toggleExpanded = (id: string) =>
    setExpandedRows((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleSaveManualPrice = async (competitorId: string) => {
    const raw = manualPriceInputs[competitorId]
    const price = parseFloat(raw)
    if (isNaN(price) || price <= 0) return
    setSavingManualPrice(competitorId)
    await fetch(`/api/products/${productId}/competitors/${competitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualPrice: price }),
    })
    setSavingManualPrice(null)
    router.refresh()
  }

  const handleDelete = async (competitorId: string, name: string) => {
    if (!confirm(`Remove "${name}" from this product?`)) return
    setDeleting(competitorId)
    const res = await fetch(`/api/products/${productId}/competitors/${competitorId}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Failed to remove competitor. Please try again.")
      setDeleting(null)
      return
    }
    router.refresh()
    setDeleting(null)
  }

  if (competitors.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-medium mb-1">No competitors yet</p>
          <p className="text-gray-400 text-sm">Click &ldquo;+ Competitor&rdquo; to start tracking.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f9faf8] border-b border-gray-200">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Brand &amp; Product</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Class</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Source</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Positioning</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Retail</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">{sym}/serving</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">{sym}/30d</th>
              {isPowder && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">{sym}/kg</th>}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Stock</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {competitors.map((c) => {
              const snap = c.snap
              const isDirect = c.type === "direct"
              return (
                <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 ${snap?.isOutlier ? "bg-amber-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm text-[#00343A]">
                      {c.name}
                      {snap?.isOutlier && (
                        <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">Outlier</span>
                      )}
                      {c.scrapeFailCount >= 3 && !c.manualPrice && (
                        <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">Manual entry required</span>
                      )}
                      {c.manualPrice != null && (
                        <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">Manual price</span>
                      )}
                    </p>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-[#33A579] hover:underline truncate block max-w-xs"
                    >
                      {c.url}
                    </a>
                    {c.servings && (
                      <span className="text-xs text-gray-400">{c.servings} servings</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isDirect ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {isDirect ? "Direct" : "Indirect"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.source ?? "—"}</td>
                  <td className="px-4 py-3 max-w-[240px]">
                    {(c.claim || c.ingredients) ? (
                      <>
                        <div className={expandedRows.has(c.id) ? undefined : "line-clamp-2"}>
                          {c.claim && <p className="text-xs text-gray-700 font-medium whitespace-normal break-words">{c.claim}</p>}
                          {c.ingredients && <p className="text-xs text-gray-400 whitespace-normal break-words">{c.ingredients}</p>}
                        </div>
                        <button
                          onClick={() => toggleExpanded(c.id)}
                          className="text-xs text-[#33A579] hover:underline mt-0.5"
                        >
                          {expandedRows.has(c.id) ? "View less" : "View more"}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                    {snap ? `${sym}${snap.price.toFixed(2)}` : c.scrapeFailCount >= 3 ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-300 font-normal text-xs">{sym}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={c.manualPrice ? c.manualPrice.toFixed(2) : "0.00"}
                          value={manualPriceInputs[c.id] ?? (c.manualPrice?.toFixed(2) ?? "")}
                          onChange={(e) => setManualPriceInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                          className="w-20 text-right text-xs border border-orange-200 rounded px-1.5 py-1 focus:outline-none focus:border-orange-400 font-mono"
                        />
                        <button
                          onClick={() => handleSaveManualPrice(c.id)}
                          disabled={savingManualPrice === c.id}
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded disabled:opacity-50 transition-colors"
                        >
                          {savingManualPrice === c.id ? "…" : "Save"}
                        </button>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                    {snap?.pricePerServing ? `${sym}${snap.pricePerServing.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                    {snap?.pricePer30Days ? `${sym}${snap.pricePer30Days.toFixed(2)}` : "—"}
                  </td>
                  {isPowder && (
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                      {snap?.pricePerKg ? `${sym}${snap.pricePerKg.toFixed(2)}` : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {snap ? (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${snap.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {snap.inStock ? "In" : "Out"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingCompetitor(c)}
                        className="text-gray-300 hover:text-[#00343A] transition-colors"
                        title="Edit competitor"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 2l2 2-7 7H3v-2l7-7z" /><line x1="8" y1="4" x2="10" y2="6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deleting === c.id}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                        title="Remove competitor"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {rec && (
            <tfoot>
              {([
                ["AMP — Mean", rec.ampMean, rec.ampMeanPerKg],
                ["AMP — Median", rec.ampMedian, rec.ampMedianPerKg],
                ["AMP — Trimmed (default)", rec.ampTrimmed, rec.ampTrimmedPerKg],
              ] as [string, number, number | null][]).map(([label, amp, ampKg]) => (
                <tr key={label} className="bg-[#f9faf8] border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-[#4f46e5]">
                    {label}<TooltipIcon text={AMP_TOOLTIP} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900">{sym}{amp.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900">{sym}{(amp / servingsPerPack).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900">{sym}{(amp * (30 / servingsPerPack)).toFixed(2)}</td>
                  {isPowder && (
                    <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900">
                      {ampKg != null ? `${sym}${ampKg.toFixed(2)}` : "—"}
                    </td>
                  )}
                  <td /><td />
                </tr>
              ))}
              <tr className="bg-[#ecfdf5] border-t-2 border-[#33A579]">
                <td colSpan={4} className="px-4 py-4 text-right text-sm font-bold text-[#047857]">
                  Recommended SRP<TooltipIcon text={SRP_TOOLTIP} />{" "}
                  <span className="font-normal text-gray-400">({adjustment >= 0 ? "+" : ""}{adjustment}% {positionRule})</span>
                </td>
                <td className="px-4 py-4 text-right font-bold text-[#047857] font-mono text-base">{sym}{rec.srp.toFixed(2)}</td>
                <td className="px-4 py-4 text-right font-bold text-[#047857] font-mono text-base">{sym}{rec.srpPerServing.toFixed(2)}</td>
                <td className="px-4 py-4 text-right font-bold text-[#047857] font-mono text-base">{sym}{(rec.srp * (30 / servingsPerPack)).toFixed(2)}</td>
                {isPowder && <td />}
                <td />
                <td className="px-4 py-4">
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                    {rec.markupRatio.toFixed(2)}×
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
      <EditCompetitorModal
        productId={productId}
        competitor={editingCompetitor}
        open={editingCompetitor !== null}
        onClose={() => setEditingCompetitor(null)}
      />
    </div>
  )
}
