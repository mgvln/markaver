import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgUser = await prisma.orgUser.findUnique({
    where: { orgId_userId: { orgId: session.user.orgId, userId: session.user.id } },
  })
  if (orgUser?.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can export data" }, { status: 403 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    include: {
      users: {
        include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
      },
      products: {
        include: {
          competitors: {
            include: { snapshots: true },
          },
          recommendations: true,
          triggers: true,
          wholesaleTiers: true,
        },
      },
    },
  })

  const payload = {
    exportedAt: new Date().toISOString(),
    organisation: {
      id: org?.id,
      name: org?.name,
      slug: org?.slug,
      createdAt: org?.createdAt,
    },
    members: org?.users.map((ou) => ({
      email: ou.user.email,
      name: ou.user.name,
      role: ou.role,
      joinedAt: ou.createdAt,
    })),
    products: org?.products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      productType: p.productType,
      costPrice: p.costPrice,
      currency: p.currency,
      servingsPerPack: p.servingsPerPack,
      createdAt: p.createdAt,
      competitors: p.competitors.map((c) => ({
        id: c.id,
        name: c.name,
        url: c.url,
        type: c.type,
        priceHistory: c.snapshots.map((s) => ({
          price: s.price,
          currency: s.currency,
          inStock: s.inStock,
          scrapedAt: s.scrapedAt,
        })),
      })),
      pricingRecommendations: p.recommendations.map((r) => ({
        ampMean: r.ampMean,
        ampMedian: r.ampMedian,
        srp: r.srp,
        markupRatio: r.markupRatio,
        marginPct: r.marginPct,
        createdAt: r.createdAt,
      })),
      triggers: p.triggers.map((t) => ({
        name: t.name,
        condition: t.condition,
        threshold: t.threshold,
        action: t.action,
        isActive: t.isActive,
      })),
      wholesaleTiers: p.wholesaleTiers.map((w) => ({
        name: w.name,
        minQty: w.minQty,
        maxQty: w.maxQty,
        discount: w.discount,
      })),
    })),
  }

  const json = JSON.stringify(payload, null, 2)
  const slug = org?.slug ?? "org"

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="markaver-export-${slug}.json"`,
    },
  })
}
