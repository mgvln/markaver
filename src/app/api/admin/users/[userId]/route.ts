import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  })
  return user?.isSuperAdmin ? session : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireSuperAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { userId } = await params
  const body = await req.json()

  // Update isSuperAdmin
  if (typeof body.isSuperAdmin === "boolean") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: body.isSuperAdmin },
      select: { id: true, email: true, isSuperAdmin: true },
    })
    return NextResponse.json(updated)
  }

  // Update org role
  if (body.orgId && body.role) {
    const validRoles = ["OWNER", "MANAGER", "ANALYST", "VIEWER"]
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    const updated = await prisma.orgUser.update({
      where: { orgId_userId: { orgId: body.orgId, userId } },
      data: { role: body.role },
    })
    return NextResponse.json(updated)
  }

  // Remove from org
  if (body.removeFromOrg) {
    await prisma.orgUser.delete({
      where: { orgId_userId: { orgId: body.removeFromOrg, userId } },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
}
