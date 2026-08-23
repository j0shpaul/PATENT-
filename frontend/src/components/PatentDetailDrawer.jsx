import React, { useState, useEffect } from 'react';

export default function PatentDetailDrawer({
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="intelligence-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ flex: 1, paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>
                {patent.patentNumber}
              </span>
              <span className={`badge-micro-source ${patent.sourceType === 'REAL' ? 'real' : 'synth'}`}>
                {patent.sourceType === 'REAL' ? '● VERIFIED REAL DATA' : 'SYNTHETIC RECORD'}
              </span>
              <span className="badge-jur">{patent.jurisdiction}</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.35', marginBottom: '10px' }}>
              {patent.title}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span><strong>ASSIGNEE:</strong> {patent.applicant}</span>
              <span><strong>APP:</strong> {patent.applicationNumber || 'N/A'}</span>
              <span><strong>EXPIRY:</strong> {patent.expiryDate}</span>
            </div>
          </div>

          <button className="drawer-close-btn" onClick={onClose} aria-label="Close intelligence drawer">
            ✕
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="drawer-content">
          {/* Business Value Score Spectral Display */}
          <div className="drawer-score-card">
            <div className="score-headline-row">
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  BUSINESS VALUE EVALUATION
                </div>
                <div className="score-big-display">
                  <span style={{ color: patent.businessValueScore >= 70 ? 'var(--accent)' : isFlagged ? 'var(--urgent)' : 'var(--warning)' }}>
                    {patent.businessValueScore}
                  </span>
                  <span className="score-denom">/100</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={`score-badge-tier ${getTierClass(patent.businessValueTier)}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {patent.businessValueTier} CONVICTION
                </span>
              </div>
            </div>

            {/* Spectral Gauge Bar */}
            <div className="spectral-bar-track">
              <div
                className="spectral-indicator-dot"
                style={{ left: `${Math.max(4, Math.min(96, patent.businessValueScore))}%` }}
              />
            </div>
            <div className="spectral-labels">
              <span>0 (LAPSE)</span>
              <span>50 (REVIEW)</span>
              <span>100 (RENEW)</span>
            </div>

            {/* Factor Breakdown Bars */}
            <div className="factor-bars-group">
              <div className="factor-item">
                <span className="factor-item-title">Product Relevance (40%)</span>
                <div className="factor-track">
                  <div
                    className={`factor-fill ${patent.productRelevance < 40 ? 'urgent' : ''}`}
                    style={{ width: `${Math.min(100, patent.productRelevance)}%` }}
                  />
                </div>
                <span className="factor-val">{Math.round(patent.productRelevance)}</span>
              </div>

              <div className="factor-item">
                <span className="factor-item-title">Citation Percentile (25%)</span>
                <div className="factor-track">
                  <div
                    className={`factor-fill ${patent.citationPercentile < 40 ? 'urgent' : ''}`}
                    style={{ width: `${Math.min(100, patent.citationPercentile)}%` }}
                  />
                </div>
                <span className="factor-val">{Math.round(patent.citationPercentile)}</span>
              </div>

              <div className="factor-item">
                <span className="factor-item-title">Remaining Term (20%)</span>
                <div className="factor-track">
                  <div
                    className={`factor-fill ${patent.remainingLifeNormalized < 40 ? 'urgent' : ''}`}
                    style={{ width: `${Math.min(100, patent.remainingLifeNormalized)}%` }}
                  />
                </div>
                <span className="factor-val">{Math.round(patent.remainingLifeNormalized)}</span>
              </div>

              <div className="factor-item">
                <span className="factor-item-title">Cost Efficiency (15%)</span>
                <div className="factor-track">
                  <div
                    className={`factor-fill ${patent.inverseRenewalCostPercentile < 40 ? 'urgent' : ''}`}
                    style={{ width: `${Math.min(100, patent.inverseRenewalCostPercentile)}%` }}
                  />
                </div>
                <span className="factor-val">{Math.round(patent.inverseRenewalCostPercentile)}</span>
              </div>
            </div>
          </div>

          {/* Editorial Analytical Quote */}
          <div className={`editorial-rationale ${isFlagged ? 'flagged' : ''}`}>
            <div className="editorial-title">
              {isFlagged ? '⚠ WHY THIS ASSET IS FLAGGED' : 'VALUATION INTELLIGENCE RATIONALE'}
            </div>
            <p className="editorial-text">{patent.businessValueRationale}</p>
          </div>

          {/* Renewal Summary Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: 'var(--surface-inset)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 18px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>RENEWAL DEADLINE:</span>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
                {patent.renewalDeadline}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>MAINTENANCE FEE:</span>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
                {patent.jurisdiction === 'EP' ? '€' : '$'}{patent.renewalCost?.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Consequential Renewal Decision Box */}
          <div className="consequential-decision-box">
            <div className="consequential-title">CONSEQUENTIAL DECISION COMMITMENT</div>
            <form onSubmit={handleSubmit}>
              <div className="decision-action-cards">
                <div
                  className={`decision-action-card ${selectedDecision === 'RENEW' ? 'active-renew' : ''}`}
                  onClick={() => setSelectedDecision('RENEW')}
                >
                  <div className="action-card-main">RENEW</div>
                  <div className="action-card-sub">Authorize payment & maintain exclusive protection</div>
                </div>

                <div
                  className={`decision-action-card ${selectedDecision === 'LAPSE' ? 'active-lapse' : ''}`}
                  onClick={() => setSelectedDecision('LAPSE')}
                >
                  <div className="action-card-main">ALLOW TO LAPSE</div>
                  <div className="action-card-sub">Terminate renewal cycle & conserve IP budget</div>
                </div>
              </div>

              <div style={{ marginBottom: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ATTORNEY REASONING (MANDATORY AUDIT JUSTIFICATION):
              </div>
              <textarea
                className="reasoning-textarea"
                placeholder="State formal justification for renewal authorization or deliberate lapse..."
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                required
              />

              <button
                type="submit"
                className="commit-decision-btn"
                disabled={!isReasoningValid || submitting}
              >
                {submitting
                  ? 'COMMITTING TO AUDIT LEDGER...'
                  : `COMMIT ${selectedDecision} DECISION`}
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
