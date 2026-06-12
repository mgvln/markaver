import "next-auth"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      orgId: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId?: string
    isSuperAdmin?: boolean
  }
}

declare module "next-auth" {
  interface Session {
    update?: (data: { orgId: string }) => Promise<void>
  }
}
