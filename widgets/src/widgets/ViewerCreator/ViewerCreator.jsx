import React from 'react';

/**
 * ViewerCreator - Visualizes the "birds of a feather" effect
 * Shows 10 viewers and 10 creators (9 male, 1 female each)
 * Demonstrates how same-gender preference affects viewership ratios
 */
export default function ViewerCreator() {
  const iconSize = 24;
  const spacing = 50;
  const maleColor = '#4a90e2';
  const femaleColor = '#e91e63';
  const crossColor = '#8a63d2'; // violet for male-female connections

  const viewerY = 50;
  const creatorY = 180;
  const startX = 30;

  return (
    <div style={{
      maxWidth: '700px',
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
        10 viewers × 10 creators (9 male, 1 female each)
      </div>

      <svg width="100%" height="280" viewBox="0 0 550 280">
        {/* Connection lines - draw all pairings with color coding */}
        {/* Define genders: viewers 0-8 male, 9 female; creators 0-8 male, 9 female */}
        {Array.from({ length: 10 }).map((_, vi) => (
          Array.from({ length: 10 }).map((__, ci) => {
            const viewerX = startX + vi * spacing;
            const creatorX = startX + ci * spacing;
            const isViewerFemale = vi === 9;
            const isCreatorFemale = ci === 9;
            // Color: red for female-female, violet for cross, blue for male-male
            const strokeColor = isViewerFemale && isCreatorFemale
              ? femaleColor
              : (!isViewerFemale && !isCreatorFemale)
                ? maleColor
                : crossColor;
            // Thickness hinting (optional): stronger for same-gender, lighter for cross
            const strokeWidth = isViewerFemale && isCreatorFemale
              ? 2.5
              : (!isViewerFemale && !isCreatorFemale)
                ? 1.5
                : 1;
            const opacity = isViewerFemale && isCreatorFemale
              ? 0.45
              : (!isViewerFemale && !isCreatorFemale)
                ? 0.25
                : 0.25;
            return (
              <line
                key={`v${vi}-c${ci}`}
                x1={viewerX}
                y1={viewerY}
                x2={creatorX}
                y2={creatorY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            );
          })
        ))}

        {/* Viewers row */}
        <text x={startX} y="25" fontSize="13" fontWeight="600" fill="#333">
          Viewers:
        </text>

        {/* 9 male viewers */}
        {Array.from({ length: 9 }).map((_, i) => (
          <circle
            key={`male-viewer-${i}`}
            cx={startX + i * spacing}
            cy={viewerY}
            r={iconSize / 2}
            fill={maleColor}
            opacity={0.8}
            stroke={maleColor}
            strokeWidth="1.5"
          />
        ))}

        {/* 1 female viewer */}
        <circle
          cx={startX + 9 * spacing}
          cy={viewerY}
          r={iconSize / 2}
          fill={femaleColor}
          opacity={0.8}
          stroke={femaleColor}
          strokeWidth="1.5"
        />

        {/* Creators row */}
        <text x={startX} y="210" fontSize="13" fontWeight="600" fill="#333">
          Creators:
        </text>

        {/* 9 male creators */}
        {Array.from({ length: 9 }).map((_, i) => (
          <rect
            key={`male-creator-${i}`}
            x={startX + i * spacing - iconSize / 2}
            y={creatorY - iconSize / 2}
            width={iconSize}
            height={iconSize}
            fill={maleColor}
            opacity={0.8}
            stroke={maleColor}
            strokeWidth="1.5"
          />
        ))}

        {/* 1 female creator */}
        <rect
          x={startX + 9 * spacing - iconSize / 2}
          y={creatorY - iconSize / 2}
          width={iconSize}
          height={iconSize}
          fill={femaleColor}
          opacity={0.8}
          stroke={femaleColor}
          strokeWidth="1.5"
        />

        {/* Legend */}
        <g>
          <rect x="10" y="232" width="12" height="4" fill={femaleColor} opacity="0.8" />
          <text x="28" y="236" fontSize="11" fill="#666">female → female</text>
          <rect x="150" y="232" width="12" height="4" fill={crossColor} opacity="0.8" />
          <text x="168" y="236" fontSize="11" fill="#666">cross-gender</text>
          <rect x="270" y="232" width="12" height="4" fill={maleColor} opacity="0.8" />
          <text x="288" y="236" fontSize="11" fill="#666">male → male</text>
        </g>
      </svg>
    </div>
  );
}
