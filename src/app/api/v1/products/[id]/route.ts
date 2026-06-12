import { prisma } from "@/lib/prisma"
import { verifyApiKey } from "@/lib/apiKeyAuth"
import { NextRequest, NextResponse } from "next/server"

const SYM: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await verifyApiKey(req)
  if (!orgId) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 })
  }

  const { id } = await params
  const product = await prisma.product.findFirst({
    where: { id, orgId },
    include: {
      competitors: {
        include: { snapshots: { orderBy: { scrapedAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rec = product.recommendations[0] ?? null
  const sym = SYM[product.currency] ?? "€"

  return NextResponse.json({
    id: product.id,
    name: product.name,
    sku: product.sku,
    productType: product.productType,
    currency: product.currency,
    currencySymbol: sym,
    costPrice: product.costPrice,
    servingsPerPack: product.servingsPerPack,
    scrapeInterval: product.scrapeInterval,
    competitors: product.competitors.map((c) => {
      const snap = c.snapshots[0] ?? null
      return {
        id: c.id,
        name: c.name,
        url: c.url,
        type: c.type,
        latestPrice: snap?.price ?? c.manualPrice ?? null,
        inStock: snap?.inStock ?? null,
        isOutlier: snap?.isOutlier ?? false,
        scrapedAt: snap?.scrapedAt ?? null,
      }
    }),
    recommendation: rec ? {
      ampMean: rec.ampMean,
      ampMedian: rec.ampMedian,
      ampTrimmed: rec.ampTrimmed,
      srp: rec.srp,
      srpPerServing: rec.srpPerServing,
      markupRatio: rec.markupRatio,
      marginPct: rec.marginPct,
      updatedAt: rec.createdAt,
    } : null,
  })
}
