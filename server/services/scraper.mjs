import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { devices } from "playwright";
import * as cheerio from "cheerio";
import { config } from "./config.mjs";
import { validateScanUrl } from "./urlSafety.mjs";

chromium.use(StealthPlugin());

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
      console.warn(`[PROXY-MATRIX] Quarantining unreliable proxy for 5 minutes...`);
      proxyObj.quarantinedUntil = Date.now() + 300000; // 5 min
      proxyObj.failures = 0;
    }
  }

  recordSuccess(proxyObj) {
    if (!proxyObj) return;
    proxyObj.failures = 0;
  }
}

const proxyMatrix = new ProxyMatrix(config.proxyList);

function getRandomDevice() {
  const deviceList = Object.values(devices);
  return deviceList[Math.floor(Math.random() * deviceList.length)];
}

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

  if (_browser && _requestCount > 50) {
    console.log("[SCRAPER] Rotating browser instance...");
    await _browser.close().catch(() => {});
    _browser = null;
    _requestCount = 0;
  }

  if (!_browser) {
    _browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
  }
  
  _requestCount++;
  return _browser;
}


export async function cleanup() {
  if (_browser) {
    console.log("[SCRAPER] Closing active browser singleton...");
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

async function fastCrossCheck(title) {
  try {
    if (!title || title.length < 5) return { status: 'failed' };
    const query = encodeURIComponent(`buy ${title} online price`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return { status: 'failed' };
    const html = await res.text();
    const $ = cheerio.load(html);
    const prices = [];
    $('.result__snippet').each((_, el) => {
      const text = $(el).text();
      const match = text.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
      if (match) {
        const p = parseFloat(match[1].replace(/[^\d.]/g, ''));
        if (!isNaN(p) && p > 0) prices.push(p);
      }
    });
    
    if (prices.length > 0) {
      prices.sort((a,b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      return { status: 'success', market_baseline: median };
    }
  } catch {
    return { status: 'timeout' };
  }
  return { status: 'no_data' };
}



async function extractStructuredData(page) {
  try {
    return await page.evaluate(() => {
      const data = { jsonld: null, meta: {} };
      
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        try {
          const json = JSON.parse(s.textContent);
          // Handle both single objects and @graph arrays
          const finds = Array.isArray(json) ? json : (json['@graph'] || [json]);
          const product = finds.find(g => g['@type'] === 'Product' || g['@type']?.includes('Product'));
          if (product) {
            data.jsonld = product;
            break;
          }
        } catch { }
      }

      const metaTags = document.querySelectorAll('meta[property^="og:"], meta[name="description"], meta[property^="product:"]');
      metaTags.forEach(m => {
        const prop = m.getAttribute('property') || m.getAttribute('name');
        data.meta[prop] = m.getAttribute('content');
      });

      return data;
    });
  } catch {
    return { jsonld: null, meta: {} };
  }
}

async function semanticHeuristicRecovery(page) {
  return await page.evaluate(() => {
    const findTitle = () => {
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent.trim().length > 5) return h1.textContent.trim();
      return "";
    };

    const findPrice = () => {
      const regex = /[₹$¥£€]\s?\d+([.,]\d{2})?/;
      const elements = Array.from(document.querySelectorAll('span, div, b, p, strong'))
        .filter(el => el.children.length === 0 && regex.test(el.textContent));
      
      elements.sort((a, b) => {
        const aSize = parseFloat(window.getComputedStyle(a).fontSize);
        const bSize = parseFloat(window.getComputedStyle(b).fontSize);
        return bSize - aSize;
      });

      return elements[0] ? elements[0].textContent.trim() : "";
    };

    return { title: findTitle(), price: findPrice() };
  });
}

class NetworkForensics {
  constructor() {
    this.traffic = [];
    this.interestingKeywords = ['price', 'stock', 'inventory', 'offeredPrice', 'seller', 'deal', 'product'];
  }

  async attach(page) {
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const type = response.request().resourceType();
        
        if (type === 'fetch' || type === 'xhr') {
          const isInteresting = this.interestingKeywords.some(k => url.toLowerCase().includes(k));
          if (isInteresting) {
            const data = await response.json().catch(() => null);
            if (data) {
              this.traffic.push({ url, data, timestamp: new Date() });
            }
          }
        }
      } catch {
        // Silently skip failed captures (binary data, non-JSON, etc)
      }
    });
  }

  getCapturedIntelligence() {
    return this.traffic;
  }
}

