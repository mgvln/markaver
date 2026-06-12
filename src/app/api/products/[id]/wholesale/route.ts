import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findFirst({ where: { id, orgId: session.user.orgId } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const tiers = await prisma.wholesaleTier.findMany({
    where: { productId: id },
    orderBy: { minQty: "asc" },
  })

  return NextResponse.json(tiers)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findFirst({ where: { id, orgId: session.user.orgId } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { name, minQty, maxQty, discount } = await request.json()

  if (!name || minQty == null || discount == null) {
    return NextResponse.json({ error: "name, minQty, and discount are required" }, { status: 400 })
  }

  const tier = await prisma.wholesaleTier.create({
    data: {
      name,
      minQty: parseInt(minQty),
      maxQty: maxQty != null ? parseInt(maxQty) : null,
      discount: parseFloat(discount),
      productId: id,
    },
  })

  return NextResponse.json(tier, { status: 201 })
}
