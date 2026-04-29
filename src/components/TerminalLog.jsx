import React, { useEffect, useRef, useState } from "react";

const BOOT_LINES = [
  "AUTHENTISCAN_OS v2.0.0 — KERNEL BOOT",
  "LOADING FORENSIC MODULES...",
  "SCRUTINY_ENGINE: ONLINE",
  "HEURISTIC_CORE: CALIBRATED",
  "GEMINI_NEURAL: STANDBY",
  "READY_FOR_COLLECTION ▊",
];

export default function TerminalLog({ logs, booting = false }) {
  const scrollRef = useRef(null);
  const [bootLines, setBootLines] = useState([]);

  // Animated boot sequence on first render
  useEffect(() => {
    if (!booting) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setBootLines((prev) => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [booting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, bootLines]);

  const displayLines = booting && bootLines.length > 0 && logs.length <= 3
    ? bootLines
    : logs;

  return (
    <div className="terminal-wrap">
      <div className="terminal-titlebar">
        <div className="terminal-dots">
          <span className="t-dot t-dot-red" />
          <span className="t-dot t-dot-yellow" />
          <span className="t-dot t-dot-green" />
        </div>
        <span className="terminal-title">LIVE_SYSTEM_TRACE // KERNEL_LOG_v2.5</span>
        <span className="terminal-status">
          <span className="terminal-pulse" />
          ACTIVE
        </span>
      </div>
      <div className="terminal-body" ref={scrollRef}>
        {displayLines.map((log, i) => (
          <div key={i} className="log-entry">
            <span className="log-time">[{new Date().toLocaleTimeString("en-GB")}]</span>
            <span className="log-msg">{log}</span>
          </div>
        ))}
        <div className="log-cursor">▊</div>
      </div>
    </div>
  );
}
