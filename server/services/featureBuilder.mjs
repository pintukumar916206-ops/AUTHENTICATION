const MARKET_REFERENCES = {
  shoes: {
    min: 1200,
    avg: 6000,
    max: 45000,
    brands: ["nike", "adidas", "puma", "jordan"],
  },
  electronics: {
    min: 1000,
    avg: 25000,
    max: 300000,
    brands: ["apple", "samsung", "sony", "bose", "nothing"],
  },
  clothing: {
    min: 300,
    avg: 1500,
    max: 25000,
    brands: ["zara", "h&m", "levi", "uniqlo"],
  },
  default: {
    min: 100,
    avg: 2000,
    max: 50000,
    brands: [],
  },
};

const TRUSTED_SELLERS = /amazon|flipkart|retail|official|authorized|genuine|cloudtail|appario/i;
const TRUSTED_HOSTS = /amazon\.|flipkart\.|myntra\.|nykaa\.|meesho\.|ajio\.|walmart\.|bestbuy\.|target\./i;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function detectCategory(title = "") {
  const value = title.toLowerCase();
  if (/shoe|sneaker|boot|sandal|jordan|nike|adidas|puma/.test(value)) return "shoes";
  if (/iphone|phone|macbook|laptop|earbud|headphone|watch|camera|sony|bose|nothing/.test(value)) return "electronics";
  if (/shirt|jean|jacket|dress|hoodie|kurta|saree|zara|h&m|levi/.test(value)) return "clothing";
  return "default";
}

function getDiscount(data) {
  if (Number.isFinite(data.discount) && data.discount > 0) return data.discount;
  if (data.price > 0 && data.originalPrice > data.price) {
    return Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100);
  }
  return 0;
}

function buildConfidence(data, discount) {
  let penalty = 0;
  if (!data.title) penalty += 0.28;
  if (!data.price) penalty += 0.32;
  if (!data.sellerName) penalty += 0.16;
  if (!data.description) penalty += 0.08;
  if (!data.rating && !data.reviewCount) penalty += 0.08;
  if (discount > 80) penalty += 0.08;

  const computed = clamp(1 - penalty);
  const capture = data.forensicConfidence === undefined
    ? 1
    : clamp(Number(data.forensicConfidence));

  return Math.round(Math.min(computed, capture) * 100);
}

function addPriceSignals(data, ref, anomalies) {
  const price = Number(data.price || 0);
  const avgPrice = Number(data.market_baseline || ref.avg);
  let priceRisk = 0;

  if (price <= 0) {
    anomalies.push({
      type: "PRICE_MISSING",
      detail: "No reliable sale price was captured",
    });
    return 0.55;
  }

  if (price < ref.min * 0.4) {
    priceRisk = 0.95;
    anomalies.push({
      type: "PRICE_ABYSS",
      detail: "Price is more than 60% below the sustainable market floor",
    });
  } else if (price < avgPrice * 0.6) {
    priceRisk = 0.6;
    anomalies.push({
      type: "PRICE_DEVIATION",
      detail: `${Math.round((1 - price / avgPrice) * 100)}% lower than market average (INR ${avgPrice})`,
    });
  }

  if (price > ref.max * 1.35) {
    priceRisk = Math.max(priceRisk, 0.45);
    anomalies.push({
      type: "PRICE_OUTLIER",
      detail: "Price is far above the category range and needs manual review",
    });
  }

  return priceRisk;
}

function addSellerSignals(data, anomalies) {
  const seller = String(data.sellerName || "");
  const hostname = String(data.hostname || "");
  const trusted = TRUSTED_SELLERS.test(seller) || TRUSTED_HOSTS.test(hostname);

  if (!seller) {
    anomalies.push({
      type: "HIDDEN_SELLER",
      detail: "Seller identity is missing from the captured listing",
    });
    return TRUSTED_HOSTS.test(hostname) ? 0.45 : 0.8;
  }

  if (trusted) return 0.1;

  if (data.sellerRating > 0 && data.sellerRating < 3) {
    anomalies.push({
      type: "SELLER_RISK",
      detail: `Seller rating ${data.sellerRating}/5 is below the trust threshold`,
    });
    return 0.9;
  }

  anomalies.push({
    type: "SELLER_UNVERIFIED",
    detail: "Seller does not match trusted or authorized seller signals",
  });
  return 0.55;
}

function addReviewSignals(data, anomalies) {
  const rating = Number(data.rating || 0);
  const reviewCount = Number(data.reviewCount || 0);

  if (!rating && !reviewCount) {
    anomalies.push({
      type: "REVIEW_MISSING",
      detail: "No usable review signal was captured",
    });
    return 0.45;
  }

  if (rating >= 4.7 && reviewCount < 25) {
    anomalies.push({
      type: "REVIEW_ANOMALY",
      detail: "Very high rating with too little review depth",
    });
    return 0.8;
  }

  if (reviewCount > 1000 && rating < 3.5) {
    anomalies.push({
      type: "REVIEW_ANOMALY",
      detail: "Large review volume with weak buyer satisfaction",
    });
    return 0.6;
  }

  return 0.2;
}

function addDomainSignals(data, anomalies) {
  const hostname = data.hostname || "";
  // In a real app, you'd use a WHOIS API here.
  // We'll simulate risk based on non-standard TLDs or suspicious patterns.
  if (/\.(icu|top|xyz|biz|loan|date|click)$/.test(hostname)) {
    anomalies.push({
      type: "FRESH_DOMAIN",
      detail: `Storefront is hosted on a high-risk TLD (${hostname.split('.').pop()})`
    });
    return 0.75;
  }
  return 0.15;
}

function addMetadataSignals(data, anomalies) {
  let risk = 0.2;
  if (!data.description || data.description.length < 50) {
    risk += 0.3;
    anomalies.push({
      type: "METADATA_INCOMPLETE",
      detail: "Insufficient product documentation or description"
    });
  }
  return risk;
}

export function buildFeatures(input = {}) {
  const data = {
    ...input,
    title: String(input.title || "").trim(),
    sellerName: String(input.sellerName || "").trim(),
    description: String(input.description || "").trim(),
    hostname: String(input.hostname || "").trim().toLowerCase(),
    price: Number(input.price || 0),
    originalPrice: Number(input.originalPrice || 0),
    discount: Number(input.discount || 0),
    rating: Number(input.rating || 0),
    reviewCount: Number(input.reviewCount || 0),
    sellerRating: Number(input.sellerRating || 0),
  };

  const category = detectCategory(data.title);
  const ref = MARKET_REFERENCES[category] || MARKET_REFERENCES.default;
  const anomalies = [];
  const discount = getDiscount(data);

  let priceRisk = addPriceSignals(data, ref, anomalies);
  if (discount > 75) {
    priceRisk = Math.min(1, priceRisk + 0.4);
    anomalies.push({
      type: "EXTREME_DISCOUNT",
      detail: `${discount}% discount is a typical counterfeit lure`,
    });
  }

  return {
    category,
    priceRisk: clamp(priceRisk),
    sellerRisk: clamp(addSellerSignals(data, anomalies)),
    reviewRisk: clamp(addReviewSignals(data, anomalies)),
    domainRisk: clamp(addDomainSignals(data, anomalies)),
    metadataRisk: clamp(addMetadataSignals(data, anomalies)),
    discountValue: discount,
    anomalies,
    dataConfidence: buildConfidence(data, discount),
    raw: data,
  };
}
