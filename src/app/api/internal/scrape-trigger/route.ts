import { NextResponse } from "next/server"
import { scrapeProduct } from "@/lib/scraper"

// Allow up to 10 minutes — scrapes involve multiple Apify actors each with 300s waitSecs
export const maxDuration = 600

export async function POST(request: Request) {
  if (request.headers.get("x-internal-secret") !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { productId } = await request.json()
  const result = await scrapeProduct(productId)
  return NextResponse.json(result)
}
