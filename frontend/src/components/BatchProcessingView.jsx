import React, { useState } from 'react';
import CostTelemetryCard from './CostTelemetryCard';

/**
 * BatchProcessingView — RocketRide Batch Orchestration Console
 * Supports arbitrary portfolio batch uploads, schema quarantine isolation,
 * live multi-agent execution, confidence filtering, and observability metrics.
 */
export default function BatchProcessingView({
  onRunBatch,
  isProcessing = false,
  progress = null,
  batchResult = null,
  samplePatents = [],
  onNavigateToHumanReview,
  onSelectPatent
}) {
  const [inputMode, setInputMode] = useState('sample'); // 'sample' | 'custom'
  const [customJson, setCustomJson] = useState('');
  const [selectedBatchSize, setSelectedBatchSize] = useState(25);
  const [jsonError, setJsonError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'auto' | 'review' | 'quarantined'

  const handleStartSampleBatch = () => {
    setJsonError(null);
    const slice = samplePatents.slice(0, selectedBatchSize);
    if (onRunBatch) {
      onRunBatch(slice);
    }
  };

  const handleStartCustomBatch = () => {
    setJsonError(null);
    if (!customJson.trim()) {
      setJsonError('Please paste a valid JSON array of patent records.');
      return;
    }
    try {
      const parsed = JSON.parse(customJson);
      const batchList = Array.isArray(parsed) ? parsed : parsed.patents || [parsed];
      if (onRunBatch) {
        onRunBatch(batchList);
      }
    } catch (err) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const results = batchResult?.results || [];
  const quarantined = batchResult?.quarantined || [];
  const autoRecommended = batchResult?.autoRecommended || [];
  const humanReviewQueue = batchResult?.humanReviewQueue || [];
  const summary = batchResult?.summary;
  const telemetry = batchResult?.telemetry;

  const filteredItems = activeTab === 'auto'
    ? autoRecommended
    : activeTab === 'review'
    ? humanReviewQueue
    : activeTab === 'quarantined'
    ? quarantined
    : [...results, ...quarantined];

  return (
    <div className="batch-console-container">
      {/* Top Banner & Header */}
      <div className="batch-header-bar font-mono">
        <div className="batch-header-left">
          <div className="batch-kicker">ROCKETRIDE ENGINE</div>
          <h1 className="batch-heading">BATCH ORCHESTRATION CONSOLE</h1>
          <p className="batch-subline">
            Multi-agent portfolio evaluation, schema quarantine isolation, and consensus routing.
          </p>
        </div>

        <div className="batch-mode-toggle font-mono">
          <button
            type="button"
            className={`mode-btn ${inputMode === 'sample' ? 'active' : ''}`}
            onClick={() => setInputMode('sample')}
            disabled={isProcessing}
          >
            PORTFOLIO PRESETS
          </button>
          <button
            type="button"
            className={`mode-btn ${inputMode === 'custom' ? 'active' : ''}`}
            onClick={() => setInputMode('custom')}
            disabled={isProcessing}
          >
            CUSTOM JSON BATCH
          </button>
        </div>
      </div>

      {/* Input / Control Station */}
      <div className="batch-input-card font-mono">
        {inputMode === 'sample' ? (
          <div className="sample-selector-row">
            <div className="selector-group">
              <label>SELECT BATCH SIZE (DEMO PORTFOLIO):</label>
              <div className="batch-size-pills">
                {[5, 25, 50, 100, 247].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`size-pill ${selectedBatchSize === size ? 'active' : ''}`}
                    onClick={() => setSelectedBatchSize(size)}
                    disabled={isProcessing}
                  >
                    {size} ASSETS
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="execute-batch-btn font-mono"
              onClick={handleStartSampleBatch}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="mini-spinner"></span>
                  <span>EXECUTING ROCKETRIDE PIPELINE...</span>
                </>
              ) : (
                `⚡ LAUNCH ROCKETRIDE BATCH (${selectedBatchSize} PATENTS) →`
              )}
            </button>
          </div>
        ) : (
          <div className="custom-json-input-box">
            <label className="json-lbl">PASTE ARBITRARY PATENT BATCH JSON:</label>
            <textarea
              className="json-textarea font-mono"
              rows={4}
              placeholder='[ { "patentNumber": "US10123456B2", "title": "Neural Processing Unit", "jurisdiction": "US", "renewalDeadline": "2026-11-15", "renewalCost": 3200 } ]'
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
              disabled={isProcessing}
            />
            {jsonError && <div className="json-error-banner">⚠ {jsonError}</div>}

            <button
              type="button"
              className="execute-batch-btn font-mono"
              onClick={handleStartCustomBatch}
              disabled={isProcessing}
            >
              {isProcessing ? 'EXECUTING PIPELINE...' : '⚡ INGEST & EVALUATE CUSTOM BATCH →'}
            </button>
          </div>
        )}

        {/* Live Processing Progress Feed */}
        {isProcessing && progress && (
          <div className="live-progress-container font-mono">
            <div className="progress-top-row">
              <span className="stage-tag">
                <span className="pulse-dot"></span> STAGE: {progress.stage}
              </span>
              <span className="progress-counter">
                {progress.current} / {progress.total} ASSETS ({Math.round((progress.current / progress.total) * 100)}%)
              </span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="live-item-indicator">
              Processing: <strong>{progress.patentNumber}</strong> ({progress.itemStatus})
            </div>
          </div>
        )}
      </div>

      {/* Telemetry & Summary Card */}
      <CostTelemetryCard telemetry={telemetry} summary={summary} />

      {/* Batch Results Viewer */}
      {batchResult && (
        <div className="batch-results-section font-mono">
          <div className="results-toolbar">
            <div className="results-tabs">
              <button
                type="button"
                className={`tab-filter-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                ALL RESULTS ({results.length + quarantined.length})
              </button>
              <button
                type="button"
                className={`tab-filter-btn auto ${activeTab === 'auto' ? 'active' : ''}`}
                onClick={() => setActiveTab('auto')}
              >
                AUTO-STAGED ({autoRecommended.length})
              </button>
              <button
                type="button"
                className={`tab-filter-btn review ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                HUMAN REVIEW ({humanReviewQueue.length})
              </button>
              <button
                type="button"
                className={`tab-filter-btn quarantined ${activeTab === 'quarantined' ? 'active' : ''}`}
                onClick={() => setActiveTab('quarantined')}
              >
                QUARANTINED ({quarantined.length})
              </button>
            </div>

            {humanReviewQueue.length > 0 && (
              <button
                type="button"
                className="jump-hitl-btn font-mono"
                onClick={onNavigateToHumanReview}
              >
                OPEN HUMAN REVIEW STATION ({humanReviewQueue.length}) →
              </button>
            )}
          </div>

          <div className="results-table-wrapper">
            <div className="results-table-header">
              <span>PATENT NUMBER</span>
              <span>TITLE</span>
              <span>STATUS</span>
              <span>CONFIDENCE</span>
              <span>RECOMMENDATION</span>
              <span>ACTION</span>
            </div>

            <div className="results-rows-list">
              {filteredItems.map((item, idx) => {
                const isQuarantined = item.status === 'QUARANTINED';
                const isHumanReview = item.status === 'HUMAN_REVIEW';
                const confPct = Math.round((item.confidenceScore || 0) * 100);

                return (
                  <div key={item.patentNumber || idx} className={`result-row ${isQuarantined ? 'quarantined' : isHumanReview ? 'review' : ''}`}>
                    <span className="row-pat-num font-mono">{item.patentNumber}</span>
                    <span className="row-pat-title">{item.title}</span>
                    
                    <span className="row-status-cell">
                      {isQuarantined ? (
                        <span className="badge-quarantined font-mono">QUARANTINED</span>
                      ) : isHumanReview ? (
                        <span className="badge-human-review font-mono">HUMAN REVIEW</span>
                      ) : (
                        <span className="badge-auto-stage font-mono">AUTO-STAGED</span>
                      )}
                    </span>

                    <span className="row-conf-cell font-mono">
                      {isQuarantined ? '—' : `${confPct}%`}
                    </span>

                    <span className="row-rec-cell font-mono">
                      {isQuarantined ? (
                        <span className="text-urgent">{item.quarantineReason || 'Schema error'}</span>
                      ) : (
                        <span className={`rec-badge-small ${item.recommendation === 'RENEW' ? 'renew' : 'lapse'}`}>
                          {item.recommendation}
                        </span>
                      )}
                    </span>

                    <span className="row-inspect-action">
                      {isHumanReview ? (
                        <button
                          type="button"
                          className="inspect-action-btn review font-mono"
                          onClick={onNavigateToHumanReview}
                        >
                          REVIEW →
                        </button>
                      ) : !isQuarantined && onSelectPatent ? (
                        <button
                          type="button"
                          className="inspect-action-btn font-mono"
                          onClick={() => onSelectPatent(item)}
                        >
                          DOSSIER
                        </button>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
