interface RateCache {
  base: string
  rates: Record<string, number>
  fetchedAt: number
}

const cache: Record<string, RateCache> = {}
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

async function getRates(base: string): Promise<Record<string, number>> {
  const now = Date.now()
  if (cache[base] && now - cache[base].fetchedAt < CACHE_TTL_MS) {
    return cache[base].rates
  }

  const res = await fetch(`https://api.frankfurter.app/latest?base=${base}`)
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`)

  const data = await res.json() as { rates: Record<string, number> }
  cache[base] = { base, rates: { ...data.rates, [base]: 1 }, fetchedAt: now }
  return cache[base].rates
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (from === to) return amount

  const rates = await getRates(from)
  const rate = rates[to]
  if (!rate) throw new Error(`No rate for ${from} → ${to}`)

  return parseFloat((amount * rate).toFixed(4))
}
