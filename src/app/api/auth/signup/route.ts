import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const { name, email, password, orgName } = await request.json()

  if (!name || !email || !password || !orgName) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const slug =
    orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") +
    "-" +
    Date.now()

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      orgs: {
        create: {
          role: "OWNER",
          org: {
            create: { name: orgName, slug },
          },
        },
      },
    },
  })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
