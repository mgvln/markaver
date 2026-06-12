import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgUser = await prisma.orgUser.findUnique({
    where: { orgId_userId: { orgId: session.user.orgId, userId: session.user.id } },
  })
  if (orgUser?.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can delete the organisation" }, { status: 403 })
  }

  const orgId = session.user.orgId

  // Delete in dependency order
  await prisma.$transaction([
    prisma.pricingRecommendation.deleteMany({
      where: { product: { orgId } },
    }),
    prisma.priceSnapshot.deleteMany({
      where: { product: { orgId } },
    }),
    prisma.wholesaleTier.deleteMany({
      where: { product: { orgId } },
    }),
    prisma.trigger.deleteMany({
      where: { product: { orgId } },
    }),
    prisma.competitor.deleteMany({
      where: { product: { orgId } },
    }),
    prisma.product.deleteMany({ where: { orgId } }),
    prisma.orgUser.deleteMany({ where: { orgId } }),
    prisma.organization.delete({ where: { id: orgId } }),
  ])

  return NextResponse.json({ ok: true })
}
