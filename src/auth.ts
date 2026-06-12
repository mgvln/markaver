import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: profile.email },
        })
        if (!existing) {
          await prisma.user.create({
            data: {
              email: profile.email,
              name: (profile as { name?: string }).name ?? profile.email.split("@")[0],
            },
          })
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger, session }) {
      // Session update trigger (e.g. after org setup)
      if (trigger === "update" && (session as { orgId?: string })?.orgId) {
        token.orgId = (session as { orgId: string }).orgId
        return token
      }

      if (account?.provider === "credentials" && user) {
        const [orgUser, dbUser] = await Promise.all([
          prisma.orgUser.findFirst({
            where: { userId: user.id as string },
            orderBy: { createdAt: "asc" },
          }),
          prisma.user.findUnique({
            where: { id: user.id as string },
            select: { isSuperAdmin: true },
          }),
        ])
        token.orgId = orgUser?.orgId ?? ""
        token.isSuperAdmin = dbUser?.isSuperAdmin ?? false
      }

      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { orgs: { orderBy: { createdAt: "asc" }, take: 1 } },
        })
        if (dbUser) {
          token.sub = dbUser.id
          token.orgId = dbUser.orgs[0]?.orgId ?? ""
          token.isSuperAdmin = dbUser.isSuperAdmin
        }
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
