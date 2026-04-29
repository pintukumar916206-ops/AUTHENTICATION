import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/**
 * PriceInsights - Aggregates historical market data and compares with current result.
 */
export default function PriceInsights({ currentPrice, hostname }) {
  const [marketStats, setMarketStats] = useState(null);

  useEffect(() => {
    if (hostname) {
      fetch(`/api/trends/${hostname}`)
        .then(res => res.json())
        .then(data => setMarketStats(data))
        .catch(() => {});
    }
  }, [hostname]);

  if (!marketStats || marketStats.message === "NO_HIST_DATA") {
    return (
      <div className="insights-empty anim-entry">
        <p className="tagline">INSUFFICIENT_MARKET_HISTORY_FOR_PROFILING</p>
      </div>
    );
  }

  const data = [
    { name: 'MIN_DB', price: marketStats.minPrice, color: '#444' },
    { name: 'AVG_DB', price: Math.round(marketStats.avgPrice), color: '#888' },
    { name: 'CURRENT', price: currentPrice, color: '#fff' },
  ];

  return (
    <div className="insights-container anim-entry">
      <div className="card-header-mini">MARKET_PRICE_VOLATILITY_ANALYSIS</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} 
          />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: 11 }}
            itemStyle={{ color: '#fff' }}
          />
          <Bar dataKey="price">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="insights-footer">
        <span className="tag-micro">SAMPLES_SCANNED: {marketStats.scanCount}</span>
        <span className="tag-micro">HOST_RELIABILITY: {Math.round(marketStats.avgScore)}%</span>
      </div>
    </div>
  );
}
