import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex")
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
  })

  return NextResponse.json(keys)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const raw = "mk_" + randomBytes(24).toString("hex")
  const keyHash = hashKey(raw)
  const keyPrefix = raw.slice(0, 10) + "..."

  await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash,
      keyPrefix,
      orgId: session.user.orgId,
    },
  })

  return NextResponse.json({ key: raw, keyPrefix })
}
