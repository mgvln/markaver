import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@markaver.com"
  const password = "MarkaverAdmin2026!"

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (!existing.isSuperAdmin) {
      await prisma.user.update({
        where: { email },
        data: { isSuperAdmin: true },
      })
      console.log("Existing user promoted to super-admin.")
    } else {
      console.log("Super-admin already exists, nothing to do.")
    }
    return
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      password: hashed,
      isSuperAdmin: true,
    },
  })

  console.log(`Super-admin created: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
