import React, { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReport, useShareReport } from "../../hooks/useReports";
import useUIStore from "../../store/uiStore";
import ForensicReport from "../../components/ForensicReport";
import Button from "../../shared/Button";
import ErrorState from "../../shared/ErrorState";
import { SkeletonList } from "../../shared/SkeletonCard";
import { exportReportPDF } from "../../utils/pdf";
import { Download, Share2, GitCompare, ArrowLeft, Bot } from "lucide-react";
import AICopilot from "./AICopilot";

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [aiOpen, setAiOpen] = useState(false);
  const { data: report, isLoading, isError, refetch } = useReport(id);
  const shareMutation = useShareReport();

  const handlePDF = useCallback(async () => {
    try {
      addToast("Generating PDF...", "info");
      await exportReportPDF("forensic-report-print", `authentiscan-${id}.pdf`);
      addToast("PDF downloaded!", "success");
    } catch {
      addToast("PDF export failed", "error");
    }
  }, [id, addToast]);

  const handleShare = useCallback(async () => {
    shareMutation.mutate(id, {
      onSuccess: ({ shareUrl }) => {
        navigator.clipboard.writeText(shareUrl).then(() => {
          addToast("Share link copied to clipboard!", "success");
        }).catch(() => {
          addToast(`Share link: ${shareUrl}`, "info", 8000);
        });
      },
      onError: () => addToast("Failed to generate share link", "error"),
    });
  }, [id, shareMutation, addToast]);

  if (isLoading) {
    return (
      <div className="report-page">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="report-page">
        <ErrorState message="Report not found or failed to load." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-page-toolbar">
        <button className="toolbar-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} />
          Dashboard
        </button>
        <div className="toolbar-actions">
          <Button
            id="compare-btn"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/compare?a=${id}`)}
          >
            <GitCompare size={14} />
            Compare
          </Button>
          <Button
            id="ai-copilot-btn"
            variant="primary"
            size="sm"
            onClick={() => setAiOpen(true)}
            style={{ background: 'var(--primary)', color: '#000' }}
          >
            <Bot size={14} />
            Ask AI Copilot
          </Button>
          <Button
            id="share-btn"
            variant="ghost"
            size="sm"
            onClick={handleShare}
            loading={shareMutation.isPending}
          >
            <Share2 size={14} />
            Share
          </Button>
          <Button
            id="pdf-export-btn"
            variant="outline"
            size="sm"
            onClick={handlePDF}
          >
            <Download size={14} />
            Export PDF
          </Button>
        </div>
      </div>

      <div id="forensic-report-print">
        <ForensicReport
          data={report}
          onReset={() => navigate("/analyze")}
        />
      </div>

      <AICopilot reportId={id} isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
