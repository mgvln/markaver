import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  let user
  try {
    user = await prisma.user.findUnique({ where: { email } })
  } catch (err) {
    console.error("[forgot-password] db lookup failed:", err)
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 })
  }

  console.log(`[forgot-password] email=${email} found=${!!user} hasPassword=${!!user?.password}`)

  // Always return success to avoid leaking whether an email is registered
  if (!user || !user.password) {
    return NextResponse.json({ ok: true })
  }

  // Invalidate any existing token for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({ data: { token, email, expiresAt } })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  try {
    await sendPasswordResetEmail(email, `${baseUrl}/reset-password/${token}`)
    console.log(`[forgot-password] email sent to ${email}`)
  } catch (err) {
    console.error("[forgot-password] email send failed:", err)
    return NextResponse.json({ error: "Failed to send reset email. Please contact support." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
