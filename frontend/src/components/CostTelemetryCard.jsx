import React from 'react';

/**
 * CostTelemetryCard — Real-time execution and economic observability monitor
 * Truthfully displays wall-clock latency, token throughput, unit economics,
 * and batch summary breakdown based on the active inference engine.
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

  // 1. Batch counts extraction
  const submitted = summary?.totalSubmitted ?? telemetry?.submitted ?? 0;
  const processed = summary?.totalProcessed ?? telemetry?.processed ?? 0;
  const autoStaged = summary?.autoRecommendedCount ?? telemetry?.autoStaged ?? 0;
  const humanReview = summary?.humanReviewRequiredCount ?? telemetry?.humanReview ?? 0;
  const quarantined = summary?.totalQuarantined ?? telemetry?.quarantined ?? 0;

  // 2. Real wall-clock duration formatting
  const durationMs = Number(telemetry?.durationMs || 0);
  const formattedRuntime = durationMs >= 1000
    ? `${(durationMs / 1000).toFixed(2)} s`
    : `${durationMs} ms`;

  const avgLatencyMs = Number(telemetry?.averageLatencyPerPatentMs || (processed > 0 ? Math.round(durationMs / processed) : 0));
  const formattedAvgLatency = avgLatencyMs >= 1000
    ? `${(avgLatencyMs / 1000).toFixed(2)} s / asset`
    : `${avgLatencyMs} ms / asset`;

  // 3. Provider & Inference Mode detection
  const isReal = Boolean(telemetry?.isRealModelInference);
  const provider = telemetry?.provider || 'GROUNDED_RULE_ENGINE';
  const model = telemetry?.model || 'rule-grounded-v3';

  const getProviderLabel = () => {
    if (!isReal || provider === 'GROUNDED_RULE_ENGINE') {
      return 'Deterministic inference';
    }
    if (provider === 'GEMINI_AI') return `Gemini · ${model}`;
    if (provider === 'OPENROUTER_AI') return `OpenRouter · ${model}`;
    if (provider === 'OPENAI_AI') return `OpenAI · ${model}`;
    if (provider === 'OLLAMA_LOCAL_AI') return `Ollama · ${model}`;
    if (provider === 'ANTHROPIC_AI') return `Anthropic · ${model}`;
    return `${provider} (${model})`;
  };

  const providerDisplay = getProviderLabel();

  // 4. Token counts
  const promptTokens = isReal ? Number(telemetry?.promptTokens || telemetry?.totalPromptTokens || 0) : 0;
  const completionTokens = isReal ? Number(telemetry?.completionTokens || telemetry?.totalCompletionTokens || 0) : 0;
  const totalTokens = isReal ? Number(telemetry?.totalTokens || promptTokens + completionTokens) : 0;

  // 5. Cost economics
  const rawCost = isReal ? Number(telemetry?.estimatedCostUSD ?? telemetry?.estimatedCostTotalUSD ?? telemetry?.actualCostUSD ?? 0) : 0;
  const formattedCost = `$${rawCost.toFixed(4)}`;

  const rawAvgCost = isReal ? Number(telemetry?.avgCostPerPatentUSD ?? (processed > 0 ? rawCost / processed : 0)) : 0;
  const formattedAvgCost = `$${rawAvgCost.toFixed(4)}`;

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
        {/* Metric 1: Total Runtime */}
        <div className="telemetry-metric-box">
          <span className="metric-lbl">TOTAL RUNTIME</span>
          <span className="metric-val accent">{formattedRuntime}</span>
          <span className="metric-sub">{formattedAvgLatency}</span>
        </div>

        {/* Metric 2: Token Throughput */}
        <div className="telemetry-metric-box">
          <span className="metric-lbl">TOKEN THROUGHPUT</span>
          <span className="metric-val">{totalTokens.toLocaleString()}</span>
          <span className="metric-sub">
            {isReal ? `${promptTokens.toLocaleString()} in · ${completionTokens.toLocaleString()} out` : '0 in · 0 out'}
          </span>
        </div>

        {/* Metric 3: Estimated Run Cost */}
        <div className="telemetry-metric-box">
          <span className="metric-lbl">ESTIMATED RUN COST</span>
          <span className="metric-val text-accent">{formattedCost}</span>
          <span className="metric-sub">{providerDisplay}</span>
        </div>

        {/* Metric 4: Avg Cost / Asset */}
        <div className="telemetry-metric-box">
          <span className="metric-lbl">AVG COST / ASSET</span>
          <span className="metric-val text-accent">{formattedAvgCost}</span>
          <span className="metric-sub">Predictable unit economics</span>
        </div>
      </div>

      {/* Summary Breakdown Row */}
      <div className="telemetry-breakdown-row font-mono">
        <div className="breakdown-stat">
          <span className="stat-name">SUBMITTED:</span>
          <strong>{submitted}</strong>
        </div>
        <div className="breakdown-stat">
          <span className="stat-name">PROCESSED:</span>
          <strong>{processed}</strong>
        </div>
        <div className="breakdown-stat">
          <span className="stat-name">AUTO-STAGED:</span>
          <strong className="text-accent">{autoStaged}</strong>
        </div>
        <div className="breakdown-stat">
          <span className="stat-name">HUMAN REVIEW:</span>
          <strong className="text-warning">{humanReview}</strong>
        </div>
        <div className="breakdown-stat">
          <span className="stat-name">QUARANTINED:</span>
          <strong className="text-urgent">{quarantined}</strong>
        </div>
      </div>
    </div>
  );
}
