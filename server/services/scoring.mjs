const WEIGHTS = {
  price: 0.4,
  seller: 0.35,
  review: 0.25,
};

const CRITICAL_SIGNALS = new Set(["PRICE_ABYSS", "EXTREME_DISCOUNT"]);
const MEDIUM_SIGNALS = new Set(["PRICE_OUTLIER", "REVIEW_MISSING", "SELLER_UNVERIFIED"]);

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

export function computeRiskScore(features = {}) {
  const rawRisk =
    (clamp(features.priceRisk) * WEIGHTS.price) +
    (clamp(features.sellerRisk) * WEIGHTS.seller) +
    (clamp(features.reviewRisk) * WEIGHTS.review);

  return clamp(rawRisk);
}

export function getVerdict(riskScore, confidence = 100) {
  if (confidence < 40) return "UNVERIFIABLE";
  if (riskScore >= 0.7) return "FAKE";
  if (riskScore >= 0.35) return "SUSPICIOUS";
  return "GENUINE";
}

export function getTrustScore(riskScore, confidence = 100) {
  const baseTrust = (1 - clamp(riskScore)) * 100;
  return Math.round(baseTrust * clamp(confidence / 100));
}

function getSeverity(type) {
  if (CRITICAL_SIGNALS.has(type)) return "CRITICAL";
  if (MEDIUM_SIGNALS.has(type)) return "MEDIUM";
  return "HIGH";
}

export function generateProof(features = {}) {
  const anomalies = Array.isArray(features.anomalies) ? features.anomalies : [];
  return anomalies.map((anomaly) => ({
    label: anomaly.type,
    detail: anomaly.detail,
    severity: getSeverity(anomaly.type),
  }));
}
