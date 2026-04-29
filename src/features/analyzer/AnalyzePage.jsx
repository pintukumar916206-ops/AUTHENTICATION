import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import useUIStore from "../../store/uiStore";
import useAuthStore from "../../store/authStore";
import Button from "../../shared/Button";
import TerminalLog from "../../components/TerminalLog";
import ErrorBoundary from "../../components/ErrorBoundary";
import { ScanLine, LinkIcon } from "lucide-react";

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [booting, setBooting] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  const analyze = useMutation({
    mutationFn: (url) => api.post("/api/analyze", { url }),
    onSuccess: (data) => {
      if (data.result) {
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        addToast("Analysis complete!", "success");
        if (data.result._id) navigate(`/reports/${data.result._id}`);
      } else if (data.jobId) {
        setActiveJob(data.jobId);
        pollJob(data.jobId);
      }
    },
    onError: (err) => {
      addToast(err.message || "Analysis failed. Check the URL and try again.", "error");
      setLogs((prev) => [...prev, `CRITICAL_ERROR: ${err.message}`]);
    },
  });

  const pollJob = useCallback((jobId) => {
    const token = useAuthStore.getState().token;
    const es = new EventSource(`/api/status/${jobId}?token=${token}`);
    eventSourceRef.current = es;

    es.addEventListener("LOG", (e) => {
      const { message } = JSON.parse(e.data);
      setLogs((prev) => [...prev, message]);
    });

    es.addEventListener("COMPLETE", (e) => {
      const result = JSON.parse(e.data);
      es.close();
      setActiveJob(null);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      addToast("Analysis complete!", "success");
      if (result._id) navigate(`/reports/${result._id}`);
    });

    es.addEventListener("ERROR", (e) => {
      const { message } = JSON.parse(e.data);
      es.close();
      setActiveJob(null);
      addToast(message || "Analysis failed", "error");
      setLogs((prev) => [...prev, `CRITICAL_EXCEPTION: ${message}`]);
    });
  }, [queryClient, addToast, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) { addToast("Please enter a URL", "warning"); return; }
    try { new URL(url); } catch {
      addToast("Invalid URL format", "error"); return;
    }
    setBooting(false);
    setLogs(["SIGNAL_CAPTURE: START", `TARGET_URI: ${url}`, "HANDSHAKE: IN_PROGRESS..."]);
    analyze.mutate(url);
  };

  const isLoading = analyze.isPending || Boolean(activeJob);

  return (
    <div className="analyze-page">
      <header className="analyze-header">
        <h1 className="analyze-title">Forensic Analysis</h1>
        <p className="analyze-sub">Paste any e-commerce product URL to run a full forensic audit</p>
      </header>

      <ErrorBoundary>
        <form className="analyzer-form" onSubmit={handleSubmit}>
          <div className="input-container">
            <div className="input-label">
              <LinkIcon size={10} style={{ display: "inline", marginRight: 4 }} />
              TARGET_URI
            </div>
            <input
              id="analyze-url-input"
              className="forensic-input"
              type="url"
              placeholder="https://amazon.com/dp/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              aria-label="Product URL to analyze"
            />
          </div>
          <Button
            id="analyze-submit-btn"
            type="submit"
            variant="primary"
            loading={isLoading}
            className="analyze-btn"
          >
            {isLoading ? "Analyzing..." : (
              <>
                <ScanLine size={16} />
                Run Audit
              </>
            )}
          </Button>
        </form>

        <TerminalLog logs={logs} booting={booting} />
      </ErrorBoundary>
    </div>
  );
}
