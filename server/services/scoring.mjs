const SCORING_RULES = {
  PRICE_ABYSS: {
    deduction: 40,
    label: "Extreme Price Deviation",
    description: "Price is >60% below market average, a primary indicator of fraudulent listings."
  },
  PRICE_OUTLIER: {
    deduction: 20,
    label: "Price Inconsistency",
    description: "Significant deviation from average retail price patterns."
  },
  SELLER_UNVERIFIED: {
    deduction: 25,
    label: "Unverified Merchant",
    description: "Seller has no verified history or is using a fresh account with no track record."
  },
  FRESH_DOMAIN: {
    deduction: 35,
    label: "New Domain (Forensic)",
    description: "Storefront domain was registered in the last 90 days. High correlation with scams."
  },
  REVIEW_ANOMALY: {
    deduction: 15,
    label: "Suspicious Review Velocity",
    description: "Highly condensed review timestamps suggesting automated bot activity."
  },
  METADATA_INCOMPLETE: {
    deduction: 10,
    label: "Weak Metadata Integrity",
    description: "Crucial product identifiers (SKU, GTIN) are missing or obfuscated."
  }
};

export function calculateForensicTrust(features = {}) {
  let score = 100;
  const deductions = [];
  const confidenceDataPoints = new Set();

  // Price Logic
  if (features.priceRisk > 0.8) {
    deductions.push({ ...SCORING_RULES.PRICE_ABYSS, pts: SCORING_RULES.PRICE_ABYSS.deduction });
    score -= SCORING_RULES.PRICE_ABYSS.deduction;
  } else if (features.priceRisk > 0.4) {
    deductions.push({ ...SCORING_RULES.PRICE_OUTLIER, pts: SCORING_RULES.PRICE_OUTLIER.deduction });
    score -= SCORING_RULES.PRICE_OUTLIER.deduction;
  }
  if (features.priceRisk !== undefined) confidenceDataPoints.add("price");

  // Seller Logic
  if (features.sellerRisk > 0.6) {
    deductions.push({ ...SCORING_RULES.SELLER_UNVERIFIED, pts: SCORING_RULES.SELLER_UNVERIFIED.deduction });
    score -= SCORING_RULES.SELLER_UNVERIFIED.deduction;
  }
  if (features.sellerRisk !== undefined) confidenceDataPoints.add("seller");

  // Domain Logic
  if (features.domainRisk > 0.7) {
    deductions.push({ ...SCORING_RULES.FRESH_DOMAIN, pts: SCORING_RULES.FRESH_DOMAIN.deduction });
    score -= SCORING_RULES.FRESH_DOMAIN.deduction;
  }
  if (features.domainRisk !== undefined) confidenceDataPoints.add("domain");

  // Review Logic
  if (features.reviewRisk > 0.5) {
    deductions.push({ ...SCORING_RULES.REVIEW_ANOMALY, pts: SCORING_RULES.REVIEW_ANOMALY.deduction });
    score -= SCORING_RULES.REVIEW_ANOMALY.deduction;
  }
  if (features.reviewRisk !== undefined) confidenceDataPoints.add("reviews");

  // Metadata Logic
  if (features.metadataRisk > 0.5) {
    deductions.push({ ...SCORING_RULES.METADATA_INCOMPLETE, pts: SCORING_RULES.METADATA_INCOMPLETE.deduction });
    score -= SCORING_RULES.METADATA_INCOMPLETE.deduction;
  }

  // Calculate Confidence based on verified data sources
  const confidence = Math.round((confidenceDataPoints.size / 4) * 100);

  return {
    score: Math.max(0, score),
    confidence: Math.min(100, confidence),
    audit_trail: deductions,
    verdict: getVerdict(score)
  };
}

function getVerdict(score) {
  if (score >= 80) return "GENUINE";
  if (score >= 50) return "SUSPICIOUS";
  return "FAKE";
}

// Legacy support for older components
export function getTrustScore(riskScore) {
  return Math.round((1 - riskScore) * 100);
}
