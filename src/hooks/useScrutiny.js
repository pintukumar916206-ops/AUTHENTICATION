import { useRef } from "react";
import useScrutinyStore from "../store/useScrutinyStore";

/**
 * useScrutiny - Hook for product analysis
 * Handles API calls, error management, and report copying
 * @returns {Object} Analysis and report functions
 * @returns {Function} analyze - Analyze a product URL
 * @returns {Function} copyReport - Copy analysis report to clipboard
 */
export function useScrutiny() {
  const { setResult, setLoading, setError, setCopied, addLog, clearLogs, setHistory } = useScrutinyStore();
  const abortControllerRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (res.ok) setHistory(data);
    } catch {}
  };

  const analyze = async (url) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setResult(null);
    clearLogs();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Connection failed");
      }

      const { jobId, result } = await response.json();
      
      // If cached result exists, skip streaming
      if (result) {
        setResult(result);
        setLoading(false);
        return;
      }

      // Start Job-based SSE Stream
      const sseResponse = await fetch(`/api/status/${jobId}`, {
        method: "GET",
        signal: abortControllerRef.current.signal,
      });

      const reader = sseResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const event = line.replace("event: ", "").trim();
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine && nextLine.startsWith("data: ")) {
              const data = JSON.parse(nextLine.replace("data: ", "").trim());
              
              if (event === "LOG") addLog(data.message);
              if (event === "COMPLETE") {
                setResult(data);
                fetchHistory();
              }
              if (event === "ERROR") throw new Error(data.message);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyReport = (result) => {
    if (!result) return;
    const report = `[AUTHENTISCAN BULLETIN]
Verdict: ${result.verdict}
Score: ${result.score}/100
Summary: ${result.summary}
Analyze by: AuthentiScan Forensic Engine`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return { analyze, copyReport, fetchHistory };
}
