import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import OnboardingWizard from "./OnboardingWizard"

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default async function Dashboard() {
  const session = await auth()

  if (!session?.user?.orgId) {
    return (
      <div className="min-h-screen bg-[#f9faf8] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#00343A] flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="white"/>
            </svg>
          </div>
          <h2 className="text-[#00343A] text-2xl font-bold mb-2">You&apos;re signed in</h2>
          <p className="text-gray-500 text-sm mb-8">
            You&apos;re not part of any organisation yet. Ask your admin to invite you, or create your own.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/setup"
              className="w-full bg-[#00343A] text-white py-3 rounded-lg font-medium hover:bg-[#004f58] transition-colors text-sm"
            >
              Create an organisation
            </a>
            <a
              href="/api/auth/signout"
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              Sign out
            </a>
          </div>
        </div>
      </div>
    )
  }

  const products = await prisma.product.findMany({
    where: { orgId: session.user.orgId },
    include: {
      _count: { select: { competitors: true } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
      competitors: {
        include: { snapshots: { orderBy: { scrapedAt: "desc" }, take: 1 } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex h-screen bg-[#f9faf8]">
      {products.length === 0 && <OnboardingWizard />}
      <Sidebar active="dashboard" />

      <div className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <p className="text-xs text-gray-400 mb-1">Overview</p>
          <div className="flex justify-between items-center">
            <h2 className="text-[#00343A] font-semibold text-xl">Dashboard</h2>
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
              <p className="text-gray-600 font-medium mb-2">No products yet</p>
              <p className="text-gray-400 text-sm mb-6">
                Add your first product to start tracking competitor prices.
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
                <h3 className="text-sm font-semibold text-[#00343A]">Tracked Products</h3>
                <span className="text-xs text-gray-400">
                  {products.length} product{products.length !== 1 ? "s" : ""}
                </span>
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
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const sym = CURRENCY_SYMBOL[p.currency] ?? "€"
                    const rec = p.recommendations[0] ?? null
                    const hasCompetitors = p._count.competitors > 0
                    const lastRun = p.competitors
                      .flatMap((c) => c.snapshots)
                      .map((s) => s.scrapedAt)
                      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null

                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link
                            href={`/products/${p.id}`}
                            className="font-medium text-sm text-[#00343A] hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {p.sku || `${p.servingsPerPack} servings`}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{p.currency}</td>
                        <td className="px-4 py-4 text-sm text-right text-gray-500">
                          {p._count.competitors}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-mono text-gray-600">
                          {rec ? `${sym}${rec.ampTrimmed.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-mono font-semibold text-[#047857]">
                          {rec ? `${sym}${rec.srp.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-mono text-gray-600">
                          {rec
                            ? `${rec.markupRatio.toFixed(2)}×`
                            : `${p.minMarkup.toFixed(1)}× (min)`}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-400">
                          {lastRun ? relativeTime(lastRun) : "never"}
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
