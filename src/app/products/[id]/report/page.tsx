import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"

const SYM: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) redirect("/setup")

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
  if (!product) notFound()

  const sym = SYM[product.currency] ?? "€"
  const rec = product.recommendations[0] ?? null
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  const tierLabel = rec
    ? rec.markupRatio >= product.minMarkup * 1.5 ? "Premium"
    : rec.markupRatio >= product.minMarkup ? "Mid"
    : "Budget"
    : null

  return (
    <html lang="en">
      <head>
        <title>{product.name} — Markaver Report</title>
        <style>{`
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
          .print-btn { position: fixed; top: 20px; right: 20px; background: #00343A; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
          @media print {
            .print-btn { display: none; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <button className="print-btn" onClick={() => (typeof window !== "undefined" && window.print())}>
          Print / Save PDF
        </button>
        <div className="page">
          <div className="header">
            <div className="brand">Mark<span>aver</span></div>
            <div className="meta">
              <div>Pricing Intelligence Report</div>
              <div>{today}</div>
            </div>
          </div>

          <h1>{product.name}</h1>
          <p className="subtitle">
            {product.sku && `${product.sku} · `}
            {product.productType === "capsule" ? "Capsule" : "Powder"} ·{" "}
            {product.servingsPerPack} servings · {product.currency}
          </p>

          {rec && (
            <>
              <p className="section-title">Pricing Recommendation</p>
              <div className="grid4">
                <div className="card srp-card">
                  <div className="card-label">Rec. SRP</div>
                  <div className="card-value">{sym}{rec.srp.toFixed(2)}</div>
                  <div className="card-sub">{sym}{rec.srpPerServing.toFixed(2)} / serving</div>
                </div>
                <div className="card">
                  <div className="card-label">AMP (trimmed)</div>
                  <div className="card-value">{sym}{rec.ampTrimmed.toFixed(2)}</div>
                  <div className="card-sub">Market average</div>
                </div>
                <div className="card">
                  <div className="card-label">Markup</div>
                  <div className="card-value">{rec.markupRatio.toFixed(2)}×</div>
                  <div className="card-sub">Min {product.minMarkup.toFixed(1)}×</div>
                </div>
                <div className="card">
                  <div className="card-label">Gross Margin</div>
                  <div className="card-value">{rec.marginPct.toFixed(1)}%</div>
                  <div className="card-sub">
                    <span className={`badge ${tierLabel === "Premium" ? "badge-purple" : tierLabel === "Mid" ? "badge-blue" : "badge-gray"}`}>
                      {tierLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid2" style={{ marginTop: 12 }}>
                <div className="card">
                  <div className="card-label">Cost Price</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#00343A" }}>{sym}{product.costPrice.toFixed(2)}</div>
                </div>
                <div className="card">
                  <div className="card-label">Position Rule</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                    +{product.adjustment}% above {product.positionRule}
                  </div>
                </div>
              </div>
            </>
          )}

          <p className="section-title">Competitor Prices ({product.competitors.length})</p>
          <table>
            <thead>
              <tr>
                <th>Competitor</th>
                <th>URL</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "center" }}>Stock</th>
                <th>Last scraped</th>
              </tr>
            </thead>
            <tbody>
              {product.competitors.map((c) => {
                const snap = c.snapshots[0] ?? null
                const price = snap?.price ?? c.manualPrice
                return (
                  <tr key={c.id} className={snap?.isOutlier ? "outlier" : ""}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td className="url">{c.url}</td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      {price != null ? `${sym}${price.toFixed(2)}` : "—"}
                      {c.manualPrice && !snap ? " *" : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {snap ? (
                        <span className={`badge ${snap.inStock ? "badge-green" : "badge-red"}`}>
                          {snap.inStock ? "In" : "Out"}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: 11, color: "#9ca3af" }}>
                      {snap ? snap.scrapedAt.toLocaleDateString("en-GB") : "manual"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {product.competitors.some((c) => c.manualPrice && !c.snapshots[0]) && (
            <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}>* Manual price entry</p>
          )}

          <div className="footer">
            <span>Generated by Markaver · markaver.com</span>
            <span>{today}</span>
          </div>
        </div>
      </body>
    </html>
  )
}
