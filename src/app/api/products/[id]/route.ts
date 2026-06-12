import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const product = await prisma.product.findFirst({
    where: { id, orgId: session.user.orgId },
    include: {
      competitors: {
        include: {
          snapshots: { orderBy: { scrapedAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "asc" },
      },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const product = await prisma.product.findFirst({
    where: { id, orgId: session.user.orgId },
  })
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const {
    name, sku, productType, costPrice, minMarkup, servingsPerPack,
    capsulesPerServing, capsuleSizeGrams, gramsPerServing,
    scrapeInterval, positionRule, adjustment, currency,
  } = body

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(sku !== undefined && { sku: sku || null }),
      ...(productType !== undefined && { productType }),
      ...(costPrice !== undefined && { costPrice: parseFloat(costPrice) }),
      ...(minMarkup !== undefined && { minMarkup: parseFloat(minMarkup) }),
      ...(servingsPerPack !== undefined && { servingsPerPack: parseInt(servingsPerPack) }),
      ...(capsulesPerServing !== undefined && { capsulesPerServing: parseInt(capsulesPerServing) }),
      ...(capsuleSizeGrams !== undefined && { capsuleSizeGrams: capsuleSizeGrams ? parseFloat(capsuleSizeGrams) : null }),
      ...(gramsPerServing !== undefined && { gramsPerServing: gramsPerServing ? parseFloat(gramsPerServing) : null }),
      ...(scrapeInterval !== undefined && { scrapeInterval }),
      ...(positionRule !== undefined && { positionRule }),
      ...(adjustment !== undefined && { adjustment: parseFloat(adjustment) }),
      ...(currency !== undefined && { currency }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const product = await prisma.product.findFirst({
    where: { id, orgId: session.user.orgId },
  })
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // No cascade on snapshots/competitors/recommendations in schema — delete in order
  await prisma.priceSnapshot.deleteMany({ where: { productId: id } })
  await prisma.competitor.deleteMany({ where: { productId: id } })
  await prisma.pricingRecommendation.deleteMany({ where: { productId: id } })
  await prisma.product.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
