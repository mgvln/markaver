import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { scrapeProduct } from "@/lib/scraper"

export async function POST(
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

  const result = await scrapeProduct(id)
  return NextResponse.json(result)
}
