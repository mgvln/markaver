"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-[#ffffff50] hover:text-white text-xs transition-colors"
      title="Sign out"
    >
      Sign out
    </button>
  )
}
