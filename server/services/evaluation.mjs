import { buildFeatures } from "./featureBuilder.mjs";
import { computeRiskScore, generateProof, getTrustScore, getVerdict } from "./scoring.mjs";

const CLASSES = ["GENUINE", "SUSPICIOUS", "FAKE", "UNVERIFIABLE"];

export function classifyProduct(product) {
  const features = buildFeatures(product);
  const riskScore = computeRiskScore(features);
  const confidence = features.dataConfidence;

  return {
    verdict: getVerdict(riskScore, confidence),
    score: getTrustScore(riskScore, confidence),
    confidence,
    riskScore,
    proof: generateProof(features),
  };
}

function emptyClassStats() {
  return Object.fromEntries(CLASSES.map((name) => [
    name,
    { truePositive: 0, falsePositive: 0, falseNegative: 0, precision: 0, recall: 0 },
  ]));
}

export function evaluateListings(rows) {
  const classStats = emptyClassStats();
  const predictions = rows.map((row) => ({
    id: row.id,
    expected: row.label,
    predicted: classifyProduct(row.product).verdict,
  }));

  for (const item of predictions) {
    for (const name of CLASSES) {
      if (item.expected === name && item.predicted === name) classStats[name].truePositive += 1;
      if (item.expected !== name && item.predicted === name) classStats[name].falsePositive += 1;
      if (item.expected === name && item.predicted !== name) classStats[name].falseNegative += 1;
    }
  }

  for (const stats of Object.values(classStats)) {
    const precisionDenominator = stats.truePositive + stats.falsePositive;
    const recallDenominator = stats.truePositive + stats.falseNegative;
    stats.precision = precisionDenominator ? stats.truePositive / precisionDenominator : 0;
    stats.recall = recallDenominator ? stats.truePositive / recallDenominator : 0;
  }

  const correct = predictions.filter((item) => item.expected === item.predicted).length;
  const accuracy = rows.length ? correct / rows.length : 0;
  const unsafeRows = predictions.filter((item) => ["SUSPICIOUS", "FAKE"].includes(item.expected));
  const unsafeCaught = unsafeRows.filter((item) => ["SUSPICIOUS", "FAKE"].includes(item.predicted)).length;
  const unsafeRecall = unsafeRows.length ? unsafeCaught / unsafeRows.length : 0;

  return {
    total: rows.length,
    correct,
    accuracy,
    unsafeRecall,
    classStats,
    predictions,
  };
}

export function assertEvaluationGate(metrics, gate = {}) {
  const minAccuracy = gate.minAccuracy ?? 0.8;
  const minUnsafeRecall = gate.minUnsafeRecall ?? 0.95;
  const failures = [];

  if (metrics.accuracy < minAccuracy) {
    failures.push(`accuracy ${metrics.accuracy.toFixed(3)} < ${minAccuracy}`);
  }

  if (metrics.unsafeRecall < minUnsafeRecall) {
    failures.push(`unsafe recall ${metrics.unsafeRecall.toFixed(3)} < ${minUnsafeRecall}`);
  }

  return { ok: failures.length === 0, failures };
}
