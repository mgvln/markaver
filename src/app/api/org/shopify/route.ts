import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

type ShopifyProduct = {
  id: number
  title: string
  variants: Array<{
    id: number
    sku: string
    price: string
    inventory_quantity: number
  }>
  product_type: string
  status: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { storeUrl, accessToken } = await req.json()

  if (!storeUrl || !accessToken) {
    return NextResponse.json({ error: "Store URL and access token are required" }, { status: 400 })
  }

  // Normalise: accept mystore.myshopify.com or https://mystore.myshopify.com
  let domain = storeUrl.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "")
  // If they pasted a full store URL like mystore.myshopify.com/collections/all, strip the path
  domain = domain.split("/")[0]

  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  }

  // Shopify cursor-based pagination — fetch up to 300 products (3 pages of 100)
  const products: ShopifyProduct[] = []
  let url: string | null = `https://${domain}/admin/api/2024-01/products.json?limit=100&status=active&fields=id,title,variants,product_type,status`

  for (let page = 0; page < 3 && url; page++) {
    let res: Response
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    } catch (e) {
      return NextResponse.json({
        error: `Could not reach store. Check the URL and make sure the app has read_products access. (${(e as Error).message})`,
      }, { status: 502 })
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: "Invalid access token or insufficient permissions. Make sure the app has read_products scope." }, { status: 401 })
    }
    if (res.status === 404) {
      return NextResponse.json({ error: "Store not found. Check that the URL is correct (e.g. mystore.myshopify.com)." }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Shopify returned ${res.status}. Check the store URL and token.` }, { status: 502 })
    }

    const data = await res.json()
    if (!data?.products || !Array.isArray(data.products)) {
      return NextResponse.json({ error: "Unexpected response from Shopify. Is this a valid Shopify store?" }, { status: 502 })
    }

    products.push(...data.products)

    // Parse Link header for next page cursor
    const link = res.headers.get("Link") ?? ""
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/)
    url = nextMatch ? nextMatch[1] : null
  }

  // Flatten: one row per variant for variable products, single row for single-variant
  const result = products
    .filter((p) => p.status === "active")
    .flatMap((p) => {
      const variants = p.variants ?? []
      if (variants.length === 1) {
        return [{
          id: `${p.id}`,
          name: p.title,
          sku: variants[0].sku || "",
          price: variants[0].price || "",
          inStock: (variants[0].inventory_quantity ?? 0) > 0,
        }]
      }
      return variants.map((v) => ({
        id: `${p.id}-${v.id}`,
        name: variants.length > 1 ? `${p.title} — ${v.sku || v.id}` : p.title,
        sku: v.sku || "",
        price: v.price || "",
        inStock: (v.inventory_quantity ?? 0) > 0,
      }))
    })

  return NextResponse.json({ products: result, total: result.length })
}
