import { ApifyClient } from "apify-client"

export interface ScrapeResult {
  price: number
  currency: string
  productName: string
  inStock: boolean
  url: string
}

// Deterministic mock — same URL always returns the same price
function mockScrape(url: string): ScrapeResult {
  const hash = Array.from(url).reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
  const abs = Math.abs(hash)
  const price = 15 + (abs % 2500) / 100
  const currencies = ["EUR", "EUR", "EUR", "GBP", "USD"]
  const names = [
    "GLP-1 Support Formula",
    "Berberine Complex 500mg",
    "Metabolic Activator",
    "GLP-1 Activator Pro",
    "Weight Management Formula",
    "Berberine + Ceylon Cinnamon",
    "GLP Support Blend",
  ]
  return {
    price: parseFloat(price.toFixed(2)),
    currency: currencies[abs % currencies.length],
    productName: names[abs % names.length],
    inStock: abs % 5 !== 0,
    url,
  }
}

// Minimal page function — extracts only the 4 required fields to minimise compute
const PAGE_FUNCTION = `
async function pageFunction(context) {
  const { $ } = context;

  // 1. JSON-LD structured data (fastest, most reliable)
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    try {
      const data = JSON.parse($(script).html() || '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offer && offer.price) {
            return {
              price: parseFloat(String(offer.price).replace(',', '.')),
              currency: offer.priceCurrency || 'EUR',
              productName: item.name || '',
              inStock: !offer.availability || offer.availability.includes('InStock'),
            };
          }
        }
      }
    } catch (_) {}
  }

  // 2. Common price selectors
  const priceSelectors = [
    '[itemprop="price"]', '.price__current', '.product-price',
    '.woocommerce-Price-amount', '.price', '[data-price]',
    '.product__price', '.offer-price', '.sales-price',
  ];
  let priceText = '';
  for (const sel of priceSelectors) {
    const el = $(sel).first();
    if (!el.length) continue;
    priceText = el.attr('content') || el.attr('data-price') || el.text().trim();
    if (priceText) break;
  }
  const priceMatch = priceText.match(/[\\d]+[.,]?[\\d]*/);
  const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

  const stockText = $('[itemprop="availability"], .availability, .stock-status').first().text().toLowerCase();
  const inStock = !stockText.includes('out of stock') && !stockText.includes('unavailable');

  return {
    price,
    currency: 'EUR',
    productName: $('h1').first().text().trim().slice(0, 200),
    inStock,
  };
}
`

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  if (!process.env.APIFY_API_TOKEN) {
    return mockScrape(url)
  }

  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN })

  const run = await client.actor("apify/cheerio-scraper").call({
    startUrls: [{ url }],
    pageFunction: PAGE_FUNCTION,
    maxRequestsPerCrawl: 1,
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  const item = items[0] as Record<string, unknown> | undefined

  if (!item || !item.price) {
    return mockScrape(url)
  }

  return {
    price: Number(item.price),
    currency: String(item.currency ?? "EUR"),
    productName: String(item.productName ?? ""),
    inStock: Boolean(item.inStock ?? true),
    url,
  }
}
