# AuthentiScan Forensic Scoring Engine (AFSE) v2.0

> **How we mathematically determine product and merchant integrity.**

AuthentiScan-v2 moves away from "AI guesses" and implements a **Deterministic Weighted Deduction Engine**. Every trust score starts at **100** and is systematically reduced based on captured forensic signals.

## 📊 Scoring Weights & Logic

| Code | Signal Category | Deduction | Forensic Justification |
| :--- | :--- | :--- | :--- |
| **P-01** | **Extreme Price Abyss** | `-40pts` | Price is >60% below market average. Statistically impossible for genuine inventory. |
| **S-01** | **Fresh Storefront** | `-35pts` | Domain or Store registered in the last 90 days. Classic "Burner Store" pattern. |
| **M-01** | **Identity Obfuscation** | `-25pts` | Merchant name missing or masked by generic proxies. |
| **D-01** | **Metadata Gaps** | `-15pts` | Missing GTIN, EAN, or Brand Registry identifiers in the JSON-LD payload. |
| **R-01** | **Review Anomalies** | `-20pts` | High velocity of feedback (100+ reviews in 24h) with 0.99+ sentiment (Bot pattern). |
| **T-01** | **High-Risk TLD** | `-10pts` | Store hosted on `.shop`, `.top`, or `.xyz` with low history. |

## ⚖️ Verdict Thresholds

AuthentiScan categorizes results into three operational tiers:

- **GENUINE (80 - 100)**: Clean audit trail. Minimal to no risk signals detected.
- **SUSPICIOUS (50 - 79)**: 1-2 major risk signals. Manual investigation recommended.
- **FAKE (0 - 49)**: Extreme risk. Multiple critical deductions triggered.

## 🧠 Confidence Score Calculation

The Confidence Score is **not** a measure of how "fake" a product is, but rather how much data we were able to capture.

- **High Confidence (80%+)**: Successfully scraped Price, Seller, History, and Metadata.
- **Medium Confidence (50-79%)**: 1-2 sources blocked or missing (e.g., Seller profile private).
- **Low Confidence (<50%)**: Critical signals missing. Result should be treated as "Insufficient Data".

## 🛠️ Handling False Positives

Our engine includes **Correction Heuristics**:
1. **Verified Merchant Boost**: If the merchant is a "Top Rated" seller on a known platform (Amazon/eBay), certain price deductions are softened.
2. **Dynamic Baseline**: Market floors are calculated per-category, preventing high-end luxury items from being flagged as "Overpriced" vs generic equivalents.

---
*For a deep dive into the code, see `server/services/scoring.mjs`.*
