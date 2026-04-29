import { describe, expect, it } from "vitest";
import { buildFeatures } from "../../server/services/featureBuilder.mjs";
import { computeRiskScore, generateProof, getTrustScore, getVerdict } from "../../server/services/scoring.mjs";
import { isPrivateAddress, normalizeScanUrl, validateScanUrl } from "../../server/services/urlSafety.mjs";

describe("scan URL safety", () => {
  it("blocks local and private targets before scraping", async () => {
    expect(normalizeScanUrl("http://localhost:3000/product").ok).toBe(false);
    expect(normalizeScanUrl("http://127.0.0.1/product").ok).toBe(false);
    expect(normalizeScanUrl("http://[::1]/product").ok).toBe(false);
    expect(normalizeScanUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(normalizeScanUrl("http://8.8.8.8/product").reason).toBe("HOSTNAME");
    expect(isPrivateAddress("192.168.1.20")).toBe(true);
    expect(isPrivateAddress("10.0.0.5")).toBe(true);
  });

  it("normalizes public web URLs and removes fragments", async () => {
    const result = await validateScanUrl("https://example.com/product#reviews", { resolveDns: false });
    expect(result.ok).toBe(true);
    expect(result.url).toBe("https://example.com/product");
  });

  it("rejects credentials and non-web protocols", () => {
    expect(normalizeScanUrl("ftp://example.com/product").reason).toBe("PROTOCOL");
    expect(normalizeScanUrl("https://user:pass@example.com/product").reason).toBe("CREDENTIALS");
  });
});

describe("forensic scoring", () => {
  it("marks low-confidence captures as unverifiable", () => {
    const features = buildFeatures({
      title: "",
      price: 0,
      sellerName: "",
      rating: 0,
      reviewCount: 0,
      description: "",
    });
    const risk = computeRiskScore(features);

    expect(features.dataConfidence).toBeLessThan(40);
    expect(getVerdict(risk, features.dataConfidence)).toBe("UNVERIFIABLE");
  });

  it("raises critical proof for impossible price and extreme discount", () => {
    const features = buildFeatures({
      title: "Nike Air Jordan Sneakers",
      price: 399,
      originalPrice: 8999,
      discount: 96,
      sellerName: "Unknown reseller",
      rating: 4.9,
      reviewCount: 8,
      description: "Limited launch product",
      hostname: "deals.example.com",
    });
    const proof = generateProof(features);

    expect(features.priceRisk).toBe(1);
    expect(proof.some((item) => item.label === "PRICE_ABYSS" && item.severity === "CRITICAL")).toBe(true);
    expect(proof.some((item) => item.label === "EXTREME_DISCOUNT" && item.severity === "CRITICAL")).toBe(true);
  });

  it("keeps trust score tied to risk and confidence", () => {
    expect(getTrustScore(0.25, 80)).toBe(60);
    expect(getVerdict(0.72, 95)).toBe("FAKE");
    expect(getVerdict(0.36, 95)).toBe("SUSPICIOUS");
  });
});
