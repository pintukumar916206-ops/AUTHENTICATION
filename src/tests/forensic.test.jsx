import { describe, it, expect } from 'vitest';
import { calculateForensicTrust } from '../../server/services/scoring.mjs';

describe('Forensic Trust Engine', () => {
  it('should apply maximum deduction for extreme price deviation', () => {
    const features = { priceRisk: 0.9 };
    const result = calculateForensicTrust(features);
    
    expect(result.score).toBe(60); // 100 - 40
    expect(result.audit_trail).toContainEqual(expect.objectContaining({
      label: "Extreme Price Deviation"
    }));
  });

  it('should apply cumulative deductions for multiple risk signals', () => {
    const features = {
      priceRisk: 0.9,      // -40
      sellerRisk: 0.7,     // -25
      domainRisk: 0.8,     // -35
    };
    const result = calculateForensicTrust(features);
    
    expect(result.score).toBe(0); // 100 - 40 - 25 - 35 = 0
    expect(result.audit_trail.length).toBe(3);
    expect(result.verdict).toBe("FAKE");
  });

  it('should maintain 100 score when no risk signals are present', () => {
    const features = {
      priceRisk: 0.1,
      sellerRisk: 0.1,
      domainRisk: 0.1
    };
    const result = calculateForensicTrust(features);
    
    expect(result.score).toBe(100);
    expect(result.audit_trail.length).toBe(0);
    expect(result.verdict).toBe("GENUINE");
  });

  it('should calculate confidence based on available data points', () => {
    const features = {
      priceRisk: 0.5,
      sellerRisk: 0.5
      // domainRisk and reviews missing
    };
    const result = calculateForensicTrust(features);
    expect(result.confidence).toBe(50); // 2/4 points
  });
});

describe('Operational Logic', () => {
  it('should correctly identify suspicious threshold', () => {
    const features = { sellerRisk: 0.7, priceRisk: 0.5 }; // -25 - 20 = 55 (SUSPICIOUS)
    // PRICE_OUTLIER is 20. 100 - 20 = 80. Verdict 80 is GENUINE.
    // Let's try SELLER_UNVERIFIED (-25) + PRICE_OUTLIER (-20) = 55.
    const result = calculateForensicTrust(features);
    expect(result.verdict).toBe("SUSPICIOUS");
  });
});
