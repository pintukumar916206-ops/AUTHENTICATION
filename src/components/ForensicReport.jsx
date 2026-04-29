import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Fingerprint, Activity, Database, RefreshCcw, Tag, User, Star, Percent } from "lucide-react";
import TrustRadar from "./TrustRadar";
import PriceInsights from "./PriceInsights";

const SEVERITY_COLOR = {
  CRITICAL: "#ff2222",
  HIGH: "#ff5555",
  MEDIUM: "#ffb300",
  LOW: "#888",
};

export default function ForensicReport({ data, onReset }) {
  const {
    verdict,
    score,
    confidence,
    reasoning = [],
    evidence = [],
    risk_signals = [],
    summary,
    product,
    proof,
    metadata
  } = data;

  const verdictLabel = verdict === "GENUINE" ? "✓ REAL PRODUCT" :
                       verdict === "FAKE" ? "⚠ FAKE / counterfeited" :
                       verdict === "SUSPICIOUS" ? "~ SUSPICIOUS" : "◌ UNVERIFIABLE";

  const verdictClass = verdict === "GENUINE" ? "genuine" :
                       verdict === "FAKE" ? "fake" :
                       verdict === "SUSPICIOUS" ? "suspicious" : "unverifiable";

  return (
    <div className="report-stage anim-entry">
      <div className="report-header-ops">
        <button onClick={onReset} className="reset-btn">
          <RefreshCcw size={12} /> New analysis
        </button>
      </div>

      <div className={`report-card verdict-banner ${verdictClass}`}>
        <div className="v-icon">
          {verdict === "GENUINE" ? <ShieldCheck size={44} className="txt-genuine" /> :
           verdict === "FAKE" ? <ShieldAlert size={44} className="txt-fake" /> :
           <AlertTriangle size={44} className="txt-suspicious" />}
        </div>
        <div className="v-content">
          <h1 className={`v-title txt-${verdictClass}`}>{verdictLabel}</h1>
          <p className="v-summary">{summary || "Automated audit complete. Review risk signals below."}</p>
        </div>
        <div className="v-score-box">
          <span className="sc-val">
            {score}
          </span>
          <span className="sc-label">Trust Score</span>
        </div>
      </div>

      <div className="forensic-hud-strip">
        <div className="hud-metric">
          <div className="hud-meter-bg">
            <div className="hud-meter-fill" style={{ width: `${confidence}%` }}></div>
          </div>
          <span className="hud-label">System Confidence: {confidence}%</span>
        </div>
        <div className="hud-meta-tags">
          <span className="hud-tag"><Activity size={10}/> {metadata?.category || "Unknown Category"}</span>
          <span className="hud-tag"><Fingerprint size={10}/> {metadata?.data_confidence ?? 0}% Data Quality</span>
        </div>
      </div>

      {proof && (
        <div className="proof-panel report-card">
          <div className="bl-header" style={{ marginBottom: "20px" }}>
            <Fingerprint size={13} /> <span>EVIDENCE TRAIL — Why this verdict?</span>
          </div>
          <div className="proof-grid">
            <div className="proof-item">
              <Tag size={13} style={{ color: "var(--accent-muted)" }} />
              <div>
                <div className="proof-key">Price Check</div>
                <div className="proof-val">{proof.priceDeviation}</div>
              </div>
            </div>
            <div className="proof-item">
              <User size={13} style={{ color: "var(--accent-muted)" }} />
              <div>
                <div className="proof-key">Seller</div>
                <div className="proof-val">{proof.sellerRisk}</div>
              </div>
            </div>
            <div className="proof-item">
              <Star size={13} style={{ color: "var(--accent-muted)" }} />
              <div>
                <div className="proof-key">Reviews</div>
                <div className="proof-val">{proof.reviewAnomaly}</div>
              </div>
            </div>
            <div className="proof-item">
              <Percent size={13} style={{ color: "var(--accent-muted)" }} />
              <div>
                <div className="proof-key">Discount</div>
                <div className="proof-val">{proof.discountAnomaly}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="anomaly-stage">
        <div className="bl-header">
          <ShieldAlert size={13} className="txt-fake" /> <span>RISK ANOMALIES ({risk_signals?.length || 0})</span>
        </div>
        <div className="anomaly-grid">
          {risk_signals && risk_signals.length > 0 ? (
            risk_signals.map((sig, i) => (
              <div key={i} className={`anomaly-card ${sig.severity?.toLowerCase()}`}>
                <div className="a-header">
                  <span className="a-type">{sig.label}</span>
                  <span className="a-severity">{sig.severity}</span>
                </div>
                <p className="a-detail">{sig.detail}</p>
              </div>
            ))
          ) : (
            <div className="anomaly-card empty">
              <ShieldCheck size={16} />
              <span>No critical anomalies detected in price, seller, or review signals.</span>
            </div>
          )}
        </div>
      </div>

      <div className="report-details-grid">
        <div className="details-card">
          <div className="bl-header">
            <ShieldCheck size={13} className="txt-genuine" /> <span>Positive Indicators ({evidence.length})</span>
          </div>
          {evidence.length === 0 ? (
            <p style={{ color: "#555", fontFamily: "var(--font-mono)", fontSize: "0.75rem", marginTop: '12px' }}>No positive indicators found.</p>
          ) : (
            <div className="signal-list" style={{ marginTop: '12px' }}>
              {evidence.map((sig, i) => (
                <div key={i} className="signal-item genuine-signal">
                  <div className="signal-label">{sig.label || sig}</div>
                  {sig.detail && <div className="signal-detail">{sig.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="details-card">
          <TrustRadar metrics={metadata?.engine} />

          <div className="bl-header metrics-section-header">
            <Activity size={13} /> <span>AI Reasoning</span>
          </div>
          <ul className="f-reasoning-list">
            {reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="report-card">
        <div className="bl-header" style={{ marginBottom: "20px" }}>
          <Activity size={13} /> <span>Price Integrity Check</span>
        </div>
        <PriceInsights currentPrice={product?.price} hostname={product?.hostname} />
      </div>

      <footer className="report-footer-meta">
        <Database size={12} />
        <span>AuthentiScan v2</span>
        <span>•</span>
        <span>Source: {product?.hostname || "Unknown"}</span>
        <span>•</span>
        <span>{new Date(data.timestamp).toLocaleString()}</span>
      </footer>
    </div>
  );
}
