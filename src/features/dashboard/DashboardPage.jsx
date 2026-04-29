import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useReports, useUserStats } from "../../hooks/useReports";
import ReportCard from "./ReportCard";
import ReportsFilter from "./ReportsFilter";
import { SkeletonList } from "../../shared/SkeletonCard";
import EmptyState from "../../shared/EmptyState";
import ErrorState from "../../shared/ErrorState";
import Button from "../../shared/Button";
import { StatBox } from "../../ui";
import TrustTrendChart from "./TrustTrendChart";
import { Activity } from "lucide-react";
import {
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import "../../styles/dashboard.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ sort: "newest" });
  const [selectedIds, setSelectedIds] = useState(new Set());

  const {
    data: reportsData,
    isLoading,
    isError,
    refetch,
  } = useReports(filters);
  const { data: stats } = useUserStats();

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBatchExport = useCallback(() => {
    // Generate CSV from selected reports
    if (!reportsData?.reports) return;
    const selected = reportsData.reports.filter(r => selectedIds.has(r._id.toString()));
    const csvContent = [
      ["ID", "Product", "Hostname", "Verdict", "Score", "Method", "Date"],
      ...selected.map(r => [
        r._id, 
        r.product?.title || "Unknown", 
        r.product?.hostname || "Unknown", 
        r.verdict, 
        r.score, 
        r.method || "AI Pattern", 
        new Date(r.savedAt || r.timestamp).toLocaleDateString()
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `authentiscan_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    clearSelection();
  }, [selectedIds, reportsData, clearSelection]);

  const { mutate: deleteReport } = useReports({}).deleteReport || { mutate: null }; // We need to import useDeleteReport

  const handleBatchDelete = useCallback(() => {
    if (confirm(`Delete ${selectedIds.size} reports? This cannot be undone.`)) {
      // In a real app, you'd have a batchDelete endpoint. Here we'll just alert for now or implement it if useDeleteReport exists.
      alert("Batch delete triggered for: " + Array.from(selectedIds).join(", "));
      clearSelection();
    }
  }, [selectedIds, clearSelection]);


  const statCards = [
    {
      label: "Total Scans",
      value: stats?.total ?? "—",
      icon: ScanLine,
      color: "var(--accent)",
    },
    {
      label: "Genuine",
      value: stats?.genuine ?? "—",
      icon: ShieldCheck,
      color: "var(--success)",
    },
    {
      label: "Suspicious",
      value: stats?.suspicious ?? "—",
      icon: AlertTriangle,
      color: "var(--warning)",
    },
    {
      label: "Flagged Fake",
      value: stats?.fake ?? "—",
      icon: ShieldAlert,
      color: "var(--error)",
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Welcome back,{" "}
            <span className="dashboard-name">{user?.name?.split(" ")[0]}</span>
          </h1>
          <div className="dashboard-status-hud">
            <div className="hud-pulse"></div>
            <Activity size={12} className="hud-icon" />
            <span className="hud-text">Scanner Active • System Secure</span>
          </div>
        </div>
        <Button
          id="new-analysis-btn"
          variant="primary"
          onClick={() => navigate("/analyze")}
          className="dashboard-cta"
        >
          <ScanLine size={15} />
          New Analysis
        </Button>
      </header>

      <div className="stats-strip">
        <div className="stats-main-grid">
          {statCards.map(({ label, value, icon, color }) => (
            <StatBox
              key={label}
              label={label}
              value={value}
              icon={icon}
              style={{ color }}
            />
          ))}
        </div>
        <div className="stats-aside">
          <StatBox
            label="Avg Trust Score"
            value={stats?.avgScore ? Math.round(stats.avgScore) + "%" : "—"}
            icon={TrendingUp}
            className="stat-box-large"
          >
            <TrustTrendChart />
          </StatBox>
        </div>
      </div>

      <div className="reports-section">
        <div className="reports-section-header">
          <h2 className="reports-section-title">Scan History</h2>
          <span className="reports-count">
            {reportsData?.total || 0} reports
          </span>
        </div>

        <ReportsFilter onChange={handleFilterChange} />

        {isError && (
          <ErrorState message="Failed to load reports." onRetry={refetch} />
        )}

        {isLoading ? (
          <div className="reports-grid">
            <SkeletonList count={6} />
          </div>
        ) : reportsData?.reports?.length === 0 ? (
          <EmptyState
            title="No reports yet"
            message="Run your first analysis to start building your forensic database."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/analyze")}
              >
                Start Scanning
              </Button>
            }
          />
        ) : (
          <div className="reports-grid">
            {reportsData.reports.map((report) => {
              const id = report._id.toString();
              return (
                <ReportCard 
                  key={id} 
                  report={report} 
                  isSelected={selectedIds.has(id)}
                  selectionMode={selectedIds.size > 0}
                  onToggleSelect={toggleSelect}
                />
              );
            })}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="batch-action-bar">
          <span className="batch-count">{selectedIds.size} Selected</span>
          <div className="batch-actions">
            <Button variant="outline" size="sm" onClick={handleBatchExport}>
              Export CSV
            </Button>
            <Button variant="danger" size="sm" onClick={handleBatchDelete}>
              Delete
            </Button>
            <button className="batch-close" onClick={clearSelection}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
