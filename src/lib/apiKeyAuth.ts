import { prisma } from "@/lib/prisma"
import { createHash } from "crypto"
import { NextRequest } from "next/server"

export async function verifyApiKey(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? ""
  if (!auth.startsWith("Bearer ")) return null

  const raw = auth.slice(7).trim()
  if (!raw) return null

  const keyHash = createHash("sha256").update(raw).digest("hex")
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } })
  if (!apiKey) return null

  // Update lastUsedAt without awaiting to keep response fast
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return apiKey.orgId
}
