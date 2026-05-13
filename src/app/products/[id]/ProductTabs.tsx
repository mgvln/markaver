"use client"
import { useState } from "react"
import TrendsTab, { type PricePoint, type AmpPoint } from "./TrendsTab"
import TriggersTab, { type TriggerRow } from "./TriggersTab"
import { TooltipIcon } from "@/components/TooltipIcon"

const AMP_TOOLTIP = "Average Market Price — the mean price of all tracked competitors for this product"
const SRP_TOOLTIP = "Suggested Retail Price — your recommended selling price based on the market average and your position rule"

export type CompetitorRow = {
  id: string
  name: string
  url: string
  source: string | null
  type: string
  snap: {
    price: number
    pricePerServing: number | null
    pricePer30Days: number | null
    inStock: boolean
    isOutlier: boolean
  } | null
}

export type RecData = {
  ampMean: number
  ampMedian: number
  ampTrimmed: number
  srp: number
  srpPerServing: number
  markupRatio: number
} | null

interface Props {
  productId: string
  sym: string
  servingsPerPack: number
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
  productId, sym, servingsPerPack, adjustment, positionRule,
  competitors, rec, priceData, ampData, competitorNames, triggers,
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
      <div className="flex gap-0 border-b border-gray-200 bg-white px-8">
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
      {activeTab === 2 && <PlaceholderTab label="Recommendation" />}
      {activeTab === 3 && <PlaceholderTab label="Wholesale" />}
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
  servingsPerPack: number
  adjustment: number
  positionRule: string
  productId: string
}

function ResearchTab({ competitors, rec, sym, servingsPerPack, adjustment, positionRule }: ResearchProps) {
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
    <div className="p-8">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f9faf8] border-b border-gray-200">
              {["Brand & Product", "Class", "Source", "Retail", `${sym}/serving`, `${sym}/30d`, "Stock"].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 ${
                    ["Retail", `${sym}/serving`, `${sym}/30d`].includes(h) ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
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
                    </p>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-[#33A579] hover:underline truncate block max-w-xs"
                    >
                      {c.url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isDirect ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {isDirect ? "Direct" : "Indirect"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.source ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                    {snap ? `${sym}${snap.price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                    {snap?.pricePerServing ? `${sym}${snap.pricePerServing.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                    {snap?.pricePer30Days ? `${sym}${snap.pricePer30Days.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {snap ? (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${snap.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {snap.inStock ? "In" : "Out"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>

          {rec && (
            <tfoot>
              {([
                ["AMP — Mean", rec.ampMean],
                ["AMP — Median", rec.ampMedian],
                ["AMP — Trimmed (default)", rec.ampTrimmed],
              ] as [string, number][]).map(([label, amp]) => (
                <tr key={label} className="bg-[#f9faf8] border-t border-gray-200">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-[#4f46e5]">
                    {label}<TooltipIcon text={AMP_TOOLTIP} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900">{sym}{amp.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900">{sym}{(amp / servingsPerPack).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900">{sym}{(amp * (30 / servingsPerPack)).toFixed(2)}</td>
                  <td />
                </tr>
              ))}
              <tr className="bg-[#ecfdf5] border-t-2 border-[#33A579]">
                <td colSpan={3} className="px-4 py-4 text-right text-sm font-bold text-[#047857]">
                  Recommended SRP<TooltipIcon text={SRP_TOOLTIP} />{" "}
                  <span className="font-normal text-gray-400">(+{adjustment}% above {positionRule})</span>
                </td>
                <td className="px-4 py-4 text-right font-bold text-[#047857] font-mono text-base">{sym}{rec.srp.toFixed(2)}</td>
                <td className="px-4 py-4 text-right font-bold text-[#047857] font-mono text-base">{sym}{rec.srpPerServing.toFixed(2)}</td>
                <td className="px-4 py-4 text-right font-bold text-[#047857] font-mono text-base">{sym}{(rec.srp * (30 / servingsPerPack)).toFixed(2)}</td>
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
  )
}
