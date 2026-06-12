import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/signup") ||
                     req.nextUrl.pathname.startsWith("/forgot-password") ||
                     req.nextUrl.pathname.startsWith("/reset-password")
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  // Allow auth API routes and internal scrape trigger always
  const isInternal = req.nextUrl.pathname.startsWith("/api/internal/")
  if (isApiAuth || isInternal) return NextResponse.next()

  // Redirect logged in users away from login/signup
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  // Redirect logged out users to login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
