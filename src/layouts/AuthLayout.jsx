import React from "react";
import "../styles/auth.css";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-bg-nothing">
        <div className="nothing-line" />
      </div>
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo-mark">A</div>
          <div className="auth-logo-text">
            <span className="auth-logo-title">AuthentiScan</span>
            <span className="auth-logo-sub">Forensic Intelligence Platform</span>
          </div>
        </div>
        <div className="auth-card">
          {children}
        </div>
      </div>
    </div>
  );
}
