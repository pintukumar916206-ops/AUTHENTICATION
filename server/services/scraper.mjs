import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { devices } from "playwright";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { config } from "./config.mjs";
import { validateScanUrl } from "./urlSafety.mjs";

chromium.use(StealthPlugin());

// --- Scraper Adapter Pattern ---

class BaseScraperAdapter {
  constructor(page) {
    this.page = page;
  }

  async scrape() {
    throw new Error("Scrape method must be implemented");
  }

  async getFirstWorking(selectors) {
    for (const s of selectors) {
      try {
        const el = this.page.locator(s).first();
        if (await el.count() > 0) {
          const text = s.startsWith('meta') ? await el.getAttribute('content') : await el.textContent();
          if (text?.trim()) return text.trim();
        }
      } catch {}
    }
    return "";
  }

  async getPrice(selectors) {
    const raw = await this.getFirstWorking(selectors);
    if (!raw) return 0;
    const price = parseFloat(raw.replace(/[^0-9.]/g, ""));
    return isNaN(price) ? 0 : price;
  }

  async getNumber(selectors) {
    const raw = await this.getFirstWorking(selectors);
    if (!raw) return 0;
    const match = raw.match(/[\d,]+\.?\d*/);
    if (!match) return 0;
    const num = parseFloat(match[0].replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }

  normalize(raw) {
    return {
      title: raw.title || "",
      price: raw.price || 0,
      originalPrice: raw.originalPrice || 0,
      discount: raw.discount || 0,
      rating: raw.rating || 0,
      reviewCount: raw.reviewCount || 0,
      sellerName: raw.sellerName || "",
      sellerRating: raw.sellerRating || 0,
      availability: raw.availability || "",
      description: raw.description || "",
    };
  }
}

class AmazonAdapter extends BaseScraperAdapter {
  async scrape() {
    const raw = {
      title: await this.getFirstWorking(['#productTitle', 'h1', '#title']),
      price: await this.getPrice(['.a-price-whole', '#priceblock_ourprice', '.a-offscreen']),
      originalPrice: await this.getPrice(['.a-price.a-text-price .a-offscreen', 'span[data-a-strike="true"]']),
      discount: await this.getNumber(['.savingsPercentage', 'text=/off/i']),
      rating: await this.getNumber(['span[data-hook="rating-out-of-five"]', '.a-icon-alt']),
      reviewCount: await this.getNumber(['#acrCustomerReviewText', 'span[data-hook="total-review-count"]']),
      sellerName: await this.getFirstWorking(['#sellerProfileTriggerId', '#merchant-info a', 'text=/Sold by/i']),
      sellerRating: await this.getNumber(['#sellerProfileTriggerId']),
      availability: await this.getFirstWorking(['#availability span', 'text=/In Stock|Out of Stock/i']),
      description: await this.getFirstWorking(['#productDescription p', '#feature-bullets li']),
    };
    return this.normalize(raw);
  }
}

class GenericAdapter extends BaseScraperAdapter {
  async scrape() {
    const raw = {
      title: await this.getFirstWorking(['[itemprop="name"]', 'h1', 'meta[property="og:title"]']),
      price: await this.getPrice(['[itemprop="price"]', '[class*="price"]', 'meta[property="product:price:amount"]']),
      originalPrice: await this.getPrice(['[class*="original"]', 'strike', 'del']),
      discount: await this.getNumber(['[class*="discount"]', 'text=/% off/i']),
      rating: await this.getNumber(['[itemprop="ratingValue"]', '[class*="rating"]']),
      reviewCount: await this.getNumber(['[itemprop="reviewCount"]', 'text=/reviews/i']),
      sellerName: await this.getFirstWorking(['[itemprop="seller"]', 'text=/Sold by|Vendor:/i']),
      sellerRating: 0,
      availability: await this.getFirstWorking(['[itemprop="availability"]', 'text=/In Stock|Out of Stock/i']),
      description: await this.getFirstWorking(['[itemprop="description"]', 'meta[name="description"]']),
    };
    return this.normalize(raw);
  }
}

const SCRAPER_HEALTH = {
  amazon: { success: 0, fail: 0 },
  flipkart: { success: 0, fail: 0 },
  generic: { success: 0, fail: 0 }
};

async function logScraperFailure(page, platform) {
  try {
    const timestamp = Date.now();
    const logDir = path.join(process.cwd(), 'failure_logs');
    await fs.mkdir(logDir, { recursive: true });
    
    await page.screenshot({ path: path.join(logDir, `fail_${platform}_${timestamp}.png`) });
    const html = await page.content();
    await fs.writeFile(path.join(logDir, `fail_${platform}_${timestamp}.html`), html);
    console.error(`[FORENSIC-SCRAPER] Failure snapshot saved for ${platform}`);
  } catch (err) {
    console.error("[FORENSIC-SCRAPER] Failed to save failure snapshot:", err.message);
  }
}

// --- Scraper Core Logic ---

class ProxyMatrix {
  constructor(proxies) {
    this.proxies = proxies.map(p => ({ url: p, failures: 0, quarantinedUntil: 0 }));
    this.currentIndex = 0;
  }

