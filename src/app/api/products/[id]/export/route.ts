import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"

const SYM: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findFirst({
    where: { id, orgId: session.user.orgId },
    include: {
      competitors: {
        include: { snapshots: { orderBy: { scrapedAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const priceHistory = await prisma.priceSnapshot.findMany({
    where: { productId: id },
    include: { competitor: { select: { name: true } } },
    orderBy: { scrapedAt: "desc" },
    take: 500,
  })

  const sym = SYM[product.currency] ?? "€"
  const rec = product.recommendations[0] ?? null

  const wb = new ExcelJS.Workbook()
  wb.creator = "Markaver"
  wb.created = new Date()

  // ── Header style helpers ──
  const hdr = (bold = true): Partial<ExcelJS.Style> => ({
    font: { bold, color: { argb: "FF00343A" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FAF5" } },
    border: { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } },
  })

  // ── Sheet 1: Summary ──
  const s1 = wb.addWorksheet("Summary")
  s1.columns = [{ width: 28 }, { width: 32 }]

  const addRow = (label: string, value: string | number, bold = false) => {
    const row = s1.addRow([label, value])
    row.getCell(1).font = { bold: true, color: { argb: "FF6B7280" } }
    row.getCell(2).font = { bold, color: { argb: "FF111827" } }
  }

  s1.addRow(["Markaver — Product Report"]).getCell(1).font = { bold: true, size: 14, color: { argb: "FF00343A" } }
  s1.addRow([`Generated: ${new Date().toLocaleDateString("en-GB")}`]).getCell(1).font = { color: { argb: "FF9CA3AF" } }
  s1.addRow([])

  addRow("Product", product.name, true)
  addRow("SKU", product.sku ?? "—")
  addRow("Type", product.productType === "capsule" ? "Capsule" : "Powder")
  addRow("Currency", product.currency)
  addRow("Cost Price", `${sym}${product.costPrice.toFixed(2)}`)
  addRow("Servings per Pack", product.servingsPerPack)
  addRow("Min Markup", `${product.minMarkup.toFixed(1)}×`)
  addRow("Position Rule", `+${product.adjustment}% above ${product.positionRule}`)
  addRow("Scrape Interval", product.scrapeInterval)
  s1.addRow([])

  if (rec) {
    s1.addRow(["Pricing Recommendation"]).getCell(1).font = { bold: true, size: 12, color: { argb: "FF00343A" } }
    addRow("AMP (trimmed mean)", `${sym}${rec.ampTrimmed.toFixed(2)}`, true)
    addRow("AMP (mean)", `${sym}${rec.ampMean.toFixed(2)}`)
    addRow("AMP (median)", `${sym}${rec.ampMedian.toFixed(2)}`)
    addRow("Recommended SRP", `${sym}${rec.srp.toFixed(2)}`, true)
    addRow("SRP per Serving", `${sym}${rec.srpPerServing.toFixed(2)}`)
    addRow("Markup Ratio", `${rec.markupRatio.toFixed(2)}×`)
    addRow("Gross Margin", `${rec.marginPct.toFixed(1)}%`)
  }

  // ── Sheet 2: Competitors ──
  const s2 = wb.addWorksheet("Competitors")
  s2.columns = [
    { header: "Name", key: "name", width: 30 },
    { header: "URL", key: "url", width: 55 },
    { header: "Type", key: "type", width: 12 },
    { header: `Latest Price (${sym})`, key: "price", width: 18 },
    { header: "In Stock", key: "inStock", width: 12 },
    { header: "Outlier", key: "outlier", width: 10 },
    { header: "Last Scraped", key: "scraped", width: 20 },
  ]
  s2.getRow(1).eachCell((cell) => Object.assign(cell, hdr()))

  for (const c of product.competitors) {
    const snap = c.snapshots[0] ?? null
    const price = snap?.price ?? c.manualPrice
    s2.addRow({
      name: c.name,
      url: c.url,
      type: c.type,
      price: price != null ? parseFloat(price.toFixed(2)) : "—",
      inStock: snap ? (snap.inStock ? "Yes" : "No") : "—",
      outlier: snap?.isOutlier ? "Yes" : "No",
      scraped: snap ? snap.scrapedAt.toLocaleDateString("en-GB") : "—",
    })
  }

  // ── Sheet 3: Price History ──
  const s3 = wb.addWorksheet("Price History")
  s3.columns = [
    { header: "Competitor", key: "name", width: 30 },
    { header: `Price (${sym})`, key: "price", width: 14 },
    { header: "In Stock", key: "inStock", width: 12 },
    { header: "Outlier", key: "outlier", width: 10 },
    { header: "Scraped At", key: "scraped", width: 22 },
  ]
  s3.getRow(1).eachCell((cell) => Object.assign(cell, hdr()))

  for (const snap of priceHistory) {
    s3.addRow({
      name: snap.competitor.name,
      price: parseFloat(snap.price.toFixed(2)),
      inStock: snap.inStock ? "Yes" : "No",
      outlier: snap.isOutlier ? "Yes" : "No",
      scraped: snap.scrapedAt.toISOString().replace("T", " ").slice(0, 16),
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const slug = product.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="markaver-${slug}.xlsx"`,
    },
  })
}
