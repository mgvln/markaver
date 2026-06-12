export interface SnapshotInput {
  pricePerServing: number
  pricePerKg?: number | null
  inStock: boolean
  isOutlier: boolean
}

export interface PricingInput {
  snapshots: SnapshotInput[]
  costPrice: number
  servingsPerPack: number
  positionRule: string
  adjustment: number
  productType?: string
  gramsPerServing?: number | null
}

export interface PricingOutput {
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

function pick(rule: string, m: number, med: number, t: number): number {
  if (rule === "median") return med
  if (rule === "mean") return m
  return t
}

export function calculatePricing(input: PricingInput): PricingOutput | null {
  const { snapshots, costPrice, servingsPerPack, positionRule, adjustment, productType, gramsPerServing } = input
  const isPowder = productType === "powder"

  const validSnaps = snapshots.filter((s) => s.inStock && !s.isOutlier)

  // --- Capsule path (per-serving) ---
  const servingPrices = validSnaps.map((s) => s.pricePerServing).filter((p) => p > 0)
  if (servingPrices.length === 0) return null

  const ampMeanServing = mean(servingPrices)
  const ampMedianServing = median(servingPrices)
  const ampTrimmedServing = trimmedMean(servingPrices)

  // --- Powder path (per-kg) ---
  const kgPrices = validSnaps.map((s) => s.pricePerKg).filter((p): p is number => p != null && p > 0)
  const hasKgData = isPowder && kgPrices.length > 0 && gramsPerServing != null && gramsPerServing > 0

  let ampMeanPerKg: number | null = null
  let ampMedianPerKg: number | null = null
  let ampTrimmedPerKg: number | null = null
  let srp: number
  let srpPerServing: number

  if (hasKgData) {
    ampMeanPerKg = mean(kgPrices)
    ampMedianPerKg = median(kgPrices)
    ampTrimmedPerKg = trimmedMean(kgPrices)

    const baseAmpPerKg = pick(positionRule, ampMeanPerKg, ampMedianPerKg, ampTrimmedPerKg)
    const packWeightKg = (servingsPerPack * gramsPerServing!) / 1000
    srp = baseAmpPerKg * packWeightKg * (1 + adjustment / 100)
    srpPerServing = srp / servingsPerPack
  } else {
    // Capsule formula (also fallback for powder without kg data)
    const baseAmpServing = pick(positionRule, ampMeanServing, ampMedianServing, ampTrimmedServing)
    srpPerServing = baseAmpServing * (1 + adjustment / 100)
    srp = srpPerServing * servingsPerPack
  }

  const markupRatio = srp / costPrice
  const marginPct = ((srp - costPrice) / srp) * 100

  return {
    ampMean: parseFloat((ampMeanServing * servingsPerPack).toFixed(2)),
    ampMedian: parseFloat((ampMedianServing * servingsPerPack).toFixed(2)),
    ampTrimmed: parseFloat((ampTrimmedServing * servingsPerPack).toFixed(2)),
    ampMeanPerKg: ampMeanPerKg !== null ? parseFloat(ampMeanPerKg.toFixed(2)) : null,
    ampMedianPerKg: ampMedianPerKg !== null ? parseFloat(ampMedianPerKg.toFixed(2)) : null,
    ampTrimmedPerKg: ampTrimmedPerKg !== null ? parseFloat(ampTrimmedPerKg.toFixed(2)) : null,
    srp: parseFloat(srp.toFixed(2)),
    srpPerServing: parseFloat(srpPerServing.toFixed(4)),
    markupRatio: parseFloat(markupRatio.toFixed(4)),
    marginPct: parseFloat(marginPct.toFixed(2)),
  }
}
