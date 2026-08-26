import React from 'react';

/**
 * CostTelemetryCard — Real-time execution and economic observability monitor
 * Displays token usage, batch latency, estimated cost per patent, and pipeline health.
 */
export default function CostTelemetryCard({ telemetry, summary }) {
  if (!telemetry && !summary) {
    return (
      <div className="telemetry-card-empty font-mono">
        <span className="telemetry-icon">⚡</span>
        <span>Awaiting RocketRide pipeline execution telemetry...</span>
      </div>
    );
  }

  const durationSec = telemetry?.durationMs ? (telemetry.durationMs / 1000).toFixed(2) : '0.00';
  const totalTokens = telemetry?.totalTokens || 0;
  const totalCost = telemetry?.estimatedCostTotalUSD ? `$${telemetry.estimatedCostTotalUSD.toFixed(4)}` : '$0.0000';
  const avgCost = telemetry?.avgCostPerPatentUSD ? `$${telemetry.avgCostPerPatentUSD.toFixed(4)}` : '$0.0000';
  const latencyPerItem = telemetry?.averageLatencyPerPatentMs || 0;

  return (
    <div className="telemetry-card-container">
      <div className="telemetry-header">
        <div className="telemetry-title-line">
          <span className="pulse-dot"></span>
          <span className="telemetry-title font-mono">ROCKETRIDE PIPELINE OBSERVABILITY</span>
        </div>
        <span className="telemetry-badge-engine font-mono">
          {telemetry?.pipelineEngine || 'RocketRide Wave Multi-Agent'}
        </span>
      </div>

      <div className="telemetry-metrics-grid font-mono">
        <div className="telemetry-metric-box">
          <span className="metric-lbl">TOTAL RUNTIME</span>
          <span className="metric-val accent">{durationSec}s</span>
          <span className="metric-sub">{latencyPerItem} ms / patent</span>
        </div>

        <div className="telemetry-metric-box">
          <span className="metric-lbl">TOKEN THROUGHPUT</span>
          <span className="metric-val">{totalTokens.toLocaleString()}</span>
          <span className="metric-sub">{telemetry?.totalPromptTokens || 0} in · {telemetry?.totalCompletionTokens || 0} out</span>
        </div>

        <div className="telemetry-metric-box">
          <span className="metric-lbl">ESTIMATED RUN COST</span>
          <span className="metric-val text-accent">{totalCost}</span>
          <span className="metric-sub">Claude 3.5 + GPT-5 rates</span>
        </div>

        <div className="telemetry-metric-box">
          <span className="metric-lbl">AVG COST / ASSET</span>
          <span className="metric-val text-accent">{avgCost}</span>
          <span className="metric-sub">Predictable unit economics</span>
        </div>
      </div>

      {summary && (
        <div className="telemetry-breakdown-row font-mono">
          <div className="breakdown-stat">
            <span className="stat-name">SUBMITTED:</span>
            <strong>{summary.totalSubmitted}</strong>
          </div>
          <div className="breakdown-stat">
            <span className="stat-name">PROCESSED:</span>
            <strong>{summary.totalProcessed}</strong>
          </div>
          <div className="breakdown-stat">
            <span className="stat-name">AUTO-STAGED:</span>
            <strong className="text-accent">{summary.autoRecommendedCount}</strong>
          </div>
          <div className="breakdown-stat">
            <span className="stat-name">HUMAN REVIEW:</span>
            <strong className="text-warning">{summary.humanReviewRequiredCount}</strong>
          </div>
          <div className="breakdown-stat">
            <span className="stat-name">QUARANTINED:</span>
            <strong className="text-urgent">{summary.totalQuarantined}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
