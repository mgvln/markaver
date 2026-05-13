import { prisma } from "@/lib/prisma"
import { sendAlertEmail } from "@/lib/email"
import { sendWebhook } from "@/lib/webhook"

function resolveVars(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

type FireContext = {
  changePct?: number
  message: string
}

export async function evaluateTriggers(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      org: { select: { slackBotToken: true, slackChannel: true } },
      triggers: { where: { isActive: true } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 2 },
      competitors: {
        include: {
          snapshots: { orderBy: { scrapedAt: "desc" }, take: 2 },
        },
      },
    },
  })

  if (!product || product.triggers.length === 0) return

  const currentRec = product.recommendations[0] ?? null
  const prevRec = product.recommendations[1] ?? null

  for (const trigger of product.triggers) {
    try {
      const ctx = evaluate(trigger, product, currentRec, prevRec)
      if (!ctx) continue

      const sym = { EUR: "€", GBP: "£", USD: "$" }[product.currency] ?? "€"
      const vars: Record<string, string> = {
        product_name: product.name,
        srp: currentRec ? `${sym}${currentRec.srp.toFixed(2)}` : "—",
        amp: currentRec ? `${sym}${currentRec.ampTrimmed.toFixed(2)}` : "—",
        markup: currentRec ? `${currentRec.markupRatio.toFixed(2)}` : "—",
        change_pct: ctx.changePct?.toFixed(1) ?? "0",
      }

      await fire(trigger, vars, ctx.message, currentRec, product.org)

      await prisma.trigger.update({
        where: { id: trigger.id },
        data: { lastFiredAt: new Date() },
      })
    } catch (err) {
      console.error(`[triggers] trigger ${trigger.id} error:`, err)
    }
  }
}

function evaluate(
  trigger: { condition: string; threshold: number | null },
  product: { competitors: { name: string; snapshots: { price: number }[] }[] },
  currentRec: { ampTrimmed: number; srp: number; markupRatio: number } | null,
  prevRec: { ampTrimmed: number; srp: number } | null,
): FireContext | null {
  switch (trigger.condition) {
    case "amp_drops_by": {
      if (!currentRec || !prevRec || !trigger.threshold) return null
      const drop = ((prevRec.ampTrimmed - currentRec.ampTrimmed) / prevRec.ampTrimmed) * 100
      if (drop >= trigger.threshold) {
        return { changePct: drop, message: `AMP dropped by ${drop.toFixed(1)}% this cycle` }
      }
      return null
    }

    case "srp_changes": {
      if (!currentRec || !prevRec) return null
      if (currentRec.srp === prevRec.srp) return null
      const change = ((currentRec.srp - prevRec.srp) / prevRec.srp) * 100
      return {
        changePct: Math.abs(change),
        message: `Recommended SRP changed by ${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
      }
    }

    case "markup_below": {
      if (!currentRec || !trigger.threshold) return null
      if (currentRec.markupRatio >= trigger.threshold) return null
      return {
        message: `Markup ratio ${currentRec.markupRatio.toFixed(2)}× fell below ${trigger.threshold}×`,
      }
    }

    case "competitor_price_changes": {
      for (const c of product.competitors) {
        const cur = c.snapshots[0]
        const prev = c.snapshots[1]
        if (!cur || !prev || !trigger.threshold) continue
        const change = Math.abs((cur.price - prev.price) / prev.price) * 100
        if (change >= trigger.threshold) {
          return {
            changePct: change,
            message: `${c.name} price changed by ${change.toFixed(1)}% this cycle`,
          }
        }
      }
      return null
    }

    default:
      return null
  }
}

async function sendSlackMessage(
  token: string,
  channel: string,
  text: string,
): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text }),
  })
  const data = (await res.json()) as { ok: boolean; error?: string }
  if (!data.ok) {
    console.error(`[triggers] Slack error: ${data.error}`)
  }
}

async function fire(
  trigger: { action: string; actionConfig: unknown; name: string },
  vars: Record<string, string>,
  rawMessage: string,
  rec: { srp: number; ampTrimmed: number; markupRatio: number } | null,
  org: { slackBotToken: string | null; slackChannel: string | null },
): Promise<void> {
  const message = resolveVars(rawMessage, vars)
  const config = (trigger.actionConfig ?? {}) as Record<string, string>

  switch (trigger.action) {
    case "email": {
      if (!config.email) break
      await sendAlertEmail({
        to: config.email,
        productName: vars.product_name,
        message,
        srp: vars.srp,
        amp: vars.amp,
        markup: vars.markup,
      })
      break
    }

    case "webhook": {
      if (!config.webhookUrl) break
      await sendWebhook(config.webhookUrl, {
        event: "price_alert",
        product: vars.product_name,
        srp: rec?.srp ?? 0,
        amp: rec?.ampTrimmed ?? 0,
        markup: rec?.markupRatio ?? 0,
        trigger: trigger.name,
        message,
      })
      break
    }

    case "slack": {
      if (!org.slackBotToken || !org.slackChannel) {
        console.log(`[triggers] Slack not configured for org — skipping: ${message}`)
        break
      }
      const text = `*${vars.product_name}* — ${message}\nSRP: ${vars.srp} · AMP: ${vars.amp} · Markup: ${vars.markup}×`
      await sendSlackMessage(org.slackBotToken, org.slackChannel, text)
      break
    }
  }
}
