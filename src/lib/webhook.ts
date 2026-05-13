export interface WebhookPayload {
  event: "price_alert"
  product: string
  srp: number
  amp: number
  markup: number
  trigger: string
  message: string
}

export async function sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload)
  const headers = { "Content-Type": "application/json" }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body })
      if (res.ok) return
      console.warn(`[webhook] Attempt ${attempt} → ${res.status} ${res.statusText}`)
    } catch (err) {
      console.warn(`[webhook] Attempt ${attempt} failed:`, err)
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt))
  }

  throw new Error(`Webhook POST to ${url} failed after 3 attempts`)
}
