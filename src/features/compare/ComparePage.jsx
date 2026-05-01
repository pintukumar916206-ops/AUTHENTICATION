import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../services/api";
import Button from "../../shared/Button";
import Badge from "../../shared/Badge";
import useUIStore from "../../store/uiStore";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Trophy,
  Minus,
  Activity,
  ChevronRight,
  Scale,
} from "lucide-react";
import "../../styles/dashboard.css";

function ScoreBar({ score }) {
  const color =
    score >= 70
      ? "var(--success)"
      : score >= 40
        ? "var(--warning)"
        : "var(--error)";
  return (
    <div className="compare-score-bar-wrap">
      <div className="compare-score-bar-bg">
        <div
          className="compare-score-bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="compare-score-num" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

function SidePanel({ data, winner, side }) {
  const isWinner = winner === side;
  const isTie = winner === "tie";

  const verdictIcon =
    data.verdict === "GENUINE" ? (
      <ShieldCheck size={20} className="txt-genuine" />
    ) : data.verdict === "FAKE" ? (
      <ShieldAlert size={20} className="txt-fake" />
    ) : (
      <AlertTriangle size={20} className="txt-suspicious" />
    );

  return (
    <div className={`compare-panel ${isWinner ? "compare-panel-winner" : ""}`}>
      {isWinner && (
        <div className="compare-winner-badge">
          <Trophy size={12} /> HIGHER INTEGRITY
        </div>
      )}
      {isTie && (
        <div className="compare-tie-badge">
          <Minus size={12} /> EQUAL RISK
        </div>
      )}
      <div className="compare-panel-verdict">
        {verdictIcon}
        <Badge verdict={data.verdict} />
      </div>
      <h3 className="compare-panel-title" title={data.title}>
        {data.title}
      </h3>
      <span className="compare-panel-host">
        {data.hostname || "Unknown Storefront"}
      </span>

      <ScoreBar score={data.score || 0} />

      <div className="compare-panel-meta">
        <div className="compare-meta-row">
          <span className="compare-meta-label">Forensic Confidence</span>
          <span className="compare-meta-val">{data.confidence}%</span>
        </div>
        <div className="compare-meta-row">
          <span className="compare-meta-label">Calculated Price</span>
          <span className="compare-meta-val">
            ₹{data.price?.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function DecisionLayer({ result }) {
  const { a, b, winner } = result;

  if (winner === "tie")
    return (
      <div className="compare-delta-banner tie">
        <Scale size={24} />
        <div className="delta-content">
          <h3>Forensic Deadlock: Identical Risk Profiles</h3>
          <p>
            No statistical differentiation found between targets. Both listings
            exhibit a Trust Score of {a.score}%. Procurement is not advised for
            either asset.
          </p>
        </div>
      </div>
    );

  const winningData = winner === "a" ? a : b;
  const losingData = winner === "a" ? b : a;
  const trustDelta = Math.abs(a.score - b.score);

  return (
    <div className={`compare-delta-banner ${winner}`}>
      <Trophy size={24} />
      <div className="delta-content">
        <h3>{winningData.hostname} is the safer procurement path</h3>
        <p>
          Detected a <strong>{trustDelta}% Trust Delta</strong> between targets.
          {winningData.hostname} maintains superior signal alignment,
          specifically in{" "}
          {winningData.score > losingData.score
            ? "merchant legitimacy"
            : "price stability"}
          . In contrast, {losingData.hostname} displays anomalies that correlate
          with high-risk operations.
        </p>
      </div>
    </div>
  );
}

function ComparisonTable({ a, b }) {
  const rows = [
    {
      label: "Trust Score",
      valA: `${a.score}%`,
      valB: `${b.score}%`,
      win: a.score > b.score ? "a" : a.score < b.score ? "b" : "tie",
    },
    {
      label: "Confidence",
      valA: `${a.confidence}%`,
      valB: `${b.confidence}%`,
      win:
        a.confidence > b.confidence
          ? "a"
          : a.confidence < b.confidence
            ? "b"
            : "tie",
    },
    {
      label: "Price Stability",
      valA: a.priceRisk > 0.5 ? "Low" : "High",
      valB: b.priceRisk > 0.5 ? "Low" : "High",
      win:
        a.priceRisk < b.priceRisk
          ? "a"
          : a.priceRisk > b.priceRisk
            ? "b"
            : "tie",
    },
    {
      label: "Risk Deductions",
      valA: a.risk_signals?.length || 0,
      valB: b.risk_signals?.length || 0,
      win:
        (a.risk_signals?.length || 0) < (b.risk_signals?.length || 0)
          ? "a"
          : "b",
    },
  ];

  return (
    <div className="compare-table-wrap report-card">
      <div className="bl-header" style={{ marginBottom: 20 }}>
        <Activity size={13} /> <span>HEAD-TO-HEAD AUDIT</span>
      </div>
      <table className="compare-table">
        <thead>
          <tr>
            <th>Signal</th>
            <th>{a.hostname}</th>
            <th>{b.hostname}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="row-label">{row.label}</td>
              <td className={`row-val ${row.win === "a" ? "win" : ""}`}>
                {row.valA}
              </td>
              <td className={`row-val ${row.win === "b" ? "win" : ""}`}>
                {row.valB}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const preloadA = searchParams.get("a") || "";
  const [inputA, setInputA] = useState(preloadA);
  const [inputB, setInputB] = useState("");
  const [mode, setMode] = useState("ids");
  const [result, setResult] = useState(null);
  const { addToast } = useUIStore();

  const compare = useMutation({
    mutationFn: (payload) => api.post("/api/compare", payload),
    onSuccess: (data) => setResult(data),
    onError: (err) => addToast(err.message || "Comparison failed", "error"),
  });

  const handleCompare = (e) => {
    e.preventDefault();
    if (!inputA.trim() || !inputB.trim()) {
      addToast("Inputs required", "warning");
      return;
    }
    const payload =
      mode === "ids"
        ? { reportIdA: inputA.trim(), reportIdB: inputB.trim() }
        : { urlA: inputA.trim(), urlB: inputB.trim() };
    compare.mutate(payload);
  };

  return (
    <div className="compare-page">
      <header className="compare-header">
        <h1 className="compare-title">Forensic Comparison Engine</h1>
        <p className="compare-sub">
          Multi-source trust reconciliation and procurement decisioning
        </p>
      </header>

      <div className="compare-mode-tabs">
        <button
          className={`compare-tab ${mode === "ids" ? "compare-tab-active" : ""}`}
          onClick={() => setMode("ids")}
        >
          By Report ID
        </button>
        <button
          className={`compare-tab ${mode === "urls" ? "compare-tab-active" : ""}`}
          onClick={() => setMode("urls")}
        >
          By Live URL
        </button>
      </div>

      <form className="compare-form" onSubmit={handleCompare}>
        <div className="compare-inputs">
          <div className="compare-input-group">
            <input
              className="compare-input"
              type="text"
              placeholder={mode === "ids" ? "Report ID A" : "URL A"}
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
            />
          </div>
          <div className="compare-vs">VS</div>
          <div className="compare-input-group">
            <input
              className="compare-input"
              type="text"
              placeholder={mode === "ids" ? "Report ID B" : "URL B"}
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
            />
          </div>
        </div>
        <Button
          id="compare-submit-btn"
          type="submit"
          variant="primary"
          size="lg"
          loading={compare.isPending}
          className="compare-submit"
        >
          Execute Forensic Match
        </Button>
      </form>

      {result && (
        <div className="compare-result anim-entry">
          <DecisionLayer result={result} />

          <div className="compare-panels">
            <SidePanel data={result.a} winner={result.winner} side="a" />
            <SidePanel data={result.b} winner={result.winner} side="b" />
          </div>

          <ComparisonTable a={result.a} b={result.b} />

          <div className="compare-recommendation report-card">
            <div className="bl-header">
              <ShieldCheck size={13} /> <span>OPERATIONAL DIRECTIVE</span>
            </div>
            <p className="recommendation-text">
              {result.winner === "tie"
                ? "Risk parity detected. We advise against procurement from either storefront. Mathematical delta is zero."
                : `Procurement Priority: ${result.winner === "a" ? result.a.hostname : result.b.hostname}. The target exhibits superior signal integrity and merchant verification levels.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
