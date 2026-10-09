import { prisma } from "@/lib/prisma"
import { scrapeUrl } from "@/lib/apify"
import { convertCurrency } from "@/lib/fx"
import { calculatePricing } from "@/lib/pricing"
import { evaluateTriggers, sendCycleReport } from "@/lib/triggers"

function detectOutlier(price: number, mean: number, stddev: number): boolean {
  if (stddev === 0) return false
  return Math.abs(price - mean) > 2 * stddev
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const m = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length)
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

// A single cycle can contain too few prices for the ±2σ test to mean anything
// (one result => stddev 0 => nothing is ever an outlier). Compare each price to
// that competitor's own recent history instead, so a scrape that returns a
// fragment like 0.35 for a 28.00 product is flagged rather than trusted.
const SANITY_LOW = 0.25
const SANITY_HIGH = 4
const MIN_SAMPLES_FOR_RECOMMENDATION = 2

function failsHistoricalSanity(price: number, history: number[]): boolean {
  if (history.length === 0) return false
  const base = median(history)
  if (base <= 0) return false
  return price < base * SANITY_LOW || price > base * SANITY_HIGH
}

// The historical check cannot help when a selector has been returning the same
// wrong value every cycle — the bad price becomes its own history. A competitor
// retailing far below our unit cost is not a real market price, it is a bad parse.
const IMPLAUSIBLE_VS_COST = 0.35

function failsCostPlausibility(price: number, costPrice: number): boolean {
  if (!costPrice || costPrice <= 0) return false
  return price < costPrice * IMPLAUSIBLE_VS_COST
}

