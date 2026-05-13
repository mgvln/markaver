import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slackChannel } = (await req.json()) as { slackChannel: string }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: { slackChannel },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: { slackBotToken: null, slackChannel: null },
  })

  return NextResponse.json({ ok: true })
}
