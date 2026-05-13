export interface SnapshotInput {
  pricePerServing: number
  inStock: boolean
  isOutlier: boolean
}

export interface PricingInput {
  snapshots: SnapshotInput[]
  costPrice: number
  servingsPerPack: number
  positionRule: string
  adjustment: number
}

export interface PricingOutput {
  ampMean: number
  ampMedian: number
  ampTrimmed: number
  srp: number
  srpPerServing: number
  markupRatio: number
  marginPct: number
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function trimmedMean(values: number[], trimFraction = 0.1): number {
  const sorted = [...values].sort((a, b) => a - b)
  const cut = Math.floor(sorted.length * trimFraction)
  const trimmed = cut > 0 ? sorted.slice(cut, sorted.length - cut) : sorted
  return mean(trimmed)
}

export function calculatePricing(input: PricingInput): PricingOutput | null {
  const { snapshots, costPrice, servingsPerPack, positionRule, adjustment } = input

  const prices = snapshots
    .filter((s) => s.inStock && !s.isOutlier)
    .map((s) => s.pricePerServing)
    .filter((p) => p > 0)

  if (prices.length === 0) return null

  const ampMean = mean(prices)
  const ampMedian = median(prices)
  const ampTrimmed = trimmedMean(prices)

  const baseAmp =
    positionRule === "median"
      ? ampMedian
      : positionRule === "mean"
      ? ampMean
      : ampTrimmed

  const srpPerServing = baseAmp * (1 + adjustment / 100)
  const srp = srpPerServing * servingsPerPack
  const markupRatio = srp / costPrice
  const marginPct = ((srp - costPrice) / srp) * 100

  return {
    ampMean: parseFloat((ampMean * servingsPerPack).toFixed(2)),
    ampMedian: parseFloat((ampMedian * servingsPerPack).toFixed(2)),
    ampTrimmed: parseFloat((ampTrimmed * servingsPerPack).toFixed(2)),
    srp: parseFloat(srp.toFixed(2)),
    srpPerServing: parseFloat(srpPerServing.toFixed(4)),
    markupRatio: parseFloat(markupRatio.toFixed(4)),
    marginPct: parseFloat(marginPct.toFixed(2)),
  }
}
