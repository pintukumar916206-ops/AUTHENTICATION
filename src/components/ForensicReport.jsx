import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Fingerprint, Activity, Database, RefreshCcw, Tag, User, Star, Percent, Info, ExternalLink, ChevronRight } from "lucide-react";
import TrustRadar from "./TrustRadar";
import PriceInsights from "./PriceInsights";
import { Modal, Button } from "../ui";

const SEVERITY_COLOR = {
  FAIL: "#ff2222",
  WARNING: "#ffb300",
  PASS: "#10b981",
};

export default function ForensicReport({ data, onReset }) {
  const [explainOpen, setExplainOpen] = useState(false);
  const {
    verdict,
    score,
    confidence,
    breakdown = [],
    summary,
    product,
    proof,
    metadata,
    formula
  } = data;

  const isUnverifiable = verdict === "UNVERIFIABLE";
  const verdictLabel = isUnverifiable ? "◌ INSUFFICIENT DATA" :
                       verdict === "GENUINE" ? "✓ REAL PRODUCT" :
                       verdict === "FAKE" ? "⚠ FAKE / COUNTERFEIT" : "~ SUSPICIOUS";

  const verdictClass = isUnverifiable ? "unverifiable" :
                       verdict === "GENUINE" ? "genuine" :
                       verdict === "FAKE" ? "fake" : "suspicious";

  return (
    <div className="report-stage anim-entry">
      <div className="report-header-ops">
        <button onClick={onReset} className="reset-btn">
          <RefreshCcw size={12} /> New analysis
        </button>
      </div>

      <div className={`report-card verdict-banner ${verdictClass}`}>
        <div className="v-icon">
          {isUnverifiable ? <Fingerprint size={44} className="txt-grey" /> :
           verdict === "GENUINE" ? <ShieldCheck size={44} className="txt-genuine" /> :
           verdict === "FAKE" ? <ShieldAlert size={44} className="txt-fake" /> :
           <AlertTriangle size={44} className="txt-suspicious" />}
        </div>
        <div className="v-content">
          <h1 className={`v-title txt-${verdictClass}`}>{verdictLabel}</h1>
          <p className="v-summary">
            {isUnverifiable 
              ? "Automated audit restricted. Insufficient data points captured for a defensible verdict." 
              : summary || "Automated audit complete. Review risk signals below."}
          </p>
        </div>
        {!isUnverifiable && (
          <div className="v-score-stack">
            <div className="v-score-box" onClick={() => setExplainOpen(true)} style={{ cursor: 'pointer' }}>
              <span className="sc-val">{score}</span>
              <span className="sc-label">Trust Score <Info size={10} /></span>
            </div>
            <div className="v-confidence-mini">
              <div className="conf-bar-bg">
                <div className="conf-bar-fill" style={{ width: `${confidence}%` }}></div>
              </div>
              <span>{confidence}% Coverage</span>
            </div>
          </div>
        )}
      </div>

      {isUnverifiable && (
        <div className="report-card alert-card warning">
          <AlertTriangle size={16} />
          <div>
            <strong>Forensic Alert: Data coverage at {confidence}%</strong>
            <p>Verdict suppressed to ensure mathematical integrity. Minimum 50% data coverage required for final adjudication.</p>
          </div>
        </div>
      )}

      <div className="forensic-hud-strip">
        <div className="hud-metric">
          <div className="hud-meter-bg">
            <div className="hud-meter-fill" style={{ width: `${confidence}%` }}></div>
          </div>
          <span className="hud-label">Confidence Engine: {confidence}% Reliable</span>
        </div>
        <div className="hud-meta-tags">
          <span className="hud-tag"><Activity size={10}/> {metadata?.category || "General"}</span>
          <span className="hud-tag"><Fingerprint size={10}/> {data.signals_processed || 0}/5 Captured</span>
        </div>
      </div>

      <div className="report-card recommendation-box">
        <div className="bl-header">
          <ShieldCheck size={13} /> <span>FINAL OPERATIONAL RECOMMENDATION</span>
        </div>
        <div className="rec-content">
          {verdict === "GENUINE" ? (
            <p>Asset meets all primary integrity benchmarks. Proceed with procurement. Merchant demonstrates high historic reliability.</p>
          ) : verdict === "FAKE" ? (
            <p>High-risk asset identified. Correlation with known fraudulent patterns is &gt;90%. Immediate quarantine recommended.</p>
          ) : isUnverifiable ? (
            <p>Data points insufficient. Perform manual verification of seller business registration and physical inventory snapshots.</p>
          ) : (
            <p>Suspicious signals detected. Proceed with caution. Verify physical location and payment endpoints before transaction.</p>
          )}
        </div>
      </div>

      <div className="report-details-grid">
        <div className="details-card">
          <div className="bl-header">
            <Fingerprint size={13} /> <span>EVIDENCE TRAIL</span>
          </div>
          <div className="proof-grid-mini">
            {proof && Object.entries(proof).map(([key, val], i) => (
              <div key={i} className="proof-mini-item">
                <span className="pm-key">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                <span className="pm-val">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="details-card">
          <div className="bl-header">
            <Activity size={13} /> <span>SCORING FORMULA</span>
          </div>
          <div className="formula-box">
            <code>{formula || "S = 100 - Σ(Ri * Wi)"}</code>
            <Button variant="ghost" size="sm" onClick={() => setExplainOpen(true)}>
              Explain Model <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      </div>

      <div className="report-card">
        <PriceInsights currentPrice={product?.price} hostname={product?.hostname} />
      </div>

      <Modal isOpen={explainOpen} onClose={() => setExplainOpen(false)} title="Forensic Trust Model Explained">
        <div className="explain-model-body">
          <p className="txt-muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
            Our engine uses a deterministic weighted model to evaluate merchant and product integrity. 
            The score starts at 100 and is reduced based on identified risk signals.
          </p>
          
          <div className="signal-contribution-list">
            {breakdown.map((sig, i) => (
              <div key={i} className="sig-contrib-item">
                <div className="sig-contrib-info">
                  <div className="sig-name">{sig.label}</div>
                  <div className="sig-meta">Weight: {Math.round(sig.weight * 100)}% | Risk: {sig.risk}%</div>
                </div>
                <div className="sig-contrib-impact">
                  <span className={`impact-pill impact-${sig.status.toLowerCase()}`}>
                    -{sig.deduction} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="explain-footer-stats">
            <div className="ef-stat">
              <span>Base Score</span>
              <span>100</span>
            </div>
            <div className="ef-stat">
              <span>Total Deductions</span>
              <span className="txt-fake">-{100 - score}</span>
            </div>
            <div className="ef-stat total">
              <span>Final Trust Score</span>
              <span>{score}%</span>
            </div>
          </div>
        </div>
      </Modal>

      <footer className="report-footer-meta">
        <Database size={12} />
        <span>AuthentiScan Forensic Division</span>
        <span>•</span>
        <span>ID: {data._id?.toString().toUpperCase()}</span>
        <span>•</span>
        <span>{new Date(data.timestamp).toLocaleString()}</span>
      </footer>
    </div>
  );
}
