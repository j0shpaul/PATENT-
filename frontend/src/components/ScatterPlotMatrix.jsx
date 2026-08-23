import React, { useState } from 'react';

export default function ScatterPlotMatrix({ patents = [], onSelectPatent, selectedPatentId }) {
  const [hoveredPatent, setHoveredPatent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const BASE_DATE = new Date('2026-08-23').getTime();
  const MAX_DAYS = 1400;

  const getDaysToRenewal = (deadlineStr) => {
    if (!deadlineStr) return 365;
    const dl = new Date(deadlineStr).getTime();
    const diff = Math.ceil((dl - BASE_DATE) / (1000 * 60 * 60 * 24));
    return Math.max(5, Math.min(MAX_DAYS, diff));
  };

  const getPointColor = (score, isFlagged) => {
    if (score < 40 || isFlagged) return 'var(--urgent)';
    if (score < 70) return 'var(--warning)';
    return 'var(--accent)';
  };

  const width = 940;
  const height = 140;
  const padding = { top: 12, right: 24, bottom: 24, left: 36 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scale functions
  const scaleX = (days) => padding.left + (days / MAX_DAYS) * plotWidth;
  const scaleY = (score) => padding.top + plotHeight - (score / 100) * plotHeight;

  // 90-day threshold line
  const thresholdX = scaleX(90);

  const handleMouseEnter = (pat, e) => {
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const cx = scaleX(getDaysToRenewal(pat.renewalDeadline));
    const cy = scaleY(pat.businessValueScore);
    setHoveredPatent(pat);
    setTooltipPos({
      x: cx,
      y: cy
    });
  };

  const handleMouseLeave = () => {
    setHoveredPatent(null);
  };

  return (
    <div className="matrix-panel">
      <div className="matrix-header">
        <div className="matrix-title-group">
          <span className="matrix-title">Portfolio Exposure Matrix</span>
          <span className="matrix-subtitle">Business Value (0–100) vs. Days to Renewal (0–1,400d)</span>
        </div>

        <div className="matrix-legend">
          <span><span className="legend-dot high" /> High Conviction (≥70)</span>
          <span><span className="legend-dot medium" /> Moderate (40–69)</span>
          <span><span className="legend-dot low" /> Low Value / Urgent (&lt;40)</span>
        </div>
      </div>

      <div className="matrix-chart-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Subtle Gridlines */}
          <line
            x1={padding.left}
            y1={scaleY(50)}
            x2={width - padding.right}
            y2={scaleY(50)}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={scaleY(70)}
            x2={width - padding.right}
            y2={scaleY(70)}
            stroke="var(--border)"
            strokeDasharray="2 2"
          />

          {/* 90-day Urgency Threshold Line */}
          <line
            x1={thresholdX}
            y1={padding.top}
            x2={thresholdX}
            y2={height - padding.bottom}
            stroke="var(--urgent-border)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={thresholdX + 6}
            y={padding.top + 10}
            fill="var(--urgent)"
            fontFamily="var(--font-mono)"
            fontSize="9"
            letterSpacing="0.05em"
          >
            90D DEADLINE
          </text>

          {/* Axis Labels */}
          <text
            x={padding.left}
            y={height - 6}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9.5"
          >
            0d (Immediate)
          </text>
          <text
            x={scaleX(365)}
            y={height - 6}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9.5"
            textAnchor="middle"
          >
            1 Year
          </text>
          <text
            x={scaleX(730)}
            y={height - 6}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9.5"
            textAnchor="middle"
          >
            2 Years
          </text>
          <text
            x={width - padding.right}
            y={height - 6}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9.5"
            textAnchor="end"
          >
            ~4 Years
          </text>

          <text
            x={padding.left - 8}
            y={padding.top + 6}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9.5"
            textAnchor="end"
          >
            100
          </text>
          <text
            x={padding.left - 8}
            y={scaleY(50) + 3}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9.5"
            textAnchor="end"
          >
            50
          </text>
          <text
            x={padding.left - 8}
            y={height - padding.bottom}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9.5"
            textAnchor="end"
          >
            0
          </text>

          {/* Plotted Patent Points */}
          {patents.map((pat) => {
            const days = getDaysToRenewal(pat.renewalDeadline);
            const cx = scaleX(days);
            const cy = scaleY(pat.businessValueScore);
            const color = getPointColor(pat.businessValueScore, pat.isFlagged);
            const isSelected = selectedPatentId === pat.id;
            const isHovered = hoveredPatent?.id === pat.id;

            return (
              <circle
                key={pat.id}
                cx={cx}
                cy={cy}
                r={isSelected || isHovered ? 5.5 : 3}
                fill={color}
                opacity={isHovered || isSelected ? 1 : 0.65}
                stroke={isSelected || isHovered ? '#fff' : 'none'}
                strokeWidth={isSelected || isHovered ? 1.5 : 0}
                className="scatter-dot"
                onMouseEnter={(e) => handleMouseEnter(pat, e)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onSelectPatent(pat)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPatent && (
          <div
            className="matrix-tooltip"
            style={{
              left: `${(tooltipPos.x / width) * 100}%`,
              top: `${tooltipPos.y}px`
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {hoveredPatent.patentNumber} — Value: {hoveredPatent.businessValueScore}/100
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              Deadline: {hoveredPatent.renewalDeadline} | Fee: ${hoveredPatent.renewalCost?.toLocaleString()}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '9.5px', marginTop: '2px' }}>
              Click point to open intelligence drawer
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
