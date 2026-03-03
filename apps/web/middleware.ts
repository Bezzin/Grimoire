import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/signup") ||
    req.nextUrl.pathname.startsWith("/forgot-password")
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard")
  const isOnboarding = req.nextUrl.pathname.startsWith("/onboarding")

  // Protect dashboard and onboarding — require login
  if ((isDashboard || isOnboarding) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/login", "/signup", "/forgot-password"],
}
