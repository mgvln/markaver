import { TooltipIcon } from "@/components/TooltipIcon"

export type RecFull = {
  ampMean: number
  ampMedian: number
  ampTrimmed: number
  ampMeanPerKg: number | null
  ampMedianPerKg: number | null
  ampTrimmedPerKg: number | null
  srp: number
  srpPerServing: number
  markupRatio: number
  marginPct: number
} | null

interface Props {
  rec: RecFull
  costPrice: number
  minMarkup: number
  positionRule: string
  adjustment: number
  servingsPerPack: number
  productType: string
  gramsPerServing?: number | null
  sym: string
}

const RULE_LABEL: Record<string, string> = {
  mean: "Mean",
  median: "Median",
  trimmed: "Trimmed mean",
}

function tierLabel(adjustment: number): { label: string; color: string } {
  if (adjustment >= 10) return { label: "Premium", color: "bg-purple-100 text-purple-700" }
  if (adjustment > -5) return { label: "Mid", color: "bg-blue-100 text-blue-700" }
  return { label: "Budget", color: "bg-gray-100 text-gray-600" }
}

export default function RecommendationTab({
  rec, costPrice, minMarkup, positionRule, adjustment, servingsPerPack,
  productType, gramsPerServing, sym,
}: Props) {
  if (!rec) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 font-medium mb-1">No recommendation yet</p>
        <p className="text-gray-400 text-sm">Run a scrape cycle to generate a pricing recommendation.</p>
      </div>
    )
  }

  const isPowder = productType === "powder"
  const hasKgData = isPowder && rec.ampMeanPerKg != null
  const tier = tierLabel(adjustment)
  const belowMinMarkup = rec.markupRatio < minMarkup

  const baseAmp = positionRule === "median" ? rec.ampMedian : positionRule === "mean" ? rec.ampMean : rec.ampTrimmed
  const baseAmpPerKg = positionRule === "median" ? rec.ampMedianPerKg : positionRule === "mean" ? rec.ampMeanPerKg : rec.ampTrimmedPerKg

  const ampRows: { label: string; value: number; kgValue: number | null; active: boolean }[] = [
    { label: "Mean AMP", value: rec.ampMean, kgValue: rec.ampMeanPerKg, active: positionRule === "mean" },
    { label: "Median AMP", value: rec.ampMedian, kgValue: rec.ampMedianPerKg, active: positionRule === "median" },
    { label: "Trimmed mean AMP", value: rec.ampTrimmed, kgValue: rec.ampTrimmedPerKg, active: positionRule === "trimmed" },
  ]

  return (
    <div className="p-8 flex flex-col gap-6">

      {/* Market anchor */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-[#00343A] mb-4">
          Market Anchor
          <TooltipIcon text="Average Market Price used to anchor your SRP recommendation" />
        </h3>
        <div className={`grid gap-4 ${hasKgData ? "grid-cols-2" : "grid-cols-3"}`}>
          {ampRows.map((row) => (
            <div
              key={row.label}
              className={`rounded-lg p-4 border-2 ${
                row.active ? "border-[#33A579] bg-[#f0fdf4]" : "border-gray-100 bg-[#f9faf8]"
              }`}
            >
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                {row.label}
                {row.active && (
                  <span className="bg-[#33A579] text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                    Active
                  </span>
                )}
              </p>
              <p className={`text-lg font-bold font-mono ${row.active ? "text-[#047857]" : "text-gray-700"}`}>
                {sym}{row.value.toFixed(2)}
              </p>
              {hasKgData && row.kgValue != null ? (
                <p className="text-xs text-gray-400 mt-0.5">{sym}{row.kgValue.toFixed(2)}/kg</p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">{sym}{(row.value / servingsPerPack).toFixed(2)}/serving</p>
              )}
            </div>
          ))}
        </div>

        {/* Powder: per-kg detail row */}
        {hasKgData && gramsPerServing && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-semibold text-gray-700">{sym}{rec.ampMeanPerKg!.toFixed(2)}/kg</span>
              <span className="ml-1">mean</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">{sym}{rec.ampMedianPerKg!.toFixed(2)}/kg</span>
              <span className="ml-1">median</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">{sym}{rec.ampTrimmedPerKg!.toFixed(2)}/kg</span>
              <span className="ml-1">trimmed</span>
            </div>
            <div className="col-span-3 text-gray-400">
              Pack weight: {((servingsPerPack * gramsPerServing) / 1000).toFixed(3)} kg
              ({servingsPerPack} servings × {gramsPerServing}g)
            </div>
          </div>
        )}
      </div>

      {/* SRP calculation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#00343A]">SRP Calculation</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${tier.color}`}>
            {tier.label}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#f9faf8] rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">
              {RULE_LABEL[positionRule]} AMP {hasKgData ? "(per kg)" : "(per serving)"}
            </p>
            <p className="text-base font-bold font-mono text-gray-800">
              {hasKgData
                ? `${sym}${(baseAmpPerKg ?? 0).toFixed(2)}`
                : `${sym}${(baseAmp / servingsPerPack).toFixed(2)}`}
            </p>
          </div>
          <span className="text-gray-300 text-lg font-light">×</span>
          <div className="bg-[#f9faf8] rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{hasKgData ? "Pack weight" : "Servings"}</p>
            <p className="text-base font-bold text-gray-800">
              {hasKgData && gramsPerServing
                ? `${((servingsPerPack * gramsPerServing) / 1000).toFixed(3)} kg`
                : `${servingsPerPack}`}
            </p>
          </div>
          {adjustment !== 0 && (
            <>
              <span className="text-gray-300 text-lg font-light">×</span>
              <div className="bg-[#f9faf8] rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Tier adjustment</p>
                <p className="text-base font-bold text-gray-800">
                  {adjustment > 0 ? "+" : ""}{adjustment}%
                </p>
              </div>
            </>
          )}
          <span className="text-gray-300 text-lg font-light">=</span>
          <div className="bg-[#ecfdf5] border-2 border-[#33A579] rounded-lg px-5 py-3 text-center">
            <p className="text-xs text-[#047857] font-semibold mb-1">Recommended SRP</p>
            <p className="text-xl font-bold font-mono text-[#047857]">{sym}{rec.srp.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Per serving</p>
            <p className="font-semibold font-mono text-gray-800">{sym}{rec.srpPerServing.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Per 30 days</p>
            <p className="font-semibold font-mono text-gray-800">
              {sym}{(rec.srp * (30 / servingsPerPack)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Margin analysis */}
      <div className={`bg-white rounded-xl border-2 p-6 ${belowMinMarkup ? "border-red-300" : "border-gray-200"}`}>
        <h3 className="text-sm font-semibold text-[#00343A] mb-4">Margin Analysis</h3>

        {belowMinMarkup && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            Markup {rec.markupRatio.toFixed(2)}× is below your minimum of {minMarkup.toFixed(1)}×. Consider raising your SRP or reviewing your cost price.
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              Markup ratio
              <TooltipIcon text="SRP divided by cost price. Minimum 5× per Rawcreation spec." />
            </p>
            <p className={`text-2xl font-bold font-mono ${belowMinMarkup ? "text-red-600" : "text-[#00343A]"}`}>
              {rec.markupRatio.toFixed(2)}×
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Minimum: {minMarkup.toFixed(1)}×</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              Gross margin
              <TooltipIcon text="(SRP − cost) ÷ SRP" />
            </p>
            <p className="text-2xl font-bold font-mono text-[#00343A]">
              {rec.marginPct.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Cost: {sym}{costPrice.toFixed(2)}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
