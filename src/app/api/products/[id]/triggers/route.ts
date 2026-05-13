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

  const triggers = await prisma.trigger.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(triggers)
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

  const { name, condition, threshold, action, actionConfig } = await request.json()
  if (!name || !condition || !action) {
    return NextResponse.json({ error: "name, condition and action are required" }, { status: 400 })
  }

  const trigger = await prisma.trigger.create({
    data: {
      name,
      condition,
      threshold: threshold ? parseFloat(threshold) : null,
      action,
      actionConfig: actionConfig ?? {},
      productId: id,
    },
  })

  return NextResponse.json(trigger, { status: 201 })
}
