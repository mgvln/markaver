"use client"
import { useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import type { ActivePage } from "@/components/Sidebar"

const navLinks = [
  { href: "/", label: "Dashboard", id: "dashboard" },
  { href: "/products", label: "Products", id: "products" },
  { href: "#", label: "Markets", id: "markets" },
  { href: "#", label: "Reports", id: "reports" },
  { href: "#", label: "Triggers", id: "triggers" },
  { href: "/settings", label: "Settings", id: "settings" },
] as const

interface Props {
  active: ActivePage
  userName: string
  userEmail: string
  userInitial: string
  isSuperAdmin?: boolean
}

export default function MobileMenuClient({ active, userName, userEmail, userInitial, isSuperAdmin }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#00343A] h-14 px-4 flex items-center justify-between">
        <div>
          <span className="text-white font-bold text-lg">Markaver</span>
          <span className="text-[#33A579] text-xs ml-2 hidden xs:inline">Pricing Intelligence</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-white p-2 -mr-2"
          aria-label="Open menu"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="19" y2="6" />
            <line x1="3" y1="11" x2="19" y2="11" />
            <line x1="3" y1="16" x2="19" y2="16" />
          </svg>
        </button>
      </div>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute top-0 left-0 bottom-0 w-72 bg-[#00343A] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#ffffff15] flex items-center justify-between">
              <div>
                <h1 className="text-white font-bold text-xl">Markaver</h1>
                <p className="text-[#33A579] text-xs mt-1">Pricing Intelligence</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#ffffff60] hover:text-white p-1">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm ${
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
                    onClick={() => setOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm block ${
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

            {/* User footer */}
            <div className="p-4 border-t border-[#ffffff15]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#33A579] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{userName}</p>
                  <p className="text-[#ffffff50] text-xs truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-[#ffffff50] hover:text-white text-xs transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
