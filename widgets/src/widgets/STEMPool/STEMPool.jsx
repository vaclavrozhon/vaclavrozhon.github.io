import React from 'react';

/**
 * STEMPool - Visualizes the pool of STEM-loving people split 80-20 men/women
 * Shows fractions p_men and p_women who watch YouTube STEM videos
 */
export default function STEMPool() {
  const totalWidth = 560;
  const poolHeight = 140;
  const chartTop = 30;
  const chartHeight = 300;
  const maleWidth = totalWidth * 0.8;
  const femaleWidth = totalWidth * 0.2;
  const pMen = 0.6; // illustrative share among men
  const pWomen = 0.4; // illustrative share among women

  return (
    <div style={{
      maxWidth: '600px',
      margin: '2rem auto',
      padding: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        fontSize: '0.95rem',
        color: '#666',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}>
        Pool of STEM-loving people (80% men, 20% women)
      </div>

      <svg width="100%" height={chartHeight} viewBox={`0 0 ${totalWidth} ${chartHeight}`}>
        <defs>
          <linearGradient id="maleGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6fb5ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4a90e2" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="femaleGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff6fa3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e91e63" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Men section */}
        <rect
          x="0"
          y={chartTop}
          width={maleWidth}
          height={poolHeight}
          fill="url(#maleGradient)"
          opacity={0.25}
          stroke="#4a90e2"
          strokeWidth="2"
          rx="12"
          ry="12"
        />
        <text
          x={maleWidth / 2}
          y={chartTop + poolHeight / 2}
          textAnchor="middle"
          fontSize="16"
          fontWeight="600"
          fill="#1976d2"
        >
          Men (80%)
        </text>

        {/* Highlight p_men portion */}
        <rect
          x="10"
          y={chartTop + 10}
          width={maleWidth * pMen}
          height={poolHeight - 20}
          fill="#4a90e2"
          opacity={0.8}
          rx="10"
          ry="10"
        />
        <text
          x={Math.max(18, maleWidth * pMen * 0.5 + 10)}
          y={chartTop + poolHeight + 30}
          textAnchor="middle"
          fontSize="14"
          fontStyle="italic"
          fill="#1976d2"
        >
          {"p"}
          <tspan baselineShift="-30%" fontSize="10">men</tspan>
          {" watch YouTube"}
        </text>

        {/* Women section */}
        <rect
          x={maleWidth}
          y={chartTop}
          width={femaleWidth}
          height={poolHeight}
          fill="url(#femaleGradient)"
          opacity={0.25}
          stroke="#e91e63"
          strokeWidth="2"
          rx="12"
          ry="12"
        />
        <text
          x={maleWidth + femaleWidth / 2}
          y={chartTop + poolHeight / 2 - 8}
          textAnchor="middle"
          fontSize="16"
          fontWeight="600"
          fill="#c2185b"
        >
          Women
        </text>
        <text
          x={maleWidth + femaleWidth / 2}
          y={chartTop + poolHeight / 2 + 12}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#c2185b"
        >
          (20%)
        </text>

        {/* Highlight p_women portion */}
        <rect
          x={maleWidth + 5}
          y={chartTop + 10}
          width={femaleWidth * pWomen}
          height={poolHeight - 20}
          fill="#e91e63"
          opacity={0.85}
          rx="10"
          ry="10"
        />
        <text
          x={maleWidth + Math.max(18, femaleWidth * pWomen * 0.5 + 5)}
          y={chartTop + poolHeight + 30}
          textAnchor="middle"
          fontSize="12"
          fontStyle="italic"
          fill="#c2185b"
        >
          {"p"}
          <tspan baselineShift="-30%" fontSize="9.5">women</tspan>
        </text>
        <text
          x={maleWidth + Math.max(18, femaleWidth * pWomen * 0.5 + 5)}
          y={chartTop + poolHeight + 48}
          textAnchor="middle"
          fontSize="12"
          fontStyle="italic"
          fill="#c2185b"
        >
          watch YT
        </text>
      </svg>

      <div style={{
        fontSize: '0.95rem',
        color: '#4b5563',
        marginTop: '1.25rem',
        textAlign: 'center',
      }}>
        Question: Is
        {' p'}<span style={{ fontSize: '0.8em', verticalAlign: 'sub' }}>men</span>
        {' ≈ p'}<span style={{ fontSize: '0.8em', verticalAlign: 'sub' }}>women</span>
        {', or is p'}<span style={{ fontSize: '0.8em', verticalAlign: 'sub' }}>men</span>
        {' ≫ p'}<span style={{ fontSize: '0.8em', verticalAlign: 'sub' }}>women</span>
        {'?'}
      </div>
    </div>
  );
}
