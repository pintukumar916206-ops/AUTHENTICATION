import React, { useState, useEffect } from 'react';

const LOAD_VALUE = (Math.random() * 6 + 1).toFixed(2); // stable per session

export default function HUDOverlay() {
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${s}s`;
  };

  return (
    <>
      <div className="hud-decor top-left" />
      <div className="hud-decor top-right" />
      <div className="hud-decor bottom-left" />
      <div className="hud-decor bottom-right" />
      <div className="hud-meta-label hud-top-left">UPTIME: {formatUptime(sessionTime)}</div>
      <div className="hud-meta-label hud-top-right">ENGINE: v2.0.0</div>
      <div className="hud-meta-label hud-bottom-right">STATUS: ONLINE</div>
    </>
  );
}
