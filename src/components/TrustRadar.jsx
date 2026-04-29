import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

/**
 * TrustRadar - Visualizes trust vectors (Domain, Price, Seller, Density)
 * Uses forensic aesthetic: Dot-matrix style and monochromatic themes.
 */
export default function TrustRadar({ metrics }) {
  if (!metrics) return null;

  // Safeguard against missing data
  const val = (key) => (metrics[key] || 0) * 100;

  const data = [
    { subject: 'Domains', A: val('DOMAIN_TRUST'), fullMark: 100 },
    { subject: 'Pricing', A: val('PRICE_INTEGRITY'), fullMark: 100 },
    { subject: 'Seller', A: val('SELLER_REPUTATION'), fullMark: 100 },
    { subject: 'Density', A: val('DATA_DENSITY'), fullMark: 100 },
  ];

  return (
    <div className="radar-container anim-entry">
      <div className="card-header-mini">Analysis Factors</div>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#333" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} 
          />
          <Radar
            name="Trust"
            dataKey="A"
            stroke="#00ff9d"
            fill="#00ff9d"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
