import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const orgId = searchParams.get("state")
  const base = process.env.NEXTAUTH_URL!

  if (!code || !orgId) {
    return NextResponse.redirect(`${base}/settings?slack=error`)
  }

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${base}/api/slack/callback`,
    }),
  })

  const data = (await tokenRes.json()) as {
    ok: boolean
    access_token?: string
    team?: { name: string }
    incoming_webhook?: { channel: string }
  }

  if (!data.ok || !data.access_token) {
    return NextResponse.redirect(`${base}/settings?slack=error`)
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      slackBotToken: data.access_token,
      // preserve any previously saved channel; only set from webhook if present
      ...(data.incoming_webhook?.channel
        ? { slackChannel: data.incoming_webhook.channel }
        : {}),
    },
  })

  return NextResponse.redirect(`${base}/settings?slack=connected`)
}
