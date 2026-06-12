import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

async function verifyProduct(id: string, orgId: string) {
  return prisma.product.findFirst({ where: { id, orgId } })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; competitorId: string }> }
) {
  const { id, competitorId } = await params
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!await verifyProduct(id, session.user.orgId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { name, url, source, type, servings, claim, ingredients, manualPrice } = body

  const updated = await prisma.competitor.update({
    where: { id: competitorId, productId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(source !== undefined && { source }),
      ...(type !== undefined && { type }),
      ...(servings !== undefined && { servings: servings ? parseInt(servings) : null }),
      ...(claim !== undefined && { claim: claim || null }),
      ...(ingredients !== undefined && { ingredients: ingredients || null }),
      ...(manualPrice !== undefined && { manualPrice: manualPrice !== null ? parseFloat(manualPrice) : null }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; competitorId: string }> }
) {
  const { id, competitorId } = await params
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!await verifyProduct(id, session.user.orgId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.priceSnapshot.deleteMany({ where: { competitorId } }),
    prisma.competitor.delete({ where: { id: competitorId, productId: id } }),
  ])

  return NextResponse.json({ ok: true })
}
