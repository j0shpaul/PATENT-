import React, { useState } from 'react';
import { formatPatentCost } from '../utils/currency';
import { getDaysToRenewal } from '../utils/dates';

export default function ScatterPlotMatrix({ patents = [], onSelectPatent, selectedPatentId }) {
  const [hoveredPatent, setHoveredPatent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const MAX_DAYS = 1400;

  const getDaysClamped = (deadlineStr) => {
    const diff = getDaysToRenewal(deadlineStr);
    return Math.max(5, Math.min(MAX_DAYS, diff));
  };

  const getPointColor = (score, isFlagged) => {
    if (score < 40 || isFlagged) return 'var(--urgent)';
    if (score < 70) return 'var(--warning)';
    return 'var(--accent)';
  };

  const width = 940;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 32, left: 45 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scales
  const scaleX = (days) => padding.left + (days / MAX_DAYS) * plotWidth;
  const scaleY = (score) => padding.top + plotHeight - (score / 100) * plotHeight;

  // 90-day threshold line
  const thresholdX = scaleX(90);
  const score50Y = scaleY(50);
  const score70Y = scaleY(70);

  const handleMouseEnter = (pat, e) => {
    const cx = scaleX(getDaysToRenewal(pat.renewalDeadline));
    const cy = scaleY(pat.businessValueScore);
    setHoveredPatent(pat);
    setTooltipPos({ x: cx, y: cy });
  };

  const handleMouseLeave = () => {
    setHoveredPatent(null);
  };

  return (
    <div className="matrix-panel">
      <div className="matrix-header">
        <div className="matrix-title-group">
          <div className="matrix-kicker">LEVEL 1 · STRATEGIC RADAR</div>
          <span className="matrix-title">PORTFOLIO EXPOSURE MATRIX</span>
          <span className="matrix-subtitle">Business Value (0–100) vs. Renewal Urgency (0–1,400 Days)</span>
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
          {/* Subtle Quadrant Background Highlights */}
          {/* Top Left: ACT NOW (Urgent + High Score) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={thresholdX - padding.left}
            height={score50Y - padding.top}
            fill="rgba(45, 212, 167, 0.03)"
          />
          {/* Top Right: PROTECT (Distant + High Score) */}
          <rect
            x={thresholdX}
            y={padding.top}
            width={width - padding.right - thresholdX}
            height={score50Y - padding.top}
            fill="rgba(45, 212, 167, 0.015)"
          />
          {/* Bottom Left: ALLOW TO LAPSE (Urgent + Low Score) */}
          <rect
            x={padding.left}
            y={score50Y}
            width={thresholdX - padding.left}
            height={height - padding.bottom - score50Y}
            fill="rgba(255, 107, 92, 0.04)"
          />
          {/* Bottom Right: MONITOR (Distant + Low/Med Score) */}
          <rect
            x={thresholdX}
            y={score50Y}
            width={width - padding.right - thresholdX}
            height={height - padding.bottom - score50Y}
            fill="rgba(245, 158, 11, 0.02)"
          />

          {/* Quadrant Watermark Labels */}
          <text
            x={padding.left + 12}
            y={padding.top + 22}
            fill="var(--accent)"
            opacity="0.4"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.08em"
          >
            ACT NOW (URGENT / HIGH VALUE)
          </text>

          <text
            x={width - padding.right - 12}
            y={padding.top + 22}
            textAnchor="end"
            fill="var(--text-muted)"
            opacity="0.5"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.08em"
          >
            PROTECT (CORE RUNWAY)
          </text>

          <text
            x={padding.left + 12}
            y={height - padding.bottom - 12}
            fill="var(--urgent)"
            opacity="0.5"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.08em"
          >
            ALLOW TO LAPSE (LOW ROI)
          </text>

          <text
            x={width - padding.right - 12}
            y={height - padding.bottom - 12}
            textAnchor="end"
            fill="var(--text-muted)"
            opacity="0.4"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.08em"
          >
            MONITOR (MID RUNWAY)
          </text>

          {/* Gridlines */}
          <line
            x1={padding.left}
            y1={score50Y}
            x2={width - padding.right}
            y2={score50Y}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={score70Y}
            x2={width - padding.right}
            y2={score70Y}
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
            x={thresholdX + 5}
            y={score70Y - 8}
            fill="var(--urgent)"
            fontFamily="var(--font-mono)"
            fontSize="8.5"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            ◀ 90D DEADLINE WINDOW
          </text>

          {/* Axis Labels */}
          <text
            x={padding.left}
            y={height - 8}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9"
          >
            0d (Immediate)
          </text>
          <text
            x={scaleX(365)}
            y={height - 8}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9"
            textAnchor="middle"
          >
            1 Year
          </text>
          <text
            x={scaleX(730)}
            y={height - 8}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9"
            textAnchor="middle"
          >
            2 Years
          </text>
          <text
            x={scaleX(1095)}
            y={height - 8}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9"
            textAnchor="middle"
          >
            3 Years
          </text>
          <text
            x={width - padding.right}
            y={height - 8}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="9"
            textAnchor="end"
          >
            ~4 Years
          </text>

          {/* Y Axis Score Labels */}
          <text
            x={padding.left - 6}
            y={padding.top + 4}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="8.5"
            textAnchor="end"
          >
            100
          </text>
          <text
            x={padding.left - 6}
            y={score70Y + 3}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="8.5"
            textAnchor="end"
          >
            70
          </text>
          <text
            x={padding.left - 6}
            y={score50Y + 3}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="8.5"
            textAnchor="end"
          >
            50
          </text>
          <text
            x={padding.left - 6}
            y={height - padding.bottom}
            fill="var(--text-dim)"
            fontFamily="var(--font-mono)"
            fontSize="8.5"
            textAnchor="end"
          >
            0
          </text>

          {/* Data Points */}
          {patents.map((pat) => {
            const days = getDaysClamped(pat.renewalDeadline);
            const cx = scaleX(days);
            const cy = scaleY(pat.businessValueScore);
            const isSelected = selectedPatentId === pat.id;
            const color = getPointColor(pat.businessValueScore, pat.isFlagged);
            const radius = isSelected ? 6.5 : pat.isFlagged ? 4.5 : 3.5;

            return (
              <g
                key={pat.id}
                className="matrix-node-group"
                onClick={() => onSelectPatent && onSelectPatent(pat)}
                onMouseEnter={(e) => handleMouseEnter(pat, e)}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                {/* Selection Halo */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 4}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}
                {/* Urgency Pulse Ring for low-value flagged */}
                {pat.isFlagged && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 3}
                    fill="none"
                    stroke="var(--urgent)"
                    opacity="0.3"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={color}
                  opacity={isSelected ? 1 : 0.82}
                  stroke="var(--bg-app)"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPatent && (
          <div
            className="matrix-tooltip"
            style={{
              left: `${Math.min(width - 240, Math.max(10, tooltipPos.x - 110))}px`,
              top: `${Math.max(10, tooltipPos.y - 85)}px`,
            }}
          >
            <div className="matrix-tooltip-header">
              <span className="tooltip-id">{hoveredPatent.patentNumber}</span>
              <span className={`badge-jur`}>{hoveredPatent.jurisdiction}</span>
              <span className={`tooltip-tier ${hoveredPatent.businessValueScore >= 70 ? 'high' : hoveredPatent.businessValueScore < 40 ? 'low' : 'med'}`}>
                {hoveredPatent.businessValueScore}/100
              </span>
            </div>
            <div className="matrix-tooltip-title">
              {hoveredPatent.title}
            </div>
            <div className="matrix-tooltip-meta">
              <span>{getDaysToRenewal(hoveredPatent.renewalDeadline)} days to deadline</span>
              <span>Fee: {formatPatentCost(hoveredPatent.renewalCost, hoveredPatent.jurisdiction, { showCode: true })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
