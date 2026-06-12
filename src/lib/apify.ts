import { ApifyClient } from "apify-client"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export interface ScrapeResult {
  price: number
  currency: string
  productName: string
  inStock: boolean
  url: string
  isMock?: boolean
}

// Deterministic mock — same URL always returns the same price
function mockScrape(url: string): ScrapeResult {
  const hash = Array.from(url).reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
  const abs = Math.abs(hash)
  const price = 15 + (abs % 2500) / 100
  const currencies = ["EUR", "EUR", "EUR", "GBP", "USD"]
  const names = [
    "GLP-1 Support Formula", "Berberine Complex 500mg", "Metabolic Activator",
    "GLP-1 Activator Pro", "Weight Management Formula",
    "Berberine + Ceylon Cinnamon", "GLP Support Blend",
  ]
  return {
    price: parseFloat(price.toFixed(2)),
    currency: currencies[abs % currencies.length],
    productName: names[abs % names.length],
    inStock: abs % 5 !== 0,
    url,
    isMock: true,
  }
}

// Page function runs inside the Puppeteer browser via apify/web-scraper
// Uses native DOM APIs only — no jQuery dependency
const PAGE_FUNCTION = `
async function pageFunction(context) {
  const { request, log } = context;
  const url = request.url;

  // Tesco injects JSON-LD via micro-frontend JS — wait up to 25s for it to appear
  if (url.includes('tesco.com')) {
    try {
      await context.page.waitForFunction(
        () => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some(s => s.textContent && s.textContent.includes('"price"')),
        { timeout: 25000 }
      );
      log.info('Tesco: JSON-LD price element found');
    } catch(e) {
      log.warning('Tesco: timed out waiting for JSON-LD price');
    }
  }

  function detectCurrency(u) {
    if (u.includes('.co.uk') || u.includes('hollandandbarrett') || u.includes('boots.com')) return 'GBP';
    if (u.includes('.com.au') || u.includes('.co.nz')) return 'AUD';
    return 'EUR';
  }

  function parsePrice(raw) {
    if (!raw) return null;
    const cleaned = raw.replace(/[^\\d.,]/g, '');
    const match = cleaned.match(/\\d+[.,]?\\d*/);
    if (!match) return null;
    const price = parseFloat(match[0].replace(',', '.'));
    return (!isNaN(price) && price > 0 && price < 10000) ? price : null;
  }

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
  function text(el) { return el ? el.textContent.trim() : ''; }
  function attr(el, a) { return el ? (el.getAttribute(a) || '') : ''; }

  function trySelectors(selectors) {
    for (const sel of selectors) {
      try {
        const el = qs(sel);
        if (!el) continue;
        const raw = attr(el, 'content') || attr(el, 'data-price') || text(el);
        const price = parsePrice(raw);
        if (price) return { price, sel };
      } catch(e) {}
    }
    return null;
  }

  function h1() { const el = qs('h1'); return el ? text(el).slice(0, 200) : ''; }

  log.info('Scraping: ' + url);

  // 0. MyProtein — must run BEFORE JSON-LD because their JSON-LD only contains
  //    the member/sale price, not the RRP displayed on the page.
  if (url.includes('myprotein.')) {
    const mpWas = trySelectors([
      '[data-js="product-price-was"]',
      '[class*="productPrice-was"]',
      '[class*="ProductPrice-was"]',
      '.product-price__price--original',
      '[class*="originalPrice"]',
      '[class*="original-price"]',
    ]);
    const mpNow = trySelectors([
      '[data-js="product-price"]',
      '.product-price__price',
      '[class*="productPrice-price"]',
      '[class*="ProductPrice-price"]',
    ]);
    const mpResult = mpWas || mpNow;
    if (mpResult) {
      const outOfStock = qs('[class*="outOfStock"],[class*="out-of-stock"],[class*="OutOfStock"]') !== null;
      const currency = url.includes('.co.uk') ? 'GBP' : detectCurrency(url);
      log.info('MyProtein price: ' + mpResult.price + ' via ' + mpResult.sel);
      return { price: mpResult.price, currency, productName: h1(), inStock: !outOfStock, extractedBy: 'myprotein:' + mpResult.sel };
    }
  }

  // 1. JSON-LD structured data
  for (const script of qsa('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.innerHTML || '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const rawOffers = Array.isArray(item.offers) ? item.offers : (item.offers ? [item.offers] : []);
          if (!rawOffers.length) continue;
          const SALE_TYPES = /sale|member|club|discount|promo/i;
          const regular = rawOffers.filter(o => !o.priceType || !SALE_TYPES.test(String(o.priceType)));
          const candidates = regular.length ? regular : rawOffers;
          const offer = candidates.reduce((best, o) => {
            const p = parseFloat(String(o.price).replace(',', '.'));
            const bp = parseFloat(String(best.price).replace(',', '.'));
            return (!isNaN(p) && p > bp) ? o : best;
          });
          if (offer && offer.price) {
            const price = parseFloat(String(offer.price).replace(',', '.'));
            if (!isNaN(price) && price > 0) {
              log.info('JSON-LD price: ' + price + ' (highest)');
              return { price, currency: offer.priceCurrency || detectCurrency(url), productName: item.name || h1(), inStock: !offer.availability || offer.availability.includes('InStock'), extractedBy: 'json-ld' };
            }
          }
        }
      }
    } catch(e) {}
  }

  // 2. Site-specific selectors
  let siteResult = null;

  if (url.includes('amazon.')) {
    // Wait up to 15s for the variant-specific "price to pay" element
    try {
      await context.page.waitForSelector(
        '.priceToPay .a-offscreen, #corePrice_feature_div .a-offscreen, #price_inside_buybox',
        { timeout: 15000 }
      );
    } catch(e) { /* price didn't appear in time, try selectors anyway */ }
    siteResult = trySelectors([
      '.priceToPay .a-offscreen',                                   // variant-specific "pay" price — most reliable
      '#corePrice_feature_div .a-offscreen',                        // core price div, excludes unit-price sub-containers
      '#reinventPricePriceToPayMargin .a-offscreen',
      '#apex_desktop_newAccordionRow .a-color-price .a-offscreen',  // accordion layout variant
      '#price_inside_buybox',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      // .a-price .a-offscreen removed — too generic, picks up per-unit/per-serving prices
    ]);
    if (siteResult) {
      // Prices under £3 on amazon.co.uk are almost certainly per-unit/per-serving display prices
      if (url.includes('amazon.co.uk') && siteResult.price < 3) {
        log.warning('Amazon: suspicious price ' + siteResult.price + ' — likely per-unit price, rejecting for ' + url);
        return { price: null, currency: null, error: 'per_unit_price_rejected:' + siteResult.price, productName: h1(), inStock: false, extractedBy: 'amazon:rejected' };
      }
      const avail = qs('#availability');
      const availText = avail ? text(avail).toLowerCase() : '';
      const inStock = !availText.includes('unavailable') && !availText.includes('currently unavailable');
      const titleEl = qs('#productTitle');
      return { price: siteResult.price, currency: detectCurrency(url), productName: (titleEl ? text(titleEl).slice(0,200) : h1()), inStock, extractedBy: 'amazon:' + siteResult.sel };
    }
  }

  if (url.includes('hollandandbarrett.com')) {
    siteResult = trySelectors(['[data-test="product-price"]','.ProductPrice','.product-price','[class*="productPrice"]','[class*="ProductPrice"]']);
    if (siteResult) {
      const outOfStock = qs('[class*="outOfStock"],[class*="out-of-stock"],[class*="OutOfStock"]') !== null;
      return { price: siteResult.price, currency: 'GBP', productName: h1(), inStock: !outOfStock, extractedBy: 'hnb:' + siteResult.sel };
    }
  }

  if (url.includes('bulk.com') || url.includes('bulkpowders.')) {
    siteResult = trySelectors(['[data-testid="price"]','[data-testid="product-price"]','.ProductDetail__price','[class*="Price__value"]','[class*="price-current"]','[class*="ProductPrice"]','.product-price']);
    if (siteResult) {
      const outOfStock = qs('[class*="outOfStock"],[class*="out-of-stock"]') !== null;
      return { price: siteResult.price, currency: detectCurrency(url), productName: h1(), inStock: !outOfStock, extractedBy: 'bulk:' + siteResult.sel };
    }
  }

  if (url.includes('zumub.com')) {
    const priceEl = qs('span.product-price b.real_price') || qs('.real_price');
    const rawText = priceEl ? text(priceEl) : '';
    const zumubCurrency = rawText.includes('£') ? 'GBP' : rawText.includes('€') ? 'EUR' : rawText.includes('$') ? 'USD' : detectCurrency(url);
    siteResult = trySelectors(['span.product-price b.real_price', '.product-price .real_price', '.real_price']);
    if (siteResult) {
      const outOfStock = qs('.out-of-stock.clearfix') !== null || qs('.btn-out-of-stock:not([style*="none"])') !== null;
      return { price: siteResult.price, currency: zumubCurrency, productName: h1(), inStock: !outOfStock, extractedBy: 'zumub:' + siteResult.sel };
    }
  }

  if (url.includes('iherb.com') || url.includes('iherb.nl')) {
    siteResult = trySelectors(['#price','.price-container .discount-red','.product-price-main','[itemprop="price"]','.col-price .price','#display-price']);
    if (siteResult) {
      const addBtn = qs('#btn-add-to-cart');
      return { price: siteResult.price, currency: detectCurrency(url), productName: h1(), inStock: addBtn !== null, extractedBy: 'iherb:' + siteResult.sel };
    }
  }

  if (url.includes('tesco.com')) {
    // Try 1: GTM dataLayer — Tesco pushes ecommerce events including product price
    try {
      const dl = window.dataLayer || [];
      for (const ev of dl) {
        if (ev && ev.ecommerce) {
          let dlRawP = null;
          // UA enhanced ecommerce format
          if (ev.ecommerce.detail && ev.ecommerce.detail.products && ev.ecommerce.detail.products[0]) {
            dlRawP = ev.ecommerce.detail.products[0].price;
          }
          // GA4 ecommerce format
          if (!dlRawP && ev.ecommerce.items && ev.ecommerce.items[0]) {
            dlRawP = ev.ecommerce.items[0].price;
          }
          if (dlRawP != null) {
            const dlPrice = parseFloat(String(dlRawP));
            if (!isNaN(dlPrice) && dlPrice > 0) {
              log.info('Tesco dataLayer price: ' + dlPrice);
              return { price: dlPrice, currency: 'GBP', productName: h1(), inStock: true, extractedBy: 'tesco:datalayer' };
            }
          }
        }
      }
    } catch(e) {}

    // Try 2: Tesco internal product resources API (same-origin fetch, no CORS restriction)
    try {
      const tpnbMatch = url.match(/\\/products\\/(\\d+)/);
      if (tpnbMatch) {
        const tpnb = tpnbMatch[1];
        const apiRes = await fetch('/groceries/en-GB/resources/product?id=' + tpnb, {
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const apiPrice = apiData && (apiData.price || (apiData.product && apiData.product.price));
          if (apiPrice != null) {
            const ap = parseFloat(String(apiPrice));
            if (!isNaN(ap) && ap > 0) {
              log.info('Tesco API price: ' + ap);
              const apiName = (apiData.title || apiData.name || (apiData.product && (apiData.product.title || apiData.product.name)) || h1());
              return { price: ap, currency: 'GBP', productName: apiName, inStock: true, extractedBy: 'tesco:api' };
            }
          }
        }
      }
    } catch(e) {
      log.warning('Tesco API failed: ' + String(e));
    }

    // Try 3: __NEXT_DATA__ (various pageProps structures Tesco has used)
    try {
      const nd = window.__NEXT_DATA__;
      const pp = nd && nd.props && nd.props.pageProps;
      const prod = pp && (pp.product || (pp.productDetails && pp.productDetails.product) || (pp.data && pp.data.product) || (pp.initialData && pp.initialData.product));
      if (prod) {
        const rawPnd = prod.price != null ? prod.price : (prod.currentPrice != null ? prod.currentPrice : null);
        const pnd = rawPnd != null ? parsePrice(String(rawPnd)) : null;
        if (pnd) {
          const inStockNd = prod.isAvailable !== false && prod.status !== 'Out of stock';
          return { price: pnd, currency: 'GBP', productName: prod.title || prod.name || h1(), inStock: inStockNd, extractedBy: 'tesco:nextdata' };
        }
      }
    } catch(e) {}

    // Try 4: CSS selectors
    siteResult = trySelectors([
      '[data-testid="product-details-price-standard"] .value',
      '.beans-price__text',
      '[class*="PriceText"]',
      '.product-details__price-per-quantity',
      '.product-details__info-quantity-of-price .value',
      '.offer-text',
    ]);
    if (siteResult) {
      const outOfStock = qs('[class*="out-of-stock"],[class*="OutOfStock"]') !== null;
      return { price: siteResult.price, currency: 'GBP', productName: h1(), inStock: !outOfStock, extractedBy: 'tesco:' + siteResult.sel };
    }
  }

  if (url.includes('boots.com')) {
    siteResult = trySelectors(['[data-test="product-price"]','.product-details__price','.pdp-price','.productPrice','.PDP__price']);
    if (siteResult) {
      const outOfStock = qs('[class*="outOfStock"],[class*="out-of-stock"]') !== null;
      return { price: siteResult.price, currency: 'GBP', productName: h1(), inStock: !outOfStock, extractedBy: 'boots:' + siteResult.sel };
    }
  }

  // 3. Open Graph price meta
  const ogEl = qs('meta[property="product:price:amount"]');
  if (ogEl) {
    const price = parseFloat(attr(ogEl, 'content'));
    if (!isNaN(price) && price > 0) {
      const currEl = qs('meta[property="product:price:currency"]');
      const titleEl = qs('meta[property="og:title"]');
      const ogCurr = attr(currEl, 'content');
      // Normalise symbol-based currency codes that some sites put in OG tags
      const normCurr = ogCurr === '£' ? 'GBP' : ogCurr === '€' ? 'EUR' : ogCurr === '$' ? 'USD' : ogCurr;
      return { price, currency: normCurr || detectCurrency(url), productName: attr(titleEl, 'content') || h1(), inStock: true, extractedBy: 'og-meta' };
    }
  }

  // 4. Generic CSS fallback
  const genericResult = trySelectors(['[itemprop="price"]','.price__current','.product-price','.woocommerce-Price-amount','[data-price]','.product__price','#priceblock_ourprice','.offer-price','.sales-price','.price','.current-price','.price-value']);
  if (genericResult) {
    const stockEl = qs('[itemprop="availability"],.stock-status,.stock,.availability');
    const stockText = stockEl ? text(stockEl).toLowerCase() : '';
    const inStock = !stockText.includes('out of stock') && !stockText.includes('sold out') && !stockText.includes('unavailable');
    // Prefer symbol-based currency detection over URL guessing — prevents wrong FX conversion
    const priceEl = qs(genericResult.sel);
    const rawPriceText = priceEl ? text(priceEl) : '';
    const symbolCurrency = rawPriceText.includes('£') ? 'GBP' : rawPriceText.includes('€') ? 'EUR' : rawPriceText.includes('$') ? 'USD' : null;
    const currency = symbolCurrency || detectCurrency(url);
    return { price: genericResult.price, currency, productName: h1(), inStock, extractedBy: genericResult.sel };
  }

  log.warning('No price found on: ' + url);
  return { price: null, currency: null, productName: h1(), inStock: false, extractedBy: 'none', error: 'No price found' };
}
`

