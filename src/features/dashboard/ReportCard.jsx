import React, { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../shared/Badge";
import { Pin, Heart, Trash2, ExternalLink, Check } from "lucide-react";
import { usePinReport, useFavoriteReport, useDeleteReport } from "../../hooks/useReports";
import useUIStore from "../../store/uiStore";
import { cn } from "../../utils/cn";

const ReportCard = memo(({ report, isSelected, selectionMode, onToggleSelect }) => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { mutate: togglePin } = usePinReport();
  const { mutate: toggleFavorite } = useFavoriteReport();
  const { mutate: deleteReport } = useDeleteReport();

  const id = report._id?.toString();

  const handlePin = useCallback((e) => {
    e.stopPropagation();
    togglePin(id, { onError: () => addToast("Failed to update pin", "error") });
  }, [id, togglePin, addToast]);

  const handleFavorite = useCallback((e) => {
    e.stopPropagation();
    toggleFavorite(id, { onError: () => addToast("Failed to update favorite", "error") });
  }, [id, toggleFavorite, addToast]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (confirm("Delete this report? This cannot be undone.")) {
      deleteReport(id, {
        onSuccess: () => addToast("Report deleted", "success"),
        onError: () => addToast("Failed to delete report", "error"),
      });
    }
  }, [id, deleteReport, addToast]);

  const verdictColors = { GENUINE: "var(--success)", SUSPICIOUS: "var(--warning)", FAKE: "var(--error)" };
  const scoreColor = verdictColors[report.verdict] || "var(--accent-muted)";

  const handleCardClick = (e) => {
    if (selectionMode || e.shiftKey) {
      e.preventDefault();
      onToggleSelect && onToggleSelect(id);
    } else {
      navigate(`/reports/${id}`);
    }
  };

  return (
    <div
      className={cn(
        "report-card-item", 
        report.pinned && "report-card-pinned",
        isSelected && "report-card-selected",
        selectionMode && "selection-mode-active"
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick(e);
        }
      }}
    >
      <div 
        className={cn("rci-checkbox", isSelected && "rci-checkbox-checked")}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect && onToggleSelect(id);
        }}
      >
        {isSelected && <Check size={14} strokeWidth={3} />}
      </div>

      <div className="rci-top">
        <Badge verdict={report.verdict} />
        <span className="rci-score" style={{ color: scoreColor }}>{report.score}%</span>
      </div>

      <h3 className="rci-title" title={report.product?.title}>
        {report.product?.title || "Untitled Product"}
      </h3>

      <div className="rci-meta">
        <span className="rci-host">{report.product?.hostname || "Unknown"}</span>
        <div className="rci-method">
          <span className="method-label">Method:</span>
          <span className="method-val">{report.method || "AI Pattern"}</span>
        </div>
        <span className="rci-date">{new Date(report.savedAt || report.timestamp).toLocaleDateString()}</span>
      </div>

      <div className="rci-actions">
        <button
          className={cn("rci-action", report.pinned && "rci-action-active")}
          onClick={handlePin}
          title={report.pinned ? "Unpin" : "Pin"}
          aria-label="Toggle pin"
        >
          <Pin size={13} />
        </button>
        <button
          className={cn("rci-action", report.favorited && "rci-action-fav")}
          onClick={handleFavorite}
          title={report.favorited ? "Unfavorite" : "Favorite"}
          aria-label="Toggle favorite"
        >
          <Heart size={13} />
        </button>
        <button
          className="rci-action rci-action-open"
          onClick={(e) => { e.stopPropagation(); navigate(`/reports/${id}`); }}
          title="Open report"
          aria-label="Open report"
        >
          <ExternalLink size={13} />
        </button>
        <button
          className="rci-action rci-action-del"
          onClick={handleDelete}
          title="Delete"
          aria-label="Delete report"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
});

export default ReportCard;
