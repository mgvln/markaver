import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import ProductRowActions from "./ProductRowActions"

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default async function ProductsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/setup")

  const products = await prisma.product.findMany({
    where: { orgId: session.user.orgId },
    include: {
      _count: { select: { competitors: true } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex h-screen bg-[#f9faf8]">
      <Sidebar active="products" />

      <div className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <p className="text-xs text-gray-400 mb-1">Management</p>
          <div className="flex justify-between items-center">
            <h2 className="text-[#00343A] font-semibold text-xl">Products</h2>
            <Link
              href="/products/new"
              className="bg-[#00343A] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#004f58]"
            >
              + Add Product
            </Link>
          </div>
        </div>

        <div className="p-4 md:p-8">
          {products.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <p className="text-gray-900 font-medium mb-2">No products yet</p>
              <p className="text-gray-400 text-sm mb-6">
                Start tracking competitor prices by adding your first product.
              </p>
              <Link
                href="/products/new"
                className="bg-[#00343A] text-white px-5 py-2.5 rounded-lg text-sm hover:bg-[#004f58]"
              >
                Add your first product
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-[#00343A]">All Products</h3>
                <span className="text-xs text-gray-400">{products.length} product{products.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f9faf8] border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Product
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Currency
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Competitors
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      AMP
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Rec. SRP
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Markup
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Last Run
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Status
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const sym = CURRENCY_SYMBOL[p.currency] ?? "€"
                    const rec = p.recommendations[0] ?? null
                    const hasCompetitors = p._count.competitors > 0

                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link
                            href={`/products/${p.id}`}
                            className="font-medium text-sm text-[#00343A] hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-gray-400">{p.sku || `${p.servingsPerPack} servings`}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{p.currency}</td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {p._count.competitors}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-mono text-gray-900">
                          {rec ? `${sym}${rec.ampTrimmed.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-mono font-semibold text-[#047857]">
                          {rec ? `${sym}${rec.srp.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-mono text-gray-900">
                          {rec
                            ? `${rec.markupRatio.toFixed(2)}×`
                            : `${p.minMarkup.toFixed(1)}× (min)`}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-400">
                          {relativeTime(p.updatedAt)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              hasCompetitors
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {hasCompetitors ? "Active" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <ProductRowActions productId={p.id} productName={p.name} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
