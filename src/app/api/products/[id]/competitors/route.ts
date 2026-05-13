import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
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

  const { name, url, source, type } = await request.json()
  if (!name || !url) {
    return NextResponse.json({ error: "Name and URL are required" }, { status: 400 })
  }

  const competitor = await prisma.competitor.create({
    data: {
      name,
      url,
      source: source ?? null,
      type: type ?? "direct",
      productId: id,
    },
  })

  return NextResponse.json(competitor, { status: 201 })
}
