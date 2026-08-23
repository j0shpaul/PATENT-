import React, { useState } from 'react';

export default function PatentDetailModal({
  patent,
  onClose,
  onSubmitDecision,
  submitting = false
}) {
  if (!patent) return null;

  const [selectedDecision, setSelectedDecision] = useState('LAPSE');
  const [reasoning, setReasoning] = useState(
    patent.businessValueScore < 40
      ? 'No current product dependency and renewal cost exceeds expected commercial value.'
      : ''
  );

  const getTierClass = (tier) => {
    if (tier === 'HIGH') return 'high';
    if (tier === 'MEDIUM') return 'medium';
    return 'low';
  };

  const isFlagged = patent.isFlagged || patent.businessValueScore < 40;
  const isReasoningValid = reasoning.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isReasoningValid) return;

    onSubmitDecision({
      patentNumber: patent.patentNumber,
      decision: selectedDecision,
      reasoning: reasoning.trim(),
      actor: 'Attorney'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-patent-number">
              <span>{patent.patentNumber}</span>
              <span className={`badge-source ${patent.sourceType === 'REAL' ? 'real' : 'synthetic'}`}>
                {patent.sourceType === 'REAL' ? '● VERIFIED REAL DATA' : 'SYNTHETIC RECORD'}
              </span>
              <span className="badge-jurisdiction">{patent.jurisdiction}</span>
            </div>
            <div className="modal-patent-title">{patent.title}</div>
            <div className="modal-metadata-strip">
              <span><strong>Assignee:</strong> {patent.applicant}</span>
              <span><strong>App No:</strong> {patent.applicationNumber || 'N/A'}</span>
              <span><strong>Filing:</strong> {patent.filingDate}</span>
              {patent.grantDate && <span><strong>Grant:</strong> {patent.grantDate}</span>}
              <span><strong>Expiry:</strong> {patent.expiryDate}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Business Value Breakdown */}
          <div className="business-value-panel">
            <div className="score-display-block">
              <div className="score-label-sub">Business Value Score</div>
              <div className={`big-score-value ${getTierClass(patent.businessValueTier)}`}>
                {patent.businessValueScore}
                <span className="score-total-denom"> / 100</span>
              </div>
              <div className={`score-tier ${getTierClass(patent.businessValueTier)}`} style={{ display: 'inline-block' }}>
                {patent.businessValueTier} CONVICTION
              </div>
            </div>

            <div className="factors-grid">
              <div className="factor-row">
                <span className="factor-name">Product Relevance (40%)</span>
                <div className="factor-bar-wrapper">
                  <div
                    className={`factor-bar-fill ${patent.productRelevance < 40 ? 'urgent-fill' : ''}`}
                    style={{ width: `${Math.min(100, patent.productRelevance)}%` }}
                  />
                </div>
                <span className="factor-num">{Math.round(patent.productRelevance)}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Citation Percentile (25%)</span>
                <div className="factor-bar-wrapper">
                  <div
                    className={`factor-bar-fill ${patent.citationPercentile < 40 ? 'urgent-fill' : ''}`}
                    style={{ width: `${Math.min(100, patent.citationPercentile)}%` }}
                  />
                </div>
                <span className="factor-num">{Math.round(patent.citationPercentile)}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Remaining Life (20%)</span>
                <div className="factor-bar-wrapper">
                  <div
                    className={`factor-bar-fill ${patent.remainingLifeNormalized < 40 ? 'urgent-fill' : ''}`}
                    style={{ width: `${Math.min(100, patent.remainingLifeNormalized)}%` }}
                  />
                </div>
                <span className="factor-num">{Math.round(patent.remainingLifeNormalized)}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Cost Efficiency (15%)</span>
                <div className="factor-bar-wrapper">
                  <div
                    className={`factor-bar-fill ${patent.inverseRenewalCostPercentile < 40 ? 'urgent-fill' : ''}`}
                    style={{ width: `${Math.min(100, patent.inverseRenewalCostPercentile)}%` }}
                  />
                </div>
                <span className="factor-num">{Math.round(patent.inverseRenewalCostPercentile)}</span>
              </div>
            </div>
          </div>

          {/* AI Business Rationale Card */}
          <div className={`ai-rationale-box ${patent.businessValueScore >= 70 ? 'high-val' : isFlagged ? 'low-val' : ''}`}>
            <div className="rationale-header">
              <span className="rationale-title">
                {isFlagged ? '⚠ Why this is flagged' : 'Business Value Rationale'}
              </span>
              <span className="rationale-provider-tag">
                {patent.sourceType === 'REAL' ? 'USPTO Grounded Intelligence' : 'Portfolio Scoring Engine'}
              </span>
            </div>
            <p className="rationale-text">{patent.businessValueRationale}</p>
          </div>

          {/* Renewal Details Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            backgroundColor: 'var(--surface-inset)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>RENEWAL DEADLINE:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{patent.renewalDeadline}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>RENEWAL COST:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {patent.jurisdiction === 'EP' ? '€' : '$'}{patent.renewalCost.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>CURRENT STATUS:</span>{' '}
              <strong style={{ color: patent.renewalStatus === 'RENEW' ? 'var(--accent)' : patent.renewalStatus === 'LAPSE' ? 'var(--urgent)' : 'var(--warning)' }}>
                {patent.renewalStatus}
              </strong>
            </div>
          </div>

          {/* Renewal Decision Action Form */}
          <div className="decision-action-box">
            <div className="decision-box-title">Renewal Decision & Audit Authorization</div>
            <form onSubmit={handleSubmit}>
              <div className="decision-button-toggle-group">
                <button
                  type="button"
                  className={`decision-choice-btn ${selectedDecision === 'RENEW' ? 'selected-renew' : ''}`}
                  onClick={() => setSelectedDecision('RENEW')}
                >
                  ✓ Authorize Renewal
                </button>
                <button
                  type="button"
                  className={`decision-choice-btn ${selectedDecision === 'LAPSE' ? 'selected-lapse' : ''}`}
                  onClick={() => setSelectedDecision('LAPSE')}
                >
                  ✕ Allow to Lapse
                </button>
              </div>

              <div style={{ marginBottom: '6px', fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                DECISION REASONING (MANDATORY ATTORNEY JUSTIFICATION):
              </div>
              <textarea
                className="decision-reasoning-input"
                placeholder="Enter formal justification for renewal authorization or deliberate lapse..."
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                required
              />

              <button
                type="submit"
                className="decision-submit-btn"
                disabled={!isReasoningValid || submitting}
              >
                {submitting
                  ? 'Saving Permanent Decision...'
                  : `Commit ${selectedDecision} Decision to Audit Log`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