async function simulateHumanActivity(page) {
  try {
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(Math.random() * 800, Math.random() * 600, { steps: 10 });
      await page.waitForTimeout(200 + Math.random() * 300);
    }
    
    await page.mouse.wheel(0, 500 + Math.random() * 500);
    await page.waitForTimeout(800 + Math.random() * 1200);
    await page.mouse.wheel(0, -(200 + Math.random() * 200)); 
    
    await page.evaluate(() => {
      window.scrollTo({ 
        top: document.body.scrollHeight / (2 + Math.random()), 
        behavior: 'smooth' 
      });
    });
    await page.waitForTimeout(1000 + Math.random() * 1000);
  } catch (err) {
    console.warn("[STEALTH-WARN] Activity simulation partially failed:", err.message);
  }
}
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastError = e;
      console.warn(`[SCRAPER] Attempt ${i + 1} Failed: ${e.message}`);
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastError;
}

export async function scrapeProduct(targetUrl, onProgress = () => {}) {
  const safeUrl = await validateScanUrl(targetUrl);
  if (!safeUrl.ok) {
    onProgress(`URL_REJECTED_${safeUrl.reason}`);
    return null;
  }

  onProgress("INITIALIZING_FORENSIC_INSTANCE");
  return await withRetry(async (attempt) => {
    onProgress(`CAPTURING_ISOLATED_BROWSER (Attempt ${attempt + 1})`);
    const proxyObj = proxyMatrix.getNext();
    const browser = await getBrowser(proxyObj);
    const device = getRandomDevice();
    
    const context = await browser.newContext({
      ...device,
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata'
    });

    const page = await context.newPage();
    const forensicTools = new NetworkForensics();
    await forensicTools.attach(page);

    await page.route('**/*.{png,jpg,jpeg,gif,svg,font,mp4,webm}', (route) => route.abort());

    try {
      onProgress("INSTRUMENTING_NETWORK_XHR");
      console.log(`[SCRAPER] Deep Scrutiny [Attempt ${attempt + 1}]: ${safeUrl.url}...`);
      
      const response = await page.goto(safeUrl.url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });

      await Promise.race([
        page.waitForLoadState('networkidle').catch(() => {}),
        new Promise(r => setTimeout(r, 7000))
      ]);

      if (!response || !response.ok()) {
        throw new Error(`HTTP ${response?.status() || 'Unknown'}`);
      }

      onProgress("SIMULATING_BEHAVIORAL_TRACES");
      await simulateHumanActivity(page);

      const content = (await page.content()).toLowerCase();
      if (['verify you are human', 'access denied'].some(s => content.includes(s))) {
        console.warn("[SCRAPER] Bot detection triggered. Trying to recover data anyway...");
      }
      const data = await getAdapter(safeUrl.url)(page);
      const trafficIntelligence = forensicTools.getCapturedIntelligence();
      
      let confidence = 1.0;
      const sourcesUsed = ["ADAPTER"];

      if (!data.title || data.price === 0) {
        confidence -= 0.3;
        onProgress("RECOVERY_PROTOCOL_ACTIVE");
        const structured = await extractStructuredData(page);
        
        if (structured.jsonld) {
          const ld = structured.jsonld;
          if (!data.title && ld.name) {
            data.title = ld.name;
            sourcesUsed.push("JSONLD_TITLE");
          }
          if (data.price === 0) {
            const price = ld.offers?.price || ld.offers?.[0]?.price;
            if (price) {
              data.price = parseFloat(price);
              sourcesUsed.push("JSONLD_PRICE");
            }
          }
        }

        if (!data.title || data.price === 0) {
          confidence -= 0.2;
          const semantic = await semanticHeuristicRecovery(page);
          if (!data.title && semantic.title) {
            data.title = semantic.title;
            sourcesUsed.push("SEMANTIC_TITLE");
          }
          if (data.price === 0 && semantic.price) {
            data.price = parseFloat(semantic.price.replace(/[^0-9.]/g, ""));
            sourcesUsed.push("SEMANTIC_PRICE");
          }
        }
      }

      let market_baseline = null;
      if (data.title) {
        onProgress("CROSS_CHECKING_MARKET_BASELINE");
        const cross = await fastCrossCheck(data.title.substring(0, 60)); // limit length
        if (cross.status === 'success') {
          market_baseline = cross.market_baseline;
          sourcesUsed.push("CROSS_CHECK_PROXY");
        }
      }

      console.log(`[SCRAPER] Forensic Data Captured | Sources: ${sourcesUsed.join(', ')}`);
      const hostname = new URL(safeUrl.url).hostname;
      const image = await getFirstWorkingLocator(page, ['meta[property="og:image"]']);
      
      proxyMatrix.recordSuccess(proxyObj);
      await context.close();
      if (proxyObj) await browser.close(); 
      
      return { 
        ...data, 
        hostname, 
        image,
        trafficIntelligence,
        forensicConfidence: Math.max(0, confidence),
        sourcesUsed,
        market_baseline
      };
    } catch (err) {
      if (err.message && err.message.includes('ERR_PROXY_CONNECTION_FAILED')) {
        proxyMatrix.recordFailure(proxyObj);
      }
      await context.close().catch(() => {});
      if (proxyObj) await browser.close().catch(() => {});
      console.error(`[SCRAPER] Execution Error: ${err.message}`);
      throw err;
    }
  }).catch((err) => {
    console.error(`[SCRAPER] Fatal Scrutiny Failure: ${err?.message || "Unknown error"}`);
    return null;
  });
}

