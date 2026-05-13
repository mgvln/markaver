import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "chat:write,chat:write.public",
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/slack/callback`,
    state: session.user.orgId,
  })

  return NextResponse.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  )
}
