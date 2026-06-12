import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { scrapeProduct } from "@/lib/scraper"

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

  // Run scrape in background so the proxy timeout doesn't kill the request.
  // Apify runs take 2-3 min per URL which exceeds Apache's 60s proxy timeout.
  const ctx = (request as unknown as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil
  if (ctx) {
    ctx(scrapeProduct(id).catch(console.error))
  } else {
    scrapeProduct(id).catch(console.error)
  }

  return NextResponse.json({ status: "started" }, { status: 202 })
}