const adapters = {
  amazon: async (page) => {
    const raw = {
      title: await getFirstWorkingLocator(page, ['#productTitle', 'h1', '#title', 'meta[property="og:title"]']),
      price: await getPrice(page, ['.a-price-whole', '#priceblock_ourprice', '#corePrice_feature_div .a-price', '.a-offscreen', 'span.a-color-price', 'meta[property="product:price:amount"]']),
      originalPrice: await getPrice(page, ['.a-price.a-text-price .a-offscreen', '#priceblock_saleprice', '.basisPrice .a-offscreen', 'span[data-a-strike="true"]']),
      discount: await getNumber(page, ['.savingsPercentage', 'text=/off/i', '#regularprice_savings td.a-span12']),
      rating: await getNumber(page, ['span[data-hook="rating-out-of-five"]', '.a-icon-alt', '#acrPopover']),
      reviewCount: await getNumber(page, ['#acrCustomerReviewText', 'span[data-hook="total-review-count"]']),
      sellerName: await getFirstWorkingLocator(page, ['#sellerProfileTriggerId', '#merchant-info a', 'text=/Sold by/i', '#tabular-buybox-truncate-1 .a-truncate-cut']),
      sellerRating: await getNumber(page, ['#sellerProfileTriggerId', '.a-popover-trigger']),
      availability: await getFirstWorkingLocator(page, ['#availability span', '#outOfStock', '#availability_feature_div', 'text=/In Stock|Out of Stock|Currently unavailable/i']),
      description: await getFirstWorkingLocator(page, ['#productDescription p', '#feature-bullets li', 'meta[name="description"]']),
    };
    return normalizeFields(raw);
  },

  flipkart: async (page) => {
    const raw = {
      title: await getFirstWorkingLocator(page, ['.B_NuCI', '.yRaY8j', 'h1', '.VU-ZEz', 'meta[property="og:title"]']),
      price: await getPrice(page, ['._30jeq3._16Jk6d', '._3I9_wc._27UcVY', '.Nx9bqj', 'div[class*="price"]', 'meta[property="product:price:amount"]']),
      originalPrice: await getPrice(page, ['._3I9_wc._2p6lqe', '._1vC4OE._3qQ9m1', '.yRaY8j', 'del', 'strike']),
      discount: await getNumber(page, ['._3Ay6Sb._31Dcoz span', '.UkUFwK', 'text=/off/i']),
      rating: await getNumber(page, ['._3LWZlK', 'div[class*="rating"]', 'text=/stars/i']),
      reviewCount: await getNumber(page, ['._2_R_DZ', 'span[class*="rating"]', 'text=/ratings/i']),
      sellerName: await getFirstWorkingLocator(page, ['#sellerName', '.WS7PLh', 'a[class*="seller"]', 'text=/Seller/i']),
      sellerRating: await getNumber(page, ['._3LWZlK', 'text=/seller rating/i']),
      availability: await getFirstWorkingLocator(page, ['._16FRp0', '.fDVbwz', 'text=/In Stock|Out of Stock|Coming Soon/i']),
      description: await getFirstWorkingLocator(page, ['._1AN87F li', 'div[class*="description"]', 'meta[name="description"]']),
    };
    return normalizeFields(raw);
  },

  myntra: async (page) => {
    const raw = {
      title: await getFirstWorkingLocator(page, ['.pdp-name', '.pdp-title', 'h1', 'meta[property="og:title"]']),
      price: await getPrice(page, ['.pdp-price strong', '.pdp-discounted-price', 'meta[property="product:price:amount"]']),
      originalPrice: await getPrice(page, ['.pdp-mrp s', '.pdp-price .original-price', 'strike']),
      discount: await getNumber(page, ['.pdp-discount', 'text=/% OFF/i']),
      rating: await getNumber(page, ['.index-overallRating', 'text=/stars/i']),
      reviewCount: await getNumber(page, ['.index-ratingsCount', 'text=/ratings/i']),
      sellerName: await getFirstWorkingLocator(page, ['.pdp-seller-info-name', '.seller-name', 'text=/Sold by/i', 'text=/Seller/i']),
      sellerRating: 0,
      availability: await getFirstWorkingLocator(page, ['text=/In Stock|Out of Stock|Sold Out/i', '.size-buttons-unified-size-button']),
      description: await getFirstWorkingLocator(page, ['.pdp-product-description-content p', 'meta[name="description"]']),
    };
    return normalizeFields(raw);
  },

  nykaa: async (page) => {
    const raw = {
      title: await getFirstWorkingLocator(page, ['.css-1n97m7s', 'h1', 'meta[property="og:title"]']),
      price: await getPrice(page, ['.css-11z7iy0', 'meta[property="product:price:amount"]']),
      originalPrice: await getPrice(page, ['.css-1lpe5oo', 'strike', '.css-17jf0z7']),
      discount: await getNumber(page, ['text=/% off/i', '.css-1qkpfbs']),
      rating: await getNumber(page, ['.css-16986er']),
      reviewCount: await getNumber(page, ['.css-1o8g3k7']),
      sellerName: await getFirstWorkingLocator(page, ['text=/Sold by/i', '.css-1n97m7s']),
      sellerRating: 0,
      availability: await getFirstWorkingLocator(page, ['text=/In Stock|Out of Stock/i']),
      description: await getFirstWorkingLocator(page, ['meta[name="description"]', '.css-sc7iy8 p']),
    };
    return normalizeFields(raw);
  },

  meesho: async (page) => {
    const raw = {
      title: await getFirstWorkingLocator(page, ['h3', 'h4', 'meta[property="og:title"]']),
      price: await getPrice(page, ['h4', 'text=/₹/i', 'meta[property="product:price:amount"]']),
      originalPrice: await getPrice(page, ['strike', 'del', 's']),
      discount: await getNumber(page, ['text=/% off/i']),
      rating: await getNumber(page, ['text=/rating/i']),
      reviewCount: await getNumber(page, ['text=/ratings/i']),
      sellerName: await getFirstWorkingLocator(page, ['text=/Sold by/i', 'text=/Supplier/i']),
      sellerRating: 0,
      availability: await getFirstWorkingLocator(page, ['text=/In Stock|Out of Stock/i']),
      description: await getFirstWorkingLocator(page, ['meta[name="description"]']),
    };
    return normalizeFields(raw);
  },

  ajio: async (page) => {
    const raw = {
      title: await getFirstWorkingLocator(page, ['.prod-name', 'h1', 'meta[property="og:title"]']),
      price: await getPrice(page, ['.prod-cp', 'meta[property="product:price:amount"]']),
      originalPrice: await getPrice(page, ['.prod-sp', 'del', 'strike']),
      discount: await getNumber(page, ['.prod-discount', 'text=/% off/i']),
      rating: await getNumber(page, ['.facet-rating']),
      reviewCount: await getNumber(page, ['text=/reviews/i']),
      sellerName: await getFirstWorkingLocator(page, ['text=/Sold by/i', '.seller-name']),
      sellerRating: 0,
      availability: await getFirstWorkingLocator(page, ['text=/In Stock|Out of Stock/i']),
      description: await getFirstWorkingLocator(page, ['meta[name="description"]', '.prod-desc p']),
    };
    return normalizeFields(raw);
  },

  generic: async (page) => {
    const raw = {
      title: await getFirstWorkingLocator(page, ['[itemprop="name"]', 'h1', 'meta[property="og:title"]', '.product-name', '.title']),
      price: await getPrice(page, ['[itemprop="price"]', '[class*="price"]', '[id*="price"]', 'meta[property="product:price:amount"]']),
      originalPrice: await getPrice(page, ['[class*="original"]', '[class*="mrp"]', 'strike', 'del', 's']),
      discount: await getNumber(page, ['[class*="discount"]', 'text=/% off/i']),
      rating: await getNumber(page, ['[itemprop="ratingValue"]', '[class*="rating"]']),
      reviewCount: await getNumber(page, ['[itemprop="reviewCount"]', '[class*="review-count"]', 'text=/reviews/i']),
      sellerName: await getFirstWorkingLocator(page, ['[itemprop="seller"]', '[class*="seller"]', 'text=/Sold by|Vendor:/i']),
      sellerRating: 0,
      availability: await getFirstWorkingLocator(page, ['[itemprop="availability"]', 'text=/In Stock|Out of Stock/i']),
      description: await getFirstWorkingLocator(page, ['[itemprop="description"]', 'meta[name="description"]', '.product-description']),
    };
    return normalizeFields(raw);
  }
};

