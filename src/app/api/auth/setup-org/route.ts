import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.orgUser.findFirst({ where: { userId: session.user.id } })
  if (existing) {
    return NextResponse.json({ error: "Already in an organisation" }, { status: 400 })
  }

  const { orgName } = await request.json()
  if (!orgName?.trim()) {
    return NextResponse.json({ error: "Organisation name is required" }, { status: 400 })
  }

  const slug =
    orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") +
    "-" +
    Date.now()

  const org = await prisma.organization.create({
    data: { name: orgName.trim(), slug },
  })

  await prisma.orgUser.create({
    data: { role: "OWNER", userId: session.user.id, orgId: org.id },
  })

  return NextResponse.json({ orgId: org.id })
}
