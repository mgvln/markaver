import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import AddCompetitorModal from "./AddCompetitorModal"
import RunNowButton from "./RunNowButton"
import ProductTabs from "./ProductTabs"
import type { CompetitorRow, RecData } from "./ProductTabs"
import type { PricePoint, AmpPoint } from "./TrendsTab"
import type { TriggerRow } from "./TriggersTab"

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const product = await prisma.product.findFirst({
    where: { id, orgId: session.user.orgId },
    include: {
      competitors: {
        include: {
          snapshots: { orderBy: { scrapedAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "asc" },
      },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!product) notFound()

  // Fetch price history for Trends chart (last 30 snapshots per competitor)
  const priceHistory = await prisma.priceSnapshot.findMany({
    where: { productId: id },
    orderBy: { scrapedAt: "asc" },
    include: { competitor: { select: { name: true } } },
  })

  // Fetch recommendation history for AMP/SRP trend chart
  const recHistory = await prisma.pricingRecommendation.findMany({
    where: { productId: id },
    orderBy: { createdAt: "asc" },
  })

  // Fetch triggers
  const triggersRaw = await prisma.trigger.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
  })

  const sym = CURRENCY_SYMBOL[product.currency] ?? "€"
  const rec = product.recommendations[0] ?? null

  // Build CompetitorRow[]
  const competitorRows: CompetitorRow[] = product.competitors.map((c) => {
    const snap = c.snapshots[0] ?? null
    return {
      id: c.id,
      name: c.name,
      url: c.url,
      source: c.source,
      type: c.type,
      snap: snap
        ? {
            price: snap.price,
            pricePerServing: snap.pricePerServing,
            pricePer30Days: snap.pricePer30Days,
            inStock: snap.inStock,
            isOutlier: snap.isOutlier,
          }
        : null,
    }
  })

  // Build RecData
  const recData: RecData = rec
    ? {
        ampMean: rec.ampMean,
        ampMedian: rec.ampMedian,
        ampTrimmed: rec.ampTrimmed,
        srp: rec.srp,
        srpPerServing: rec.srpPerServing,
        markupRatio: rec.markupRatio,
      }
    : null

  // Build PricePoint[] — group by exact scrape timestamp so each run is a distinct point
  const competitorNames = [...new Set(priceHistory.map((s) => s.competitor.name))]
  const priceByTs = new Map<string, PricePoint>()
  for (const snap of priceHistory) {
    const ts = snap.scrapedAt.toISOString()
    const label = ts.slice(0, 16).replace("T", " ") // "2026-05-07 14:30"
    if (!priceByTs.has(ts)) priceByTs.set(ts, { date: label })
    priceByTs.get(ts)![snap.competitor.name] = snap.price
  }
  const priceData: PricePoint[] = Array.from(priceByTs.values())

  // Build AmpPoint[]
  const ampData: AmpPoint[] = recHistory.map((r) => ({
    date: r.createdAt.toISOString().slice(0, 16).replace("T", " "),
    AMP: r.ampTrimmed,
    SRP: r.srp,
  }))

  // Build TriggerRow[]
  const triggerRows: TriggerRow[] = triggersRaw.map((t) => ({
    id: t.id,
    name: t.name,
    condition: t.condition,
    threshold: t.threshold,
    action: t.action,
    actionConfig: t.actionConfig as Record<string, string>,
    isActive: t.isActive,
    lastFiredAt: t.lastFiredAt?.toISOString() ?? null,
  }))

  return (
    <div className="flex h-screen bg-[#f9faf8]">
      <Sidebar active="products" />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <p className="text-xs text-gray-400 mb-1">Products › {product.name}</p>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-[#00343A] font-semibold text-xl">{product.name}</h2>
              <p className="text-gray-400 text-sm">
                {product.sku && `${product.sku} · `}
                {product.servingsPerPack} servings · cycle {product.scrapeInterval} ·{" "}
                last run {relativeTime(product.updatedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <RunNowButton productId={product.id} />
              <button className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
                Export
              </button>
              <button className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
                PDF report
              </button>
              <AddCompetitorModal productId={product.id} />
            </div>
          </div>
        </div>

        {/* PRODUCT STATS */}
        <div className="grid grid-cols-4 gap-0 border-b border-gray-200 bg-[#f9faf8]">
          <div className="px-8 py-4 border-r border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Our Product
            </p>
            <p className="font-semibold text-[#00343A]">{product.name}</p>
            <p className="text-xs text-gray-400">{product.sku || "No SKU"}</p>
          </div>
          <div className="px-8 py-4 border-r border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Cost & Markup
            </p>
            <p className="font-semibold text-[#00343A] text-lg">
              {sym}{product.costPrice.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">
              Min {product.minMarkup.toFixed(1)}×
              {rec ? ` · now ${rec.markupRatio.toFixed(2)}×` : ""}
            </p>
          </div>
          <div className="px-8 py-4 border-r border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Position Rule
            </p>
            <p className="font-semibold text-[#00343A]">
              +{product.adjustment}% above {product.positionRule}
            </p>
            <p className="text-xs text-gray-400">Anchor: {sym}/serving</p>
          </div>
          <div className="px-8 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Cycle
            </p>
            <p className="font-semibold text-[#00343A] capitalize">
              {product.scrapeInterval === "biweekly" ? "Bi-weekly" : `Every ${product.scrapeInterval}`}
            </p>
            <p className="text-xs text-gray-400">{product.currency} · VAT incl.</p>
          </div>
        </div>

        {/* TABS */}
        <ProductTabs
          productId={product.id}
          sym={sym}
          servingsPerPack={product.servingsPerPack}
          adjustment={product.adjustment}
          positionRule={product.positionRule}
          competitors={competitorRows}
          rec={recData}
          priceData={priceData}
          ampData={ampData}
          competitorNames={competitorNames}
          triggers={triggerRows}
        />
      </div>
    </div>
  )
}
