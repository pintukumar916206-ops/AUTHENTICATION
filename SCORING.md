# AuthentiScan Forensic Scoring Engine (AFSE) v2.0

AuthentiScan-v2 implements a Deterministic Weighted Deduction Engine to mathematically determine product and merchant integrity. Trust scores originate at 100 and are systematically adjusted based on captured forensic signals.

## Scoring Weights & Logic

| Code | Signal Category | Deduction | Forensic Justification |
| :--- | :--- | :--- | :--- |
| **P-01** | **Extreme Price Abyss** | `-40pts` | Price is >60% below market average. Statistically improbable for genuine inventory. |
| **S-01** | **Fresh Storefront** | `-35pts` | Domain or Store registered in the last 90 days. Consistent with burner store patterns. |
| **M-01** | **Identity Obfuscation** | `-25pts` | Merchant name missing or masked by generic proxies. |
| **D-01** | **Metadata Gaps** | `-15pts` | Missing GTIN, EAN, or Brand Registry identifiers in the JSON-LD payload. |
| **R-01** | **Review Anomalies** | `-20pts` | High velocity of feedback with abnormal sentiment distribution (Bot pattern). |
| **T-01** | **High-Risk TLD** | `-10pts` | Store hosted on high-risk TLDs (e.g., .shop, .top, .xyz) with low history. |

## Verdict Thresholds

AuthentiScan categorizes results into three operational tiers:

- **GENUINE (80 - 100)**: Clean audit trail. Minimal to no risk signals detected.
- **SUSPICIOUS (50 - 79)**: One or more significant risk signals. Manual investigation recommended.
- **FAKE (0 - 49)**: Extreme risk. Multiple critical deductions triggered.

## Confidence Score Calculation

The Confidence Score measures data capture completeness rather than asset integrity.

- **High Confidence (80%+)**: Successful capture of Price, Seller, History, and Metadata.
- **Medium Confidence (50-79%)**: One or more sources obstructed or missing.
- **Low Confidence (<50%)**: Critical signals missing. Result treated as "Insufficient Data".

## Correction Heuristics

The engine includes active correction logic to minimize false positives:
1. **Verified Merchant Boost**: If the merchant is a top-rated seller on known platforms, specific price deductions are softened.
2. **Dynamic Baseline**: Market floors are calculated per-category, preventing false flags on luxury vs generic equivalents.

---
*Reference: server/services/scoring.mjs*