function normalizeFields(raw) {
  return {
    title: raw.title || "",
    price: raw.price || 0,
    originalPrice: raw.originalPrice || 0,
    discount: raw.discount || 0,
    rating: raw.rating || 0,
    reviewCount: raw.reviewCount || raw.reviewsCount || 0,
    sellerName: raw.sellerName || raw.seller || "",
    sellerRating: raw.sellerRating || 0,
    availability: raw.availability || "",
    description: raw.description || "",
  };
}

function getAdapter(url) {
  if (url.includes('amazon')) return adapters.amazon;
  if (url.includes('flipkart')) return adapters.flipkart;
  if (url.includes('myntra')) return adapters.myntra;
  if (url.includes('nykaa')) return adapters.nykaa;
  if (url.includes('meesho')) return adapters.meesho;
  if (url.includes('ajio')) return adapters.ajio;
  return adapters.generic;
}

async function getFirstWorkingLocator(page, selectors) {
  for (const s of selectors) {
    try {
      const el = page.locator(s).first();
      if (await el.count() > 0) {
        const text = s.startsWith('meta') ? await el.getAttribute('content') : await el.textContent();
        if (text?.trim()) return text.trim();
      }
    } catch {}
  }
  return "";
}

async function getPrice(page, selectors) {
  const raw = await getFirstWorkingLocator(page, selectors);
  if (!raw) return 0;
  const price = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(price) ? 0 : price;
}

async function getNumber(page, selectors) {
  const raw = await getFirstWorkingLocator(page, selectors);
  if (!raw) return 0;
  const match = raw.match(/[\d,]+\.?\d*/);
  if (!match) return 0;
  const num = parseFloat(match[0].replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}
