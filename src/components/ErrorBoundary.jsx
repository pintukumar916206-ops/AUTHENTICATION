import React from "react";

/**
 * ErrorBoundary - Catches React component errors and displays a fallback UI
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrapper">
          <div className="glass-card error-card">
            <h2 className="error-header">⚠️ PROTOCOL_ERROR</h2>
            <p className="error-text">
              An unexpected forensic failure occurred. System reboot recommended.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>RECOVERY_LOG</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
            <button className="terminal-btn" onClick={() => window.location.reload()}>
              REBOOT_SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
