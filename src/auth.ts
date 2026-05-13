import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        })

        if (!user || !user.password) return null

        const match = await bcrypt.compare(
          String(credentials.password),
          user.password
        )

        if (!match) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const orgUser = await prisma.orgUser.findFirst({
          where: { userId: user.id as string },
          orderBy: { createdAt: "asc" },
        })
        token.orgId = orgUser?.orgId ?? ""
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub as string
      session.user.orgId = token.orgId as string
      return session
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
})
