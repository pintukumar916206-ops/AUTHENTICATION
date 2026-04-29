import React from 'react';

export default function TrustTrendChart({ data = [40, 65, 55, 80, 75, 90, 85] }) {
  const width = 300;
  const height = 60;
  const padding = 5;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((d - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="trust-trend-container">
      <div className="tt-header">
        <span className="tt-label">Trust Trend (7d)</span>
        <span className="tt-value text-success">+12%</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="tt-svg">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M ${points} L ${width - padding},${height} L ${padding},${height} Z`}
          fill="url(#chartGradient)"
        />
        <polyline
          fill="none"
          stroke="var(--success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="tt-path"
        />
      </svg>
    </div>
  );
}