function amazonCountry(url: string): string {
  if (url.includes("amazon.co.uk")) return "GB"
  if (url.includes("amazon.de"))    return "DE"
  if (url.includes("amazon.nl"))    return "NL"
  if (url.includes("amazon.fr"))    return "FR"
  if (url.includes("amazon.es"))    return "ES"
  if (url.includes("amazon.it"))    return "IT"
  return "US"
}

// Fallback: junglee dedicated actor — used only when puppeteer-scraper fails.
// Note: junglee does NOT reliably respect ?th= variant params; it may return the
// default-variant price. Only use if puppeteer completely fails to load the page.
async function scrapeAmazonJunglee(client: ApifyClient, url: string): Promise<ScrapeResult> {
  console.log(`[apify] Amazon junglee fallback for: ${url}`)
  const country = amazonCountry(url)

  const run = await client.actor("junglee/amazon-crawler").call({
    categoryOrProductUrls: [{ url }],
    country,
    maxItems: 1,
    proxyCountry: country,
  }, { waitSecs: 300, memory: 1024 })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  const item = items[0] as Record<string, unknown> | undefined

  console.log(`[apify] Amazon junglee result for ${url}:`, JSON.stringify({
    price: item?.price ?? item?.currentPrice ?? null,
    currency: item?.currency ?? null,
    isAvailable: item?.isAvailable ?? item?.inStock ?? null,
    title: String(item?.title ?? "").slice(0, 80),
  }))

  let price: number | null = null
  let currency = country === "GB" ? "GBP" : "EUR"

  const rawPrice = item?.price ?? item?.currentPrice ?? item?.sellingPrice
  if (rawPrice != null) {
    if (typeof rawPrice === "object" && rawPrice !== null) {
      const p = rawPrice as Record<string, unknown>
      price = p.value != null ? Number(p.value) : null
      if (p.currency) {
        const c = String(p.currency)
        currency = c === "£" ? "GBP" : c === "€" ? "EUR" : c === "$" ? "USD" : c
      }
    } else {
      price = Number(rawPrice)
    }
  }
  if (item?.currency) currency = String(item.currency)
  if (currency === "£") currency = "GBP"
  if (currency === "€") currency = "EUR"
  if (currency === "$") currency = "USD"

  if (!item || price == null || isNaN(price)) {
    throw new Error(`Amazon junglee: no price for ${url}`)
  }

  return {
    price,
    currency,
    productName: String(item.title ?? item.name ?? ""),
    inStock: Boolean(item.isAvailable ?? item.inStock ?? true),
    url,
  }
}

