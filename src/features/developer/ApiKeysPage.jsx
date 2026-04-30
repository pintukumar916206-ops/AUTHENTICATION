import React, { useState } from "react";
import { Key, Copy, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import useUIStore from "../../store/uiStore";
import Button from "../../shared/Button";
import "../../styles/dashboard.css";

export default function ApiKeysPage() {
  const { addToast } = useUIStore();
  const [keys, setKeys] = useState([
    {
      id: 1,
      name: "Production API",
      prefix: "auth_prod_",
      key: "auth_prod_8f92j...",
      fullKey: "auth_prod_8f92jxk39dlz01m",
      created: "4/20/2026",
      lastUsed: "Today",
    },
    {
      id: 2,
      name: "Staging Testing",
      prefix: "auth_test_",
      key: "auth_test_1m49c...",
      fullKey: "auth_test_1m49cvb82nxq77p",
      created: "4/29/2026",
      lastUsed: "Yesterday",
    },
  ]);
  const [visibleKey, setVisibleKey] = useState(null);

  const handleCopy = (fullKey) => {
    navigator.clipboard.writeText(fullKey);
    addToast("API Key copied to clipboard", "success");
  };

  const handleGenerate = () => {
    const newKey = `auth_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setKeys([
      {
        id: Date.now(),
        name: "New API Key",
        prefix: "auth_live_",
        key: newKey.substring(0, 15) + "...",
        fullKey: newKey,
        created: new Date().toLocaleDateString(),
        lastUsed: "Never",
      },
      ...keys,
    ]);
    addToast("New API Key generated", "success");
  };

  const handleRevoke = (id) => {
    if (
      confirm(
        "Revoke this API key? Any systems using it will be instantly locked out.",
      )
    ) {
      setKeys(keys.filter((k) => k.id !== id));
      addToast("API Key revoked", "info");
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Developer API</h1>
          <p className="dashboard-sub">
            Manage your active API keys and integrations
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleGenerate}
          className="dashboard-cta"
        >
          <Plus size={15} />
          Generate New Key
        </Button>
      </header>

      <div className="reports-section">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header">
                <th style={{ padding: "16px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "16px", textAlign: "left" }}>API Key</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Created</th>
                <th style={{ padding: "16px", textAlign: "left" }}>
                  Last Used
                </th>
                <th style={{ padding: "16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "var(--text-grey)",
                    }}
                  >
                    No active API keys found. Generate one to start building.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="admin-table-row">
                    <td style={{ padding: "16px" }}>
                      <div
                        className="admin-cell-title"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Key size={14} color="var(--nothing-red)" />
                        {k.name}
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.85rem",
                          color: "var(--text-grey)",
                        }}
                      >
                        {visibleKey === k.id ? k.fullKey : k.key}
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setVisibleKey(visibleKey === k.id ? null : k.id)
                          }
                          title={visibleKey === k.id ? "Hide key" : "Show key"}
                        >
                          {visibleKey === k.id ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-grey)" }}>
                      {k.created}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-grey)" }}>
                      {k.lastUsed}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div
                        className="admin-cell-actions"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          className="admin-action"
                          onClick={() => handleCopy(k.fullKey)}
                          title="Copy Key"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          className="admin-action admin-action-del"
                          onClick={() => handleRevoke(k.id)}
                          title="Revoke Key"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
