import Link from "next/link"
import { auth } from "@/auth"

type ActivePage = "dashboard" | "products" | "markets" | "reports" | "triggers" | "settings"

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

  return (
    <div className="w-64 bg-[#00343A] flex flex-col shrink-0">
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
      </nav>
      <div className="p-4 border-t border-[#ffffff15]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#33A579] flex items-center justify-center text-white text-sm font-bold">
            {userInitial}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{userName}</p>
            <p className="text-[#ffffff50] text-xs">{userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
