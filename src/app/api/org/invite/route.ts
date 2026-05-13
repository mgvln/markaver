import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.orgId || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const caller = await prisma.orgUser.findUnique({
    where: {
      orgId_userId: { orgId: session.user.orgId, userId: session.user.id },
    },
  })
  if (!caller || !["OWNER", "MANAGER"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, email, role } = await request.json()
  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
  }

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({ data: { email, name: name || null } })
  } else if (name && !user.name) {
    user = await prisma.user.update({ where: { email }, data: { name } })
  }

  const existing = await prisma.orgUser.findUnique({
    where: {
      orgId_userId: { orgId: session.user.orgId, userId: user.id },
    },
  })
  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 })
  }

  const orgUser = await prisma.orgUser.create({
    data: { orgId: session.user.orgId, userId: user.id, role },
    include: { user: true },
  })

  return NextResponse.json(orgUser, { status: 201 })
}
