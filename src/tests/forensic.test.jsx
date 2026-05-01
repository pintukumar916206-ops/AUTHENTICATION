import { describe, it, expect } from 'vitest';
import { calculateForensicTrust } from '../../server/services/scoring.mjs';

describe('Forensic Scoring Engine V2 (Weighted)', () => {
  it('should calculate a perfect score for clean data', () => {
    const features = {
      priceRisk: 0,
      sellerRisk: 0,
      domainRisk: 0,
      metadataRisk: 0,
      reviewRisk: 0
    };
    const result = calculateForensicTrust(features);
    expect(result.score).toBe(100);
    expect(result.verdict).toBe('GENUINE');
    expect(result.confidence).toBe(100);
  });

  it('should trigger UNVERIFIABLE state for low data coverage', () => {
    const features = {
      priceRisk: 0.1
      // Only 1 signal out of 5 = 20% coverage
    };
    const result = calculateForensicTrust(features);
    expect(result.verdict).toBe('UNVERIFIABLE');
    expect(result.is_reliable).toBe(false);
  });

  it('should apply heavy penalties for price anomalies (35% weight)', () => {
    const features = {
      priceRisk: 1.0, // 100% risk
      sellerRisk: 0,
      domainRisk: 0,
      metadataRisk: 0,
      reviewRisk: 0
    };
    const result = calculateForensicTrust(features);
    // 35% of 100 is 35 points deduction
    expect(result.score).toBe(65); 
    expect(result.verdict).toBe('SUSPICIOUS');
  });

  it('should classify as FAKE when multiple critical signals are compromised', () => {
    const features = {
      priceRisk: 0.8,    // -28 pts
      sellerRisk: 0.8,   // -20 pts
      domainRisk: 0.5,   // -10 pts
      metadataRisk: 0.5, // -5 pts
      reviewRisk: 0      // -0 pts
    };
    const result = calculateForensicTrust(features);
    // 100 - 28 - 20 - 10 - 5 = 37
    expect(result.score).toBe(37);
    expect(result.verdict).toBe('FAKE');
  });
});
