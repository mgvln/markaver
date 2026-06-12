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

  const snapshotData = results.map((r) => {
    const competitor = competitorMap.get(r.competitorId)
    const servings = competitor?.servings ?? product.servingsPerPack
    const isPowder = product.productType === "powder"
    const gramsPerServing = product.gramsPerServing ?? 10
    const packKg = isPowder ? (servings * gramsPerServing) / 1000 : null

    return {
      price: r.price,
      currency: product.currency,
      pricePerServing: parseFloat((r.price / servings).toFixed(4)),
      pricePer30Days: parseFloat((r.price * (30 / servings)).toFixed(2)),
      pricePerKg: packKg ? parseFloat((r.price / packKg).toFixed(2)) : null,
      inStock: r.inStock,
      isOutlier: detectOutlier(r.price, priceMean, priceStddev),
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

  let recommendation = null
  if (pricing) {
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
