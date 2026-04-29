import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import ForensicReport from "../../components/ForensicReport";
import { SkeletonList } from "../../shared/SkeletonCard";
import ErrorState from "../../shared/ErrorState";
import { ScanLine, Lock } from "lucide-react";

export default function SharePage() {
  const { token } = useParams();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["share", token],
    queryFn: () => api.get(`/api/share/${token}`),
    retry: 0,
  });

  return (
    <div className="share-page">
      <header className="share-header">
        <div className="share-brand">
          <span className="brand-mark">A</span>
          <span className="share-brand-name">AuthentiScan</span>
        </div>
        <div className="share-lock">
          <Lock size={12} />
          <span>Shared Report</span>
        </div>
      </header>

      <main className="share-main">
        {isLoading && <SkeletonList count={3} />}
        {isError && (
          <ErrorState message="This report link has expired or doesn't exist." />
        )}
        {report && (
          <div className="share-content">
            <div className="share-notice">
              This is a read-only forensic report shared via AuthentiScan.
            </div>
            <ForensicReport data={report} onReset={() => {}} />
          </div>
        )}
      </main>

      <footer className="share-footer">
        <Link to="/auth/signup" className="share-cta">
          <ScanLine size={14} />
          Run your own forensic scan — it&apos;s free
        </Link>
      </footer>
    </div>
  );
}
