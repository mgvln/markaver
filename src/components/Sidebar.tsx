import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import LogoutButton from "@/components/LogoutButton"
import MobileMenuClient from "@/components/MobileMenuClient"

export type ActivePage = "dashboard" | "products" | "markets" | "reports" | "triggers" | "settings" | "admin"

const navLinks = [
  { href: "/", label: "Dashboard", id: "dashboard" },
  { href: "/products", label: "Products", id: "products" },
  { href: "#", label: "Markets", id: "markets" },
  { href: "#", label: "Reports", id: "reports" },
  { href: "#", label: "Triggers", id: "triggers" },
  { href: "/settings", label: "Settings", id: "settings" },
] as const

export default async function Sidebar({ active }: { active: ActivePage }) {
  const session = await auth()
  const userName = session?.user?.name || "User"
  const userInitial = userName.charAt(0).toUpperCase()
  const userEmail = session?.user?.email || ""

  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isSuperAdmin: true },
      })
    : null
  const isSuperAdmin = dbUser?.isSuperAdmin ?? false

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-[#00343A] flex-col shrink-0">
        <div className="p-6 border-b border-[#ffffff15]">
          <h1 className="text-white font-bold text-xl">Markaver</h1>
          <p className="text-[#33A579] text-xs mt-1">Pricing Intelligence</p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className={`px-4 py-2.5 rounded-lg text-sm ${
                active === link.id
                  ? "text-white bg-[#ffffff15] font-medium"
                  : "text-[#ffffff80] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isSuperAdmin && (
            <div className="mt-2 pt-2 border-t border-[#ffffff15]">
              <Link
                href="/admin"
                className={`px-4 py-2.5 rounded-lg text-sm block ${
                  active === "admin"
                    ? "text-white bg-[#ffffff15] font-medium"
                    : "text-[#ffffff50] hover:text-white"
                }`}
              >
                Super Admin
              </Link>
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-[#ffffff15]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#33A579] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-[#ffffff50] text-xs truncate">{userEmail}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Mobile top bar + slide-out drawer */}
      <MobileMenuClient
        active={active}
        userName={userName}
        userEmail={userEmail}
        userInitial={userInitial}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  )
}
