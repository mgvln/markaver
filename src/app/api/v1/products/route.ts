import { prisma } from "@/lib/prisma"
import { verifyApiKey } from "@/lib/apiKeyAuth"
import { NextRequest, NextResponse } from "next/server"

const SYM: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export async function GET(req: NextRequest) {
  const orgId = await verifyApiKey(req)
  if (!orgId) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 })
  }

  const products = await prisma.product.findMany({
    where: { orgId },
    include: {
      _count: { select: { competitors: true } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(products.map((p) => {
    const rec = p.recommendations[0] ?? null
    const sym = SYM[p.currency] ?? "€"
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      productType: p.productType,
      currency: p.currency,
      currencySymbol: sym,
      costPrice: p.costPrice,
      servingsPerPack: p.servingsPerPack,
      competitorCount: p._count.competitors,
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
    }
  }))
}
