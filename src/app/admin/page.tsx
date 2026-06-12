import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import AdminUsersTable from "./AdminUsersTable"

function relativeTime(date: Date | null): string {
  if (!date) return "Never"
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString("en-GB")
}

export default async function AdminPage() {
  const session = await auth()

  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isSuperAdmin: true },
      })
    : null

  if (!dbUser?.isSuperAdmin) redirect("/")

  const [orgs, users] = await Promise.all([
    prisma.organization.findMany({
      include: {
        _count: { select: { users: true, products: true } },
        products: {
          include: { recommendations: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      include: {
        orgs: {
          include: { org: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const orgsWithMeta = orgs.map((org) => {
    const dates = org.products.flatMap((p) => p.recommendations.map((r) => r.createdAt))
    const lastScrape = dates.length > 0
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null
    return { ...org, lastScrape }
  })

  const usersForTable = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isSuperAdmin: u.isSuperAdmin,
    memberships: u.orgs.map((ou) => ({
      orgId: ou.org.id,
      orgName: ou.org.name,
      role: ou.role,
    })),
  }))

  const totalUsers = orgs.reduce((s, o) => s + o._count.users, 0)
  const totalProducts = orgs.reduce((s, o) => s + o._count.products, 0)

  return (
    <div className="flex h-screen bg-[#f9faf8]">
      <Sidebar active="admin" />

      <div className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <p className="text-xs text-gray-400 mb-1">System</p>
          <h2 className="text-[#00343A] font-semibold text-xl">Super Admin</h2>
        </div>

        <div className="p-4 md:p-8 flex flex-col gap-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 mb-1">Organisations</p>
              <p className="text-2xl font-bold font-mono text-[#00343A]">{orgs.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 mb-1">Users</p>
              <p className="text-2xl font-bold font-mono text-[#00343A]">{totalUsers}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 mb-1">Products</p>
              <p className="text-2xl font-bold font-mono text-[#00343A]">{totalProducts}</p>
            </div>
          </div>

          {/* Orgs table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-[#00343A]">All Organisations</h3>
              <span className="text-xs text-gray-400">{orgs.length} org{orgs.length !== 1 ? "s" : ""}</span>
            </div>
            {orgs.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">No organisations yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f9faf8] border-b border-gray-200">
                      {["Organisation", "Slug", "Users", "Products", "Last scrape", "Created"].map((h) => (
                        <th key={h} className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgsWithMeta.map((org) => (
                      <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-[#00343A]">{org.name}</td>
                        <td className="px-6 py-4 text-xs text-gray-400 font-mono">{org.slug}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{org._count.users}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{org._count.products}</td>
                        <td className="px-6 py-4 text-xs text-gray-400">{relativeTime(org.lastScrape)}</td>
                        <td className="px-6 py-4 text-xs text-gray-400">{org.createdAt.toLocaleDateString("en-GB")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Users table — interactive */}
          <AdminUsersTable initialUsers={usersForTable} />
        </div>
      </div>
    </div>
  )
}
