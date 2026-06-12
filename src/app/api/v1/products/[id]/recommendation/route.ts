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
    select: { id: true, name: true, currency: true, costPrice: true },
  })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rec = await prisma.pricingRecommendation.findFirst({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
  })
  if (!rec) return NextResponse.json({ error: "No recommendation yet" }, { status: 404 })

  const sym = SYM[product.currency] ?? "€"

  return NextResponse.json({
    productId: product.id,
    productName: product.name,
    currency: product.currency,
    currencySymbol: sym,
    costPrice: product.costPrice,
    ampMean: rec.ampMean,
    ampMedian: rec.ampMedian,
    ampTrimmed: rec.ampTrimmed,
    srp: rec.srp,
    srpPerServing: rec.srpPerServing,
    markupRatio: rec.markupRatio,
    marginPct: rec.marginPct,
    updatedAt: rec.createdAt,
  })
}
