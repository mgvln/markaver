import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const products = await prisma.product.findMany({
    where: { orgId: session.user.orgId },
    include: {
      _count: { select: { competitors: true } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    name, sku, costPrice, minMarkup, servingsPerPack,
    scrapeInterval, positionRule, adjustment, currency,
  } = body

  if (!name || costPrice == null) {
    return NextResponse.json({ error: "Name and cost price are required" }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku: sku || null,
      costPrice: parseFloat(costPrice),
      minMarkup: parseFloat(minMarkup ?? 4.0),
      servingsPerPack: parseInt(servingsPerPack ?? 30),
      scrapeInterval: scrapeInterval ?? "weekly",
      positionRule: positionRule ?? "mean",
      adjustment: parseFloat(adjustment ?? 20),
      currency: currency ?? "EUR",
      orgId: session.user.orgId,
    },
  })

  return NextResponse.json(product, { status: 201 })
}
