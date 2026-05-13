import cron from "node-cron"
import { prisma } from "@/lib/prisma"
import { scrapeProduct } from "@/lib/scraper"

const INTERVAL_HOURS: Record<string, number> = {
  daily: 24,
  weekly: 24 * 7,
  biweekly: 24 * 14,
  monthly: 24 * 30,
}

const g = globalThis as { _schedulerStarted?: boolean }

export function startScheduler() {
  if (g._schedulerStarted) return
  g._schedulerStarted = true

  // Run at the top of every hour
  cron.schedule("0 * * * *", async () => {
    console.log("[scheduler] Checking for due scrapes...")

    const products = await prisma.product.findMany({
      include: {
        snapshots: { orderBy: { scrapedAt: "desc" }, take: 1 },
        competitors: { select: { id: true } },
      },
    })

    const now = Date.now()
    let ran = 0

    for (const product of products) {
      if (product.competitors.length === 0) continue

      const intervalHours = INTERVAL_HOURS[product.scrapeInterval] ?? INTERVAL_HOURS.weekly
      const lastSnap = product.snapshots[0]
      const lastRun = lastSnap ? lastSnap.scrapedAt.getTime() : 0
      const isDue = now - lastRun >= intervalHours * 3600 * 1000

      if (!isDue) continue

      try {
        const result = await scrapeProduct(product.id)
        console.log(`[scheduler] ${product.name}: scraped=${result.scraped} failed=${result.failed}`)
        ran++
      } catch (err) {
        console.error(`[scheduler] ${product.name} failed:`, err)
      }
    }

    console.log(`[scheduler] Done. Ran ${ran} scrape(s).`)
  })

  console.log("[scheduler] Started — runs every hour.")
}
