import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { buildFeatures } from "./featureBuilder.mjs";
import { calculateForensicTrust } from "./scoring.mjs";

let genAI;
export function getGenAI() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

const AI_SCHEMA = z.object({
  verdict: z.enum(["GENUINE", "SUSPICIOUS", "FAKE", "UNVERIFIABLE"]),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  evidence: z.array(z.string()),
  market_average: z.number().optional(),
  summary: z.string(),
});

async function runAIVerifier(product, features, heuristicVerdict) {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const payload = {
      title: product.title,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: features.discountValue,
      seller: product.sellerName,
      sellerRating: product.sellerRating,
      rating: product.rating,
      reviewCount: product.reviewCount,
      availability: product.availability,
      hostname: product.hostname,
      category: features.category,
    };

    const prompt = `Analyze this product listing and return ONLY valid JSON.

PRODUCT DATA:
${JSON.stringify(payload, null, 2)}

SYSTEM ALGORITHMIC VERDICT: ${heuristicVerdict}

INSTRUCTIONS:
You are the narrative support system. You must NOT contradict the SYSTEM ALGORITHMIC VERDICT if you are unsure. Provide 'reasons' explaining why the system arrived at "${heuristicVerdict}".

RESPOND WITH THIS EXACT JSON STRUCTURE (no markdown, no extra text):
{
  "verdict": "GENUINE" | "SUSPICIOUS" | "FAKE" | "UNVERIFIABLE",
  "confidence": 0.0-1.0,
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "evidence": ["evidence point 1", "evidence point 2"],
  "market_average": estimated_market_price_in_rupees,
  "summary": "Forensic summary"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = AI_SCHEMA.parse(parsed);

    if (validated.market_average && product.price > 0) {
      if (Math.abs(validated.market_average - product.price) > (product.price * 5)) {
        validated.market_average = undefined;
      }
    }

    if (validated.verdict !== heuristicVerdict && validated.confidence < 0.95) {
      console.warn(`[AI-VERIFIER] Overriding weak AI verdict (${validated.verdict}) with Deterministic logic (${heuristicVerdict})`);
      validated.verdict = heuristicVerdict;
      validated.reasons.push("Verdict adjusted by primary algorithmic engine due to low AI confidence.");
    }
    
    return validated;
  } catch (err) {
    console.error("[AI-VERIFIER] Fallback triggered:", err.message);
    const forensic = calculateForensicTrust(features);
    return {
      verdict: forensic.verdict,
      confidence: features.dataConfidence / 100,
      reasons: [
        "Verdict based on deterministic heuristic scoring engine.",
      ],
      evidence: [`Data confidence: ${features.dataConfidence}%`],
      market_average: null,
      summary: `Based on ${features.dataConfidence}% complete data, this listing is ${
        forensic.verdict === "GENUINE" ? "clean" : forensic.verdict === "UNVERIFIABLE" ? "inconclusive" : "suspicious"
      }.`,
    };
  }
}

export async function runForensicPipeline(product) {
  if (!product || typeof product !== "object") {
    throw new Error("Product capture is required before analysis.");
  }

  const features = await buildFeatures(product);

  const forensic = calculateForensicTrust(features);
  const aiResult = await runAIVerifier(product, features, forensic.verdict);
  
  const finalVerdict = forensic.verdict;
  const anomalies = forensic.breakdown;

  if (aiResult.market_average && aiResult.market_average > 0) {
    const deviation =
      product.price > 0
        ? Math.round(
            ((aiResult.market_average - product.price) /
              aiResult.market_average) *
              100,
          )
        : 0;
    if (deviation > 30 && !anomalies.find(a => a.label?.includes("PRICE"))) {
      anomalies.push({
        label: "BELOW_MARKET_AVG",
        detail: `Price is ${deviation}% below market average (INR ${aiResult.market_average.toLocaleString()})`,
        severity: "HIGH",
      });
    }
  }

  const proofMap = {};
  anomalies.forEach(a => {
    const type = a.label || a.type;
    if (type?.includes("PRICE") || type?.includes("MARKET")) proofMap.priceDeviation = a.detail;
    else if (type?.includes("SELLER")) proofMap.sellerRisk = a.detail;
    else if (type?.includes("REVIEW")) proofMap.reviewAnomaly = a.detail;
    else if (type?.includes("DISCOUNT")) proofMap.discountAnomaly = a.detail;
  });

  if (!proofMap.priceDeviation) {
    const avg = product.market_baseline || aiResult.market_average;
    proofMap.priceDeviation = avg ? `Price logic (Listed: INR ${product.price}, Mkt: INR ${avg})` : "Price is within acceptable range";
  }
  if (!proofMap.sellerRisk) proofMap.sellerRisk = `Seller (${product.sellerName || 'unknown'}) meets baseline reliability`;
  if (!proofMap.reviewAnomaly) proofMap.reviewAnomaly = `Reviews appear organic (${product.reviewCount} total / ${product.rating} avg)`;
  if (!proofMap.discountAnomaly) proofMap.discountAnomaly = `Discount (${features.discountValue}%) is standard for clearance/sales`;

  return {
    verdict: finalVerdict,
    score: forensic.score,
    confidence: forensic.confidence,
    summary: aiResult.summary,
    reasoning: aiResult.reasons,
    evidence: aiResult.evidence,
    risk_signals: anomalies,
    breakdown: forensic.breakdown,
    proof: {
      priceDeviation: proofMap.priceDeviation,
      sellerRisk: proofMap.sellerRisk,
      reviewAnomaly: proofMap.reviewAnomaly,
      discountAnomaly: proofMap.discountAnomaly,
      dataQuality: `${Math.round(forensic.confidence)}% Forensic Capture Quality`,
    },
    timestamp: new Date(),
    product,
    metadata: {
      engine: {
        DOMAIN_TRUST: 1 - features.sellerRisk,
        PRICE_INTEGRITY: 1 - features.priceRisk,
        SELLER_REPUTATION: 1 - features.sellerRisk,
        DATA_DENSITY: forensic.confidence / 100,
      },
      ai_confidence: Math.round(aiResult.confidence * 100),
      forensic_score: forensic.score,
      data_confidence: forensic.confidence,
      category: features.category,
      recovery_method: product.sourcesUsed?.includes("JSONLD")
        ? "SELF_HEALED_JSONLD"
        : "DIRECT_ADAPTER",
      sources_used: product.sourcesUsed || [],
      traffic_captured: (product.trafficIntelligence || []).length,
    },
  };
}
