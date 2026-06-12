import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; tierId: string }> }
) {
  const { id, tierId } = await params
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findFirst({ where: { id, orgId: session.user.orgId } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { name, minQty, maxQty, discount } = await request.json()

  const tier = await prisma.wholesaleTier.update({
    where: { id: tierId },
    data: {
      name,
      minQty: parseInt(minQty),
      maxQty: maxQty != null ? parseInt(maxQty) : null,
      discount: parseFloat(discount),
    },
  })

  return NextResponse.json(tier)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tierId: string }> }
) {
  const { id, tierId } = await params
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findFirst({ where: { id, orgId: session.user.orgId } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.wholesaleTier.delete({ where: { id: tierId } })

  return new NextResponse(null, { status: 204 })
}
