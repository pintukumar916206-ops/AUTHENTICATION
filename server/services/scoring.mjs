const SCORING_WEIGHTS = {
  priceRisk: 0.35,
  sellerRisk: 0.25,
  domainRisk: 0.2,
  metadataRisk: 0.1,
  reviewRisk: 0.1,
};

const SIGNAL_LABELS = {
  priceRisk: "Price Variance Analysis",
  sellerRisk: "Merchant Reputation Forensic",
  domainRisk: "Domain Structural Audit",
  metadataRisk: "Metadata Integrity Check",
  reviewRisk: "Review Authenticity Scan",
};

export function calculateForensicTrust(features = {}) {
  const breakdown = [];
  let totalScore = 100;
  let dataPointsCaptured = 0;
  const totalSignals = Object.keys(SCORING_WEIGHTS).length;

  Object.keys(SCORING_WEIGHTS).forEach((key) => {
    const risk = features[key] || 0;
    const weight = SCORING_WEIGHTS[key];

    if (features[key] !== undefined) dataPointsCaptured++;

    const maxPenalty = weight * 100;
    const actualPenalty = Math.round(risk * maxPenalty);

    breakdown.push({
      signal: key,
      label: SIGNAL_LABELS[key],
      weight: weight,
      risk: Math.round(risk * 100),
      deduction: actualPenalty,
      status: risk > 0.7 ? "FAIL" : risk > 0.2 ? "WARNING" : "PASS",
    });

    if (actualPenalty > 0) {
      totalScore -= actualPenalty;
    }
  });

  const confidence = Math.round((dataPointsCaptured / totalSignals) * 100);
  const finalScore = Math.min(100, Math.max(0, totalScore));

  let verdict = "GENUINE";
  if (confidence < 50) {
    verdict = "UNVERIFIABLE";
  } else if (finalScore < 50) {
    verdict = "FAKE";
  } else if (finalScore < 80) {
    verdict = "SUSPICIOUS";
  }

  return {
    score: finalScore,
    confidence,
    breakdown,
    verdict,
    formula: "S = 100 - Σ(Ri * Wi)",
    signals_processed: dataPointsCaptured,
    is_reliable: confidence >= 50,
  };
}
