import React from "react";
import { ShieldCheck, Fingerprint, Activity, Clock, ShieldAlert } from "lucide-react";
import "../styles/pdf.css";

export default function ExecutivePDFTemplate({ data }) {
  const {
    _id,
    verdict,
    score,
    confidence,
    reasoning = [],
    breakdown = [],
    product,
    timestamp,
  } = data;

  const isUnverifiable = verdict === "UNVERIFIABLE";

  const verdictText = isUnverifiable ? "INCONCLUSIVE / INSUFFICIENT DATA" :
    verdict === "GENUINE" ? "VERIFIED GENUINE" :
    verdict === "FAKE" ? "CONFIRMED FRAUDULENT" : "HIGH-RISK / SUSPICIOUS";

  const verdictColor = isUnverifiable ? "#6b7280" :
    verdict === "GENUINE" ? "#10b981" :
    verdict === "FAKE" ? "#ef4444" : "#f59e0b";

  const verificationUrl = `${window.location.origin}/reports/${_id}`;

  return (
    <div className="executive-pdf-container" id="executive-pdf-template">
      <div className="pdf-page">
        <header className="pdf-header">
          <div className="pdf-brand">
            <ShieldCheck size={24} color={verdictColor} />
            <div>
              <h1>AUTHENTISCAN</h1>
              <span className="pdf-subtitle">FORENSIC INTELLIGENCE DIVISION</span>
            </div>
          </div>
          <div className="pdf-meta">
            <div className="meta-item"><strong>CASE ID:</strong> {_id?.toUpperCase()}</div>
            <div className="meta-item"><strong>FILED:</strong> {new Date(timestamp).toLocaleString()}</div>
          </div>
        </header>

        <div className="pdf-verdict-hero" style={{ backgroundColor: `${verdictColor}11`, borderLeft: `4px solid ${verdictColor}` }}>
          <div className="hero-top">
            <div className="hero-verdict">
              <span className="hero-lbl">OFFICIAL DETERMINATION</span>
              <h2 style={{ color: verdictColor }}>{verdictText}</h2>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hs-val">{isUnverifiable ? "N/A" : `${score}%`}</span>
                <span className="hs-lbl">TRUST</span>
              </div>
              <div className="hero-stat">
                <span className="hs-val">{confidence}%</span>
                <span className="hs-lbl">COVERAGE</span>
              </div>
            </div>
          </div>
          <div className="hero-target">
            <strong>TARGET ASSET:</strong> {product?.title} ({product?.hostname})
          </div>
        </div>

        <div className="pdf-section">
          <h3>OPERATIONAL DIRECTIVE</h3>
          <div className="pdf-directive-box">
            {isUnverifiable ? (
              <p>Automated engine suppressed verdict due to low signal coverage ({confidence}%). Manual investigation of merchant business registration is mandatory before procurement.</p>
            ) : verdict === "GENUINE" ? (
              <p>Asset meets all deterministic integrity benchmarks. Merchant demonstrates high reliability. Safe for procurement within standard protocols.</p>
            ) : (
              <p>IMMEDIATE QUARANTINE. Multiple forensic anomalies detected. Correlation with fraudulent patterns is {100 - score}%. High risk of financial loss.</p>
            )}
          </div>
        </div>

        <div className="pdf-section">
          <h3>FORENSIC REASONING</h3>
          <ul className="pdf-reasoning-list">
            {reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="pdf-section">
          <h3>SIGNAL MATRIX AUDIT</h3>
          <table className="pdf-audit-table">
            <thead>
              <tr>
                <th>INTEGRITY SIGNAL</th>
                <th>DEVIATION</th>
                <th>IMPACT</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((sig, i) => (
                <tr key={i}>
                  <td>{sig.label}</td>
                  <td>{sig.risk}%</td>
                  <td className={sig.deduction > 0 ? "txt-neg" : "txt-pos"}>-{sig.deduction} pts</td>
                </tr>
              ))}
              <tr className="pdf-final-row">
                <td colSpan="2">FINAL CALCULATED TRUST</td>
                <td>{isUnverifiable ? "N/A" : `${score}%`}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pdf-footer">
          <div className="pdf-verify-link">
            <strong>VERIFY REPORT:</strong> {verificationUrl}
          </div>
          <div className="pdf-copy">
            © 2026 AUTHENTISCAN FORENSIC DIVISION • CONFIDENTIAL
          </div>
        </div>
      </div>
    </div>
  );
}