// Amazon web-scraper fallback — runs PAGE_FUNCTION in browser context where document is available.
// Loads the exact URL including ?th= variant params so the correct variant price is extracted.
async function scrapeAmazonPuppeteer(client: ApifyClient, url: string, country: string): Promise<ScrapeResult> {
  console.log(`[apify] Amazon web-scraper fallback for: ${url}`)
  const currency = country === "GB" ? "GBP" : "EUR"

  const run = await client.actor("apify/web-scraper").call({
    startUrls: [{ url }],
    pageFunction: PAGE_FUNCTION,
    maxRequestsPerCrawl: 1,
    navigationTimeoutSecs: 90,
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
    stealth: true,
    useChrome: true,
  }, { waitSecs: 300, memory: 1024 })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  const item = items[0] as Record<string, unknown> | undefined

  console.log(`[apify] Amazon puppeteer result for ${url}:`, JSON.stringify({
    price: item?.price ?? null,
    currency: item?.currency ?? null,
    extractedBy: item?.extractedBy ?? null,
    error: item?.error ?? null,
  }))

  if (!item || item.price == null) {
    throw new Error(`Amazon puppeteer: no price for ${url} (extractedBy=${item?.extractedBy ?? "none"})`)
  }

  return {
    price: Number(item.price),
    currency: String(item.currency ?? currency),
    productName: String(item.productName ?? ""),
    inStock: Boolean(item.inStock ?? true),
    url,
  }
}

