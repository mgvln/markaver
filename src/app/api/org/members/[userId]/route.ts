import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const session = await auth()
  if (!session?.user?.orgId || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const caller = await prisma.orgUser.findUnique({
    where: { orgId_userId: { orgId: session.user.orgId, userId: session.user.id } },
  })
  if (!caller || !["OWNER", "MANAGER"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 })
  }

  const target = await prisma.orgUser.findUnique({
    where: { orgId_userId: { orgId: session.user.orgId, userId } },
  })
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  // Prevent removing the last OWNER
  if (target.role === "OWNER") {
    const ownerCount = await prisma.orgUser.count({
      where: { orgId: session.user.orgId, role: "OWNER" },
    })
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 400 })
    }
  }

  await prisma.orgUser.delete({
    where: { orgId_userId: { orgId: session.user.orgId, userId } },
  })

  return NextResponse.json({ ok: true })
}