export async function scrapeProduct(productId: string): Promise<{
  scraped: number
  failed: number
  recommendation: object | null
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { competitors: true },
  })

  if (!product) throw new Error("Product not found")

  const results: { competitorId: string; price: number; inStock: boolean }[] = []
  const runAt = new Date()

  console.log(`[scraper] Starting run for product ${productId} — ${product.competitors.length} competitor(s)`)

  const scrapeResults = await Promise.allSettled(
    product.competitors.map((c) => {
      console.log(`[scraper] Queuing: ${c.url}`)
      return scrapeUrl(c.url).then((r) => ({ ...r, competitorId: c.id }))
    })
  )

  // Track which competitors succeeded/failed for fail count updates
  const successfulCompetitorIds = new Set<string>()
  const failedCompetitorIds = new Set<string>()

  for (const result of scrapeResults) {
    if (result.status === "rejected") {
      console.error(`[scraper] Scrape rejected:`, result.reason)
      continue
    }
    const r = result.value

    if (r.isMock) {
      // Scrape failed — check if competitor has a manual price fallback
      const competitor = product.competitors.find(c => c.id === r.competitorId)
      if (competitor?.manualPrice != null) {
        console.log(`[scraper] Using manual price for ${r.url} — £${competitor.manualPrice}`)
        results.push({ competitorId: r.competitorId, price: competitor.manualPrice, inStock: true })
        successfulCompetitorIds.add(r.competitorId)
      } else {
        console.warn(`[scraper] Skipping mock price for ${r.url} — site is bot-blocked`)
        failedCompetitorIds.add(r.competitorId)
      }
      continue
    }

    let price = r.price
    if (r.currency !== product.currency) {
      try {
        price = await convertCurrency(r.price, r.currency, product.currency)
        console.log(`[scraper] FX ${r.currency}→${product.currency}: ${r.price} → ${price}`)
      } catch {
        price = r.price
      }
    }
    console.log(`[scraper] Accepted: ${r.url} — price=${price} inStock=${r.inStock}`)
    results.push({ competitorId: r.competitorId, price, inStock: r.inStock })
    successfulCompetitorIds.add(r.competitorId)
  }

  // Update scrapeFailCount: reset on success, increment on failure
  const failCountUpdates = [
    ...Array.from(successfulCompetitorIds).map(id =>
      prisma.competitor.update({ where: { id }, data: { scrapeFailCount: 0 } })
    ),
    ...Array.from(failedCompetitorIds).map(id =>
      prisma.competitor.update({ where: { id }, data: { scrapeFailCount: { increment: 1 } } })
    ),
  ]
  if (failCountUpdates.length > 0) {
    await Promise.allSettled(failCountUpdates)
  }

  console.log(`[scraper] ${results.length} succeeded, ${scrapeResults.length - results.length} failed`)

  if (results.length === 0) {
    return { scraped: 0, failed: scrapeResults.length, recommendation: null }
  }

  const prices = results.map((r) => r.price)
  const priceMean = prices.reduce((a, b) => a + b, 0) / prices.length
  const priceStddev = stddev(prices)

  const competitorMap = new Map(product.competitors.map((c) => [c.id, c]))

  // Recent price history per competitor, for the sanity check below.
  const historyByCompetitor = new Map<string, number[]>()
  await Promise.all(
    results.map(async (r) => {
      const prev = await prisma.priceSnapshot.findMany({
        where: { competitorId: r.competitorId, isOutlier: false },
        orderBy: { scrapedAt: "desc" },
        take: 5,
        select: { price: true },
      })
      historyByCompetitor.set(r.competitorId, prev.map((p) => p.price))
    })
  )

  const snapshotData = results.map((r) => {
    const competitor = competitorMap.get(r.competitorId)
    const servings = competitor?.servings ?? product.servingsPerPack
    const isPowder = product.productType === "powder"
    const gramsPerServing = product.gramsPerServing ?? 10
    const packKg = isPowder ? (servings * gramsPerServing) / 1000 : null

    const history = historyByCompetitor.get(r.competitorId) ?? []
    const label = competitor?.name ?? r.competitorId
    const breaksHistory = failsHistoricalSanity(r.price, history)
    const breaksCost = failsCostPlausibility(r.price, product.costPrice)
    const insane = breaksHistory || breaksCost
    if (breaksHistory) {
      console.warn(
        `[scraper] Price ${r.price} for ${label} is far outside its recent range ` +
        `(median ${median(history)}) — storing as outlier, excluded from pricing.`
      )
    }
    if (breaksCost) {
      console.warn(
        `[scraper] Price ${r.price} for ${label} is far below our unit cost ` +
        `(${product.costPrice}) — almost certainly a bad parse. Storing as outlier.`
      )
    }

    return {
      price: r.price,
      currency: product.currency,
      pricePerServing: parseFloat((r.price / servings).toFixed(4)),
      pricePer30Days: parseFloat((r.price * (30 / servings)).toFixed(2)),
      pricePerKg: packKg ? parseFloat((r.price / packKg).toFixed(2)) : null,
      inStock: r.inStock,
      isOutlier: insane || detectOutlier(r.price, priceMean, priceStddev),
      scrapedAt: runAt,
      productId: product.id,
      competitorId: r.competitorId,
    }
  })

  await prisma.priceSnapshot.createMany({ data: snapshotData })

  const pricing = calculatePricing({
    snapshots: snapshotData.map((s) => ({
      pricePerServing: s.pricePerServing,
      pricePerKg: s.pricePerKg,
      inStock: s.inStock,
      isOutlier: s.isOutlier,
    })),
    costPrice: product.costPrice,
    servingsPerPack: product.servingsPerPack,
    positionRule: product.positionRule,
    adjustment: product.adjustment,
    productType: product.productType,
    gramsPerServing: product.gramsPerServing,
  })

  const usableCount = snapshotData.filter((s) => s.inStock && !s.isOutlier).length

  let recommendation = null
  if (pricing && usableCount < MIN_SAMPLES_FOR_RECOMMENDATION) {
    // Keep the previous recommendation rather than overwriting it from a single
    // data point — one bad scrape should not redefine the market average.
    console.warn(
      `[scraper] Only ${usableCount} usable price(s) this cycle — keeping previous recommendation.`
    )
  } else if (pricing) {
    recommendation = await prisma.pricingRecommendation.create({
      data: { ...pricing, productId: product.id },
    })
  }

  try {
    await evaluateTriggers(productId)
  } catch (err) {
    console.error("[scraper] trigger evaluation failed:", err)
  }

  try {
    await sendCycleReport(productId, results.length)
  } catch (err) {
    console.error("[scraper] cycle report failed:", err)
  }

  return {
    scraped: results.length,
    failed: scrapeResults.length - results.length,
    recommendation,
  }
}