async function shopifyFetch(url: string): Promise<Response> {
  return fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } })
}

function detectCurrencyFromUrl(u: string) {
  if (u.includes('.co.uk') || u.includes('hollandandbarrett') || u.includes('boots.com')) return 'GBP'
  return 'EUR'
}

// Shared HTML price parser — used by both scrapeHtml and scrapeWithCurl.
function parseHtmlPrice(html: string, originalUrl: string, finalUrl: string): ScrapeResult | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)/)
  const productName = titleMatch ? titleMatch[1].trim() : ''

  // 1. schema.org itemprop (Protein Works, WooCommerce, many others)
  // Case-insensitive: some sites use itemProp="price" (React camelCase)
  const itemPrice = html.match(/itemprop=["']price["'][^>]*content=["']([0-9.]+)["']/i) ??
                    html.match(/content=["']([0-9.]+)["'][^>]*itemprop=["']price["']/i)
  if (itemPrice) {
    const price = parseFloat(itemPrice[1])
    if (!isNaN(price) && price > 0) {
      const itemCurr = html.match(/itemprop=["']priceCurrency["'][^>]*content=["']([A-Z]{3})["']/i) ??
                       html.match(/content=["']([A-Z]{3})["'][^>]*itemprop=["']priceCurrency["']/i)
      const currency = itemCurr ? itemCurr[1] : detectCurrencyFromUrl(finalUrl)
      console.log(`[apify] HTML itemprop price: ${price} ${currency} from ${finalUrl}`)
      return { price, currency, productName, inStock: true, url: originalUrl }
    }
  }

  // 2. Open Graph product price
  const ogPrice = html.match(/property=["']product:price:amount["'][^>]*content=["']([0-9.]+)["']/) ??
                  html.match(/content=["']([0-9.]+)["'][^>]*property=["']product:price:amount["']/)
  if (ogPrice) {
    const price = parseFloat(ogPrice[1])
    if (!isNaN(price) && price > 0) {
      const ogCurr = html.match(/property=["']product:price:currency["'][^>]*content=["']([A-Z]{3})["']/) ??
                     html.match(/content=["']([A-Z]{3})["'][^>]*property=["']product:price:currency["']/)
      const currency = ogCurr ? ogCurr[1] : detectCurrencyFromUrl(finalUrl)
      console.log(`[apify] HTML OG price: ${price} ${currency} from ${finalUrl}`)
      return { price, currency, productName, inStock: true, url: originalUrl }
    }
  }

  // 3. JSON-LD structured data (server-rendered <script type="application/ld+json">)
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let ldMatch
  while ((ldMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = JSON.parse(ldMatch[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] !== 'Product' || !item.offers) continue
        const offersArr = Array.isArray(item.offers) ? item.offers : [item.offers]
        for (const offer of offersArr) {
          const price = parseFloat(String(offer.price ?? '').replace(',', '.'))
          if (!isNaN(price) && price > 0) {
            const rawCurr = String(offer.priceCurrency ?? '') || detectCurrencyFromUrl(finalUrl)
            const currency = rawCurr === '£' ? 'GBP' : rawCurr === '€' ? 'EUR' : rawCurr
            console.log(`[apify] HTML JSON-LD price: ${price} ${currency} from ${finalUrl}`)
            return { price, currency, productName: String(item.name ?? productName), inStock: true, url: originalUrl }
          }
        }
      }
    } catch {}
  }

  // 4. Huel headless Next.js — price embedded as "price":"XX.XX" in RSC payload
  if (originalUrl.includes('huel.com')) {
    const huelPrice = html.match(/"price":"([0-9.]+)"/)
    if (huelPrice) {
      const price = parseFloat(huelPrice[1])
      if (!isNaN(price) && price > 0) {
        console.log(`[apify] HTML Huel embedded price: ${price} GBP from ${finalUrl}`)
        return { price, currency: 'GBP', productName, inStock: true, url: originalUrl }
      }
    }
  }

  return null
}

// Fetches HTML via Node.js fetch — works for most sites.
async function scrapeHtml(url: string): Promise<ScrapeResult> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTML ${res.status}`)
  const html = await res.text()
  const result = parseHtmlPrice(html, url, res.url)
  if (result) return result
  throw new Error('no price found in HTML')
}

// Fetches HTML via curl subprocess — bypasses Cloudflare TLS fingerprinting that
// blocks Node.js fetch. curl uses libcurl's TLS stack which Cloudflare treats as
// a real browser. Used for Protein Works (Cloudflare Enterprise).
// execFile with args array is safe from shell injection.
async function scrapeWithCurl(url: string): Promise<ScrapeResult> {
  console.log(`[apify] curl fetch: ${url}`)
  const { stdout: html } = await execFileAsync('curl', [
    '-sL', '--max-time', '30',
    '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    '-H', 'Accept-Language: en-GB,en;q=0.9',
    '-H', 'Accept-Encoding: gzip, deflate, br',
    '--compressed',
    url,
  ], { maxBuffer: 5 * 1024 * 1024 })

  const result = parseHtmlPrice(html, url, url)
  if (result) return result
  throw new Error('no price found via curl')
}

// PAGE_FUNCTION for Shopify JSON — browser navigates directly to /products/{handle}.json.
// Chromium renders JSON responses as plain text in document.body.innerText, so we
// parse it there. The request goes through Apify's UK residential proxy, bypassing
// geo-pricing that serves EUR/USD to European VPS IPs.
const PAGE_FUNCTION_SHOPIFY_JSON = `
async function pageFunction(context) {
  var request = context.request;
  var log = context.log;
  var url = request.url;
  var variantId = request.userData && request.userData.variantId ? String(request.userData.variantId) : '';

  var raw = '';
  try { raw = document.body.innerText; } catch(e) {}
  if (!raw) { try { raw = document.body.textContent; } catch(e) {} }

  var data;
  try { data = JSON.parse(raw); } catch(e) {
    log.warning('Shopify JSON parse failed: ' + String(e));
    return { price: null, error: 'JSON parse failed' };
  }

  var product = data && data.product;
  if (!product) return { price: null, error: 'no product key' };

  var variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return { price: null, error: 'no variants' };

  var variant = variants[0];
  if (variantId) {
    var matched = variants.filter(function(v) { return String(v.id) === variantId; });
    if (matched.length > 0) { variant = matched[0]; }
  }

  var price = parseFloat(String(variant.price));
  var currency = url.includes('.co.uk') ? 'GBP' : 'EUR';

  try {
    var origin = url.split('/').slice(0, 3).join('/');
    var cartRes = await fetch(origin + '/cart.js');
    var cart = await cartRes.json();
    if (cart && cart.currency) { currency = cart.currency; }
  } catch(e) {}

  log.info('Shopify JSON proxy: ' + price + ' ' + currency);
  return {
    price: price,
    currency: currency,
    productName: String(product.title || ''),
    inStock: variant.available !== false,
    extractedBy: 'shopify-json-proxy'
  };
}
`

// Fetches Shopify product JSON via Apify's UK residential proxy.
// Used when scrapeShopify() returns a non-GBP currency (geo-priced store).
async function scrapeShopifyViaApify(client: ApifyClient, url: string): Promise<ScrapeResult> {
  const u = new URL(url)
  const parts = u.pathname.split('/').filter(Boolean)
  const idx = parts.indexOf('products')
  if (idx < 0 || !parts[idx + 1]) throw new Error('not a product path')
  const handle = parts[idx + 1]
  const jsonUrl = `${u.origin}/products/${handle}.json`
  const variantId = u.searchParams.get('variant') ?? undefined

  console.log(`[apify] Shopify JSON via Apify UK proxy: ${jsonUrl}`)

  const run = await client.actor('apify/web-scraper').call({
    startUrls: [{ url: jsonUrl, userData: variantId ? { variantId } : {} }],
    pageFunction: PAGE_FUNCTION_SHOPIFY_JSON,
    maxRequestsPerCrawl: 1,
    navigationTimeoutSecs: 60,
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'], apifyProxyCountry: 'GB' },
    stealth: true,
    useChrome: true,
  }, { waitSecs: 180, memory: 512 })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  const item = items[0] as Record<string, unknown> | undefined

  console.log(`[apify] Shopify JSON proxy result for ${url}:`, JSON.stringify({
    price: item?.price ?? null,
    currency: item?.currency ?? null,
    error: item?.error ?? null,
  }))

  if (!item || item.price == null || (item.error && !item.price)) {
    throw new Error(`Shopify via Apify: no price (error=${item?.error ?? 'empty'})`)
  }

  return {
    price: Number(item.price),
    currency: String(item.currency ?? 'GBP'),
    productName: String(item.productName ?? ''),
    inStock: Boolean(item.inStock ?? true),
    url,
  }
}

// Shopify stores expose a public product JSON API that bypasses Cloudflare entirely.
// Try this first for any /products/{handle} URL — no Apify credits needed.
async function scrapeShopify(url: string): Promise<ScrapeResult> {
  const u = new URL(url)
  const parts = u.pathname.split('/').filter(Boolean)
  const idx = parts.indexOf('products')
  if (idx < 0 || !parts[idx + 1]) throw new Error('not a product path')
  const handle = parts[idx + 1]
  const jsonUrl = `${u.origin}/products/${handle}.json`
  console.log(`[apify] Shopify JSON API: ${jsonUrl}`)

  const res = await shopifyFetch(jsonUrl)
  if (!res.ok) throw new Error(`Shopify API ${res.status}`)
  const data = await res.json() as { product?: Record<string, unknown> }
  const product = data.product
  if (!product) throw new Error('no product in response')

  const variants = Array.isArray(product.variants) ? product.variants as Record<string, unknown>[] : []
  if (!variants.length) throw new Error('no variants')

  const variantId = u.searchParams.get('variant')
  const variant = (variantId ? variants.find(v => String(v.id) === variantId) : null) ?? variants[0]
  if (!variant) throw new Error('variant not found')

  const price = parseFloat(String(variant.price))
  if (isNaN(price) || price <= 0) throw new Error(`bad price: ${variant.price}`)

  // Shopify product JSON doesn't include currency — fetch it from cart.js
  let currency = u.hostname.endsWith('.co.uk') ? 'GBP' : 'EUR'
  try {
    const cartRes = await shopifyFetch(`${u.origin}/cart.js`)
    if (cartRes.ok) {
      const cartData = await cartRes.json() as { currency?: string }
      if (cartData.currency) currency = cartData.currency
    }
  } catch {}

  const inStock = variant.available !== false

  console.log(`[apify] Shopify price: ${price} ${currency} inStock=${inStock} variant=${variant.id}`)
  return {
    price,
    currency,
    productName: String(product.title ?? ''),
    inStock,
    url,
  }
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // Tesco canonical URL uses /shop/ — /groceries/ serves MFE-heavy pages that time out
  if (url.includes('tesco.com/groceries/')) {
    url = url.replace('tesco.com/groceries/', 'tesco.com/shop/')
    console.log(`[apify] Tesco URL normalised to: ${url}`)
  }

  console.log(`[apify] Attempting: ${url}`)

  // Shopify stores: try the public JSON API first — bypasses Cloudflare, no Apify needed.
  // If it returns a non-GBP currency (geo-priced store served EUR/USD to our EU VPS),
  // retry via an Apify actor on a UK residential IP to get the true GBP price.
  if (/\/products\/[a-z0-9_-]+/i.test(url) && !url.includes('amazon.') && !url.includes('tesco.')) {
    try {
      const shopifyResult = await scrapeShopify(url)
      if (shopifyResult.currency !== 'GBP' && process.env.APIFY_API_TOKEN) {
        const clientForGeo = new ApifyClient({ token: process.env.APIFY_API_TOKEN })
        try {
          return await scrapeShopifyViaApify(clientForGeo, url)
        } catch (geoErr) {
          console.warn(`[apify] Geo-pricing retry failed for ${url}: ${geoErr instanceof Error ? geoErr.message : String(geoErr)} — using FX result`)
          return shopifyResult
        }
      }
      return shopifyResult
    } catch (err) {
      console.log(`[apify] Shopify API not available for ${url}: ${err instanceof Error ? err.message : String(err)} — falling through to web-scraper`)
    }
  }

  // Protein Works: curl subprocess bypasses Cloudflare TLS fingerprinting that blocks Node.js fetch.
  if (url.includes('theproteinworks.com')) {
    try {
      return await scrapeWithCurl(url)
    } catch (err) {
      console.log(`[apify] curl scrape failed for ${url}: ${err instanceof Error ? err.message : String(err)} — falling through to web-scraper`)
    }
  }

  // Holland & Barrett: curl bypasses Cloudflare TLS fingerprinting (same approach as Protein Works)
  if (url.includes('hollandandbarrett.com')) {
    try {
      return await scrapeWithCurl(url)
    } catch (err) {
      console.log(`[apify] H&B curl failed for ${url}: ${err instanceof Error ? err.message : String(err)} — trying web-scraper`)
    }
  }

  // Huel: subscription price (£45) is client-side only and can't be scraped.
  // Falls through to scrapeHtml which extracts the one-time price (£61) from the RSC payload.
  // Manual price entry is used to override with the correct subscription price.
  if (url.includes('huel.com')) {
    try {
      return await scrapeHtml(url)
    } catch (err) {
      console.log(`[apify] HTML scrape failed for ${url}: ${err instanceof Error ? err.message : String(err)} — falling through to web-scraper`)
    }
  }

  if (!process.env.APIFY_API_TOKEN) {
    console.log(`[apify] No APIFY_API_TOKEN — mock for: ${url}`)
    return mockScrape(url)
  }

  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN })

  // AG1: drinkag1.com uses Vercel Security Checkpoint which actively blocks headless browsers.
  // Confirmed unfixable via Apify — skipped to avoid wasting credits. Set price manually in UI.
  if (url.includes('drinkag1.com')) {
    console.log(`[apify] AG1 skipped — Vercel bot protection blocks all automated access`)
    return mockScrape(url)
  }

  // Amazon: puppeteer-scraper primary (respects ?th= variant params → correct price),
  // junglee as fallback (may return wrong variant price but better than nothing)
  if (url.includes("amazon.")) {
    const country = amazonCountry(url)
    try {
      return await scrapeAmazonPuppeteer(client, url, country)
    } catch (puppeteerErr) {
      console.warn(`[apify] Amazon puppeteer failed for ${url}: ${puppeteerErr instanceof Error ? puppeteerErr.message : String(puppeteerErr)} — trying junglee fallback`)
      try {
        return await scrapeAmazonJunglee(client, url)
      } catch (jungleeErr) {
        console.error(`[apify] Amazon junglee also failed for ${url}:`, jungleeErr instanceof Error ? jungleeErr.message : String(jungleeErr))
        return mockScrape(url)
      }
    }
  }

  // puppeteer-scraper runs the pageFunction in Node.js context — document/window not available.
  // Our PAGE_FUNCTION uses native DOM APIs so must run under web-scraper (browser context).
  // Cloudflare-protected sites get residential proxy + stealth via web-scraper instead.
  const needsResidential = /myprotein\.|theproteinworks\.com|gainsnutrition\.|decathlon\.|tesco\.com|vavaverve\.com|innosupps\.com|aobnutrition\.co\.uk|uk\.huel\.com|welleco\.co\.uk|drinkag1\.com|risesupp\.com|hollandandbarrett\.com/.test(url)
  const needsPuppeteer = false
  const proxyConfiguration = needsResidential
    ? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] }
    : { useApifyProxy: true }

  console.log(`[apify] Proxy: ${needsResidential ? "RESIDENTIAL" : "datacenter"} for ${url}`)

  try {
    const actorId = needsPuppeteer ? "apify/puppeteer-scraper" : "apify/web-scraper"
    const actorInput = needsPuppeteer
      ? {
          startUrls: [{ url }],
          pageFunction: PAGE_FUNCTION,
          maxRequestsPerCrawl: 1,
          pageLoadTimeoutSecs: 120,
          proxyConfiguration,
          launchPuppeteerOptions: { stealth: true, useChrome: true },
        }
      : {
          startUrls: [{ url }],
          pageFunction: PAGE_FUNCTION,
          maxRequestsPerCrawl: 1,
          navigationTimeoutSecs: 90,
          proxyConfiguration,
          stealth: true,
          useChrome: true,
        }

    const run = await client.actor(actorId).call(actorInput, { waitSecs: 300, memory: 1024 })

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    const item = items[0] as Record<string, unknown> | undefined

    console.log(`[apify] Result for ${url}:`, JSON.stringify({
      price: item?.price ?? null,
      currency: item?.currency ?? null,
      inStock: item?.inStock ?? null,
      extractedBy: item?.extractedBy ?? null,
      error: item?.error ?? null,
    }))

    if (!item || item.price == null) {
      console.warn(`[apify] No price for ${url} (extractedBy=${item?.extractedBy ?? "none"}, error=${item?.error ?? "empty result"}) — falling back to mock`)
      return mockScrape(url)
    }

    return {
      price: Number(item.price),
      currency: String(item.currency ?? "EUR"),
      productName: String(item.productName ?? ""),
      inStock: Boolean(item.inStock ?? true),
      url,
    }
  } catch (err) {
    console.error(`[apify] Actor failed for ${url}:`, err instanceof Error ? err.message : String(err))
    return mockScrape(url)
  }
}