  getNext() {
    if (this.proxies.length === 0) return null;
    let attempts = 0;
    while (attempts < this.proxies.length) {
      const p = this.proxies[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      if (p.quarantinedUntil < Date.now()) return p;
      attempts++;
    }
    return null;
  }

  recordFailure(proxyObj) {
    if (!proxyObj) return;
    proxyObj.failures += 1;
    if (proxyObj.failures >= 3) {
      proxyObj.quarantinedUntil = Date.now() + 300000;
      proxyObj.failures = 0;
    }
  }

  recordSuccess(proxyObj) {
    if (!proxyObj) return;
    proxyObj.failures = 0;
  }
}

const proxyMatrix = new ProxyMatrix(config.proxyList);

let _browser = null;
let _requestCount = 0;

async function getBrowser(proxyObj) {
  if (proxyObj && proxyObj.url) {
    return await chromium.launch({
      headless: true,
      proxy: { server: proxyObj.url },
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
  }

  if (!_browser || _requestCount > 50) {
    if (_browser) await _browser.close().catch(() => {});
    _browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    _requestCount = 0;
  }
  
  _requestCount++;
  return _browser;
}

export async function cleanup() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

function getAdapter(url, page) {
  if (url.includes('amazon')) return new AmazonAdapter(page);
  return new GenericAdapter(page);
}

export async function scrapeProduct(targetUrl, onProgress = () => {}) {
  const safeUrl = await validateScanUrl(targetUrl);
  if (!safeUrl.ok) return null;

  const platform = targetUrl.includes('amazon') ? 'amazon' : 'generic';

  return await withRetry(async (attempt) => {
    onProgress(`FORENSIC_CAPTURE_INIT (Attempt ${attempt + 1})`);
    const proxyObj = proxyMatrix.getNext();
    const browser = await getBrowser(proxyObj);
    const context = await browser.newContext({ ...devices['Desktop Chrome'], locale: 'en-IN' });
    const page = await context.newPage();

    try {
      await page.route('**/*.{png,jpg,jpeg,gif,svg,font,mp4,webm}', (route) => route.abort());
      await page.goto(safeUrl.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const adapter = getAdapter(safeUrl.url, page);
      const data = await adapter.scrape();

      if (!data.title) {
        await logScraperFailure(page, platform);
        SCRAPER_HEALTH[platform].fail++;
        throw new Error("DATA_CAPTURE_EMPTY");
      }

      SCRAPER_HEALTH[platform].success++;
      proxyMatrix.recordSuccess(proxyObj);
      await context.close();
      return { ...data, hostname: new URL(safeUrl.url).hostname, timestamp: new Date() };
    } catch (err) {
      proxyMatrix.recordFailure(proxyObj);
      await context.close().catch(() => {});
      throw err;
    }
  });
}

async function withRetry(fn, maxRetries = 2) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastError = e;
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastError;
}
