import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const SYM: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) {
    return new Response(null, { status: 302, headers: { Location: "/login" } })
  }

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
  if (!product) return new Response("Not found", { status: 404 })

  const sym = SYM[product.currency] ?? "€"
  const rec = product.recommendations[0] ?? null
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  const tierLabel = rec
    ? rec.markupRatio >= product.minMarkup * 1.5 ? "Premium"
    : rec.markupRatio >= product.minMarkup ? "Mid"
    : "Budget"
    : null

  const rows = product.competitors.map((c) => {
    const snap = c.snapshots[0] ?? null
    const price = snap?.price ?? c.manualPrice
    const priceStr = price != null ? `${sym}${Number(price).toFixed(2)}${c.manualPrice && !snap ? " *" : ""}` : "—"
    const stockBadge = snap
      ? snap.inStock
        ? `<span class="badge badge-green">In</span>`
        : `<span class="badge badge-red">Out</span>`
      : "—"
    const scrapedAt = snap ? new Date(snap.scrapedAt).toLocaleDateString("en-GB") : "manual"
    return `<tr class="${snap?.isOutlier ? "outlier" : ""}">
      <td style="font-weight:500">${c.name}</td>
      <td class="url">${c.url}</td>
      <td style="text-align:right;font-family:monospace">${priceStr}</td>
      <td style="text-align:center">${stockBadge}</td>
      <td style="font-size:11px;color:#9ca3af">${scrapedAt}</td>
    </tr>`
  }).join("")

  const recHtml = rec ? `
    <p class="section-title">Pricing Recommendation</p>
    <div class="grid4">
      <div class="card srp-card">
        <div class="card-label">Rec. SRP</div>
        <div class="card-value">${sym}${rec.srp.toFixed(2)}</div>
        <div class="card-sub">${sym}${rec.srpPerServing.toFixed(2)} / serving</div>
      </div>
      <div class="card">
        <div class="card-label">AMP (trimmed)</div>
        <div class="card-value">${sym}${rec.ampTrimmed.toFixed(2)}</div>
        <div class="card-sub">Market average</div>
      </div>
      <div class="card">
        <div class="card-label">Markup</div>
        <div class="card-value">${rec.markupRatio.toFixed(2)}×</div>
        <div class="card-sub">Min ${product.minMarkup.toFixed(1)}×</div>
      </div>
      <div class="card">
        <div class="card-label">Gross Margin</div>
        <div class="card-value">${rec.marginPct.toFixed(1)}%</div>
        <div class="card-sub">
          <span class="badge ${tierLabel === "Premium" ? "badge-purple" : tierLabel === "Mid" ? "badge-blue" : "badge-gray"}">${tierLabel}</span>
        </div>
      </div>
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="card">
        <div class="card-label">Cost Price</div>
        <div style="font-size:16px;font-weight:700;color:#00343A">${sym}${product.costPrice.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-label">Position Rule</div>
        <div style="font-size:14px;font-weight:600;color:#374151">+${product.adjustment}% above ${product.positionRule}</div>
      </div>
    </div>` : ""

  const hasManual = product.competitors.some((c) => c.manualPrice && !c.snapshots[0])

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.name} — Markaver Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 40px 60px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #00343A; padding-bottom: 20px; margin-bottom: 28px; }
    .brand { color: #00343A; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .brand span { color: #33A579; }
    .meta { text-align: right; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    h1 { font-size: 24px; font-weight: 700; color: #00343A; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 32px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 10px; margin-top: 28px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
    .card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin-bottom: 4px; }
    .card-value { font-size: 22px; font-weight: 700; color: #00343A; font-variant-numeric: tabular-nums; }
    .card-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .srp-card { background: #f0faf5; border-color: #6ee7b7; }
    .srp-card .card-value { color: #047857; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 8px 10px; background: #f9faf8; border-bottom: 1px solid #e5e7eb; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:last-child td { border-bottom: none; }
    .url { font-size: 10px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-purple { background: #ede9fe; color: #5b21b6; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .outlier { opacity: 0.4; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    .btn-pdf { position: fixed; top: 20px; right: 20px; background: #00343A; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; z-index: 100; }
    .btn-pdf:hover { background: #004f58; }
    @media print {
      .btn-pdf { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <button id="btn-pdf" class="btn-pdf">Save PDF</button>
  <div class="page">
    <div class="header">
      <div class="brand">Mark<span>aver</span></div>
      <div class="meta">
        <div>Pricing Intelligence Report</div>
        <div>${today}</div>
      </div>
    </div>

    <h1>${product.name}</h1>
    <p class="subtitle">${product.sku ? `${product.sku} · ` : ""}${product.productType === "capsule" ? "Capsule" : "Powder"} · ${product.servingsPerPack} servings · ${product.currency}</p>

    ${recHtml}

    <p class="section-title">Competitor Prices (${product.competitors.length})</p>
    <table>
      <thead>
        <tr>
          <th>Competitor</th>
          <th>URL</th>
          <th style="text-align:right">Price</th>
          <th style="text-align:center">Stock</th>
          <th>Last scraped</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${hasManual ? `<p style="font-size:10px;color:#9ca3af;margin-top:6px">* Manual price entry</p>` : ""}

    <div class="footer">
      <span>Generated by Markaver · markaver.com</span>
      <span>${today}</span>
    </div>
  </div>
  <script>
    document.getElementById('btn-pdf').addEventListener('click', function() {
      var orig = document.title;
      document.title = '${product.name.replace(/'/g, "\\'")} — Markaver Report';
      window.print();
      setTimeout(function() { document.title = orig; }, 1000);
    });
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
