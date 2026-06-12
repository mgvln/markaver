import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

export type WooProduct = {
  id: number
  name: string
  sku: string
  price: string
  regular_price: string
  stock_status: string
  type: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { storeUrl, consumerKey, consumerSecret } = await req.json()

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return NextResponse.json({ error: "Store URL, consumer key and secret are required" }, { status: 400 })
  }

  // Normalise URL
  const base = storeUrl.replace(/\/+$/, "")
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")
  const headers = { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" }

  // Fetch up to 3 pages (300 products)
  const products: WooProduct[] = []
  for (let page = 1; page <= 3; page++) {
    const url = `${base}/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`
    let res: Response
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    } catch (e) {
      return NextResponse.json({
        error: `Could not reach store. Check the URL and make sure WooCommerce REST API is enabled. (${(e as Error).message})`,
      }, { status: 502 })
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: "Invalid consumer key or secret." }, { status: 401 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `WooCommerce returned ${res.status}. Check the store URL.` }, { status: 502 })
    }

    const page_products: WooProduct[] = await res.json()
    if (!Array.isArray(page_products)) {
      return NextResponse.json({ error: "Unexpected response from WooCommerce. Is the REST API enabled?" }, { status: 502 })
    }
    products.push(...page_products)
    if (page_products.length < 100) break // no more pages
  }

  const result = products
    .filter((p) => p.type === "simple" || p.type === "variable")
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || "",
      price: p.regular_price || p.price || "",
      inStock: p.stock_status === "instock",
    }))

  return NextResponse.json({ products: result, total: result.length })
}
