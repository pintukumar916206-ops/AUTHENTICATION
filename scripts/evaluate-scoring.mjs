import fs from "node:fs/promises";
import { assertEvaluationGate, evaluateListings } from "../server/services/evaluation.mjs";

const datasetUrl = new URL("../server/fixtures/scoring-evaluation.json", import.meta.url);
const dataset = JSON.parse(await fs.readFile(datasetUrl, "utf8"));
const metrics = evaluateListings(dataset);
const gate = assertEvaluationGate(metrics);

const pct = (value) => `${Math.round(value * 1000) / 10}%`;

console.log("Scoring evaluation");
console.log(`cases: ${metrics.total}`);
console.log(`accuracy: ${pct(metrics.accuracy)}`);
console.log(`unsafe recall: ${pct(metrics.unsafeRecall)}`);

for (const [name, stats] of Object.entries(metrics.classStats)) {
  console.log(`${name}: precision ${pct(stats.precision)}, recall ${pct(stats.recall)}`);
}

const misses = metrics.predictions.filter((item) => item.expected !== item.predicted);
if (misses.length) {
  console.log("misses:");
  for (const miss of misses) {
    console.log(`- ${miss.id}: expected ${miss.expected}, predicted ${miss.predicted}`);
  }
}

if (!gate.ok) {
  console.error(`Evaluation gate failed: ${gate.failures.join("; ")}`);
  process.exit(1);
}
