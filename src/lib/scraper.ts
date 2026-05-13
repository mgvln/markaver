import { prisma } from "@/lib/prisma"
import { scrapeUrl } from "@/lib/apify"
import { convertCurrency } from "@/lib/fx"
import { calculatePricing } from "@/lib/pricing"
import { evaluateTriggers } from "@/lib/triggers"

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

  // Scrape each competitor
  const scrapeResults = await Promise.allSettled(
    product.competitors.map((c) => scrapeUrl(c.url).then((r) => ({ ...r, competitorId: c.id })))
  )

  // Convert currencies to product base currency
  for (const result of scrapeResults) {
    if (result.status === "rejected") continue
    const r = result.value
    let price = r.price
    if (r.currency !== product.currency) {
      try {
        price = await convertCurrency(r.price, r.currency, product.currency)
      } catch {
        price = r.price
      }
    }
    results.push({ competitorId: r.competitorId, price, inStock: r.inStock })
  }

  if (results.length === 0) {
    return { scraped: 0, failed: scrapeResults.length, recommendation: null }
  }

  // Detect outliers (±2σ from mean)
  const prices = results.map((r) => r.price)
  const priceMean = prices.reduce((a, b) => a + b, 0) / prices.length
  const priceStddev = stddev(prices)

  // Save PriceSnapshots
  const snapshotData = results.map((r) => ({
    price: r.price,
    currency: product.currency,
    pricePerServing: parseFloat((r.price / product.servingsPerPack).toFixed(4)),
    pricePer30Days: parseFloat((r.price * (30 / product.servingsPerPack)).toFixed(2)),
    inStock: r.inStock,
    isOutlier: detectOutlier(r.price, priceMean, priceStddev),
    productId: product.id,
    competitorId: r.competitorId,
  }))

  await prisma.priceSnapshot.createMany({ data: snapshotData })

  // Calculate AMP & SRP
  const pricing = calculatePricing({
    snapshots: snapshotData.map((s) => ({
      pricePerServing: s.pricePerServing,
      inStock: s.inStock,
      isOutlier: s.isOutlier,
    })),
    costPrice: product.costPrice,
    servingsPerPack: product.servingsPerPack,
    positionRule: product.positionRule,
    adjustment: product.adjustment,
  })

  let recommendation = null
  if (pricing) {
    recommendation = await prisma.pricingRecommendation.create({
      data: { ...pricing, productId: product.id },
    })
  }

  // Evaluate triggers after every scrape cycle
  try {
    await evaluateTriggers(productId)
  } catch (err) {
    console.error("[scraper] trigger evaluation failed:", err)
  }

  return {
    scraped: results.length,
    failed: scrapeResults.length - results.length,
    recommendation,
  }
}
