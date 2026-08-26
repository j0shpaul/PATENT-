import React, { useState } from 'react';

/**
 * HumanReviewStation — Mandatory Human-In-The-Loop Case Room
 * Gated review station for low-confidence or contradictory multi-agent evaluations.
 */
export default function HumanReviewStation({
  reviewQueue = [],
  onCommitDecision,
  onSelectPatent,
  submitting = false
}) {
  const [selectedPatent, setSelectedPatent] = useState(reviewQueue.length > 0 ? reviewQueue[0] : null);
  const [chosenAction, setChosenAction] = useState(null);
  const [justification, setJustification] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync selected patent if reviewQueue changes
  React.useEffect(() => {
    if (reviewQueue.length > 0 && (!selectedPatent || !reviewQueue.some(p => p.patentNumber === selectedPatent.patentNumber))) {
      setSelectedPatent(reviewQueue[0]);
      setChosenAction(null);
      setJustification('');
      setErrorMsg(null);
    }
  }, [reviewQueue]);

  if (!reviewQueue || reviewQueue.length === 0) {
    return (
      <div className="hitl-empty-container font-mono">
        <div className="hitl-empty-icon">✓</div>
        <h2 className="hitl-empty-title">HUMAN REVIEW QUEUE IS CLEAR</h2>
        <p className="hitl-empty-desc">
          All patent records have exceeded the 85% confidence threshold with zero multi-agent contradictions.
        </p>
      </div>
    );
  }

  const current = selectedPatent || reviewQueue[0];
  const technical = current?.agents?.technical || {};
  const valuation = current?.agents?.valuation || {};
  const legal = current?.agents?.legal || {};
  const critic = current?.agents?.critic || {};
  const contradictions = current?.contradictions || [];

  const handleActionSelect = (action) => {
    setChosenAction(action);
    setErrorMsg(null);
    if (action === 'RENEW') {
      setJustification(`Authorized renewal: Strategic commercial alignment overrides prosecution risks.`);
    } else if (action === 'LAPSE') {
      setJustification(`Authorized deliberate lapse: High maintenance cost and valid critic objections.`);
    } else {
      setJustification('');
    }
  };

  const handleCommit = async (e) => {
    if (e) e.preventDefault();
    if (!chosenAction) return;

    if (chosenAction === 'OVERRIDE' && !justification.trim()) {
      setErrorMsg('Mandatory attorney reasoning is required when overriding multi-agent recommendations.');
      return;
    }

    if (!justification.trim()) {
      setErrorMsg('Attorney justification cannot be blank.');
      return;
    }

    try {
      if (onCommitDecision) {
        await onCommitDecision({
          patentNumber: current.patentNumber,
          decision: chosenAction === 'OVERRIDE' ? (current.recommendation === 'RENEW' ? 'LAPSE' : 'RENEW') : chosenAction,
          actionType: chosenAction,
          reasoning: justification.trim(),
          confidenceScore: current.confidenceScore,
          contradictions: current.contradictions || [],
          actor: 'Lead IP Partner / Attorney'
        });
      }
      setChosenAction(null);
      setJustification('');
      setErrorMsg(null);
    } catch (err) {
      console.error('Failed to commit human review decision:', err);
      setErrorMsg(err.message || 'Decision persistence failed.');
    }
  };

  return (
    <div className="hitl-screen-layout">
      {/* LEFT COLUMN: Human Review Queue List */}
      <div className="hitl-queue-sidebar">
        <div className="queue-header-box font-mono">
          <div className="queue-kicker">HUMAN-IN-THE-LOOP QUEUE</div>
          <h3 className="queue-title">{reviewQueue.length} ESCALATED ASSETS</h3>
          <span className="queue-sub">Confidence &lt; 85% or Contradictions</span>
        </div>

        <div className="queue-items-list font-mono">
          {reviewQueue.map((pat) => {
            const isSelected = current?.patentNumber === pat.patentNumber;
            const confPct = Math.round((pat.confidenceScore || 0) * 100);
            return (
              <div
                key={pat.patentNumber || pat.id}
                className={`queue-item-card ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPatent(pat);
                  setChosenAction(null);
                  setJustification('');
                  setErrorMsg(null);
                }}
              >
                <div className="queue-item-top">
                  <span className="queue-pat-num">{pat.patentNumber}</span>
                  <span className={`queue-conf-badge ${confPct < 60 ? 'urgent' : 'warning'}`}>
                    {confPct}% CONF
                  </span>
                </div>
                <div className="queue-item-title">{pat.title}</div>
                <div className="queue-item-reason">
                  ⚠ {pat.escalationReason || 'Multi-agent divergence'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Multi-Agent Dossier & Decision Case Room */}
      <div className="hitl-case-workspace">
        {/* Top Dossier Header */}
        <div className="hitl-case-header">
          <div className="case-title-block">
            <div className="case-badge-strip font-mono">
              <span className="badge-dossier">ESCALATED CASE ROOM</span>
              <span className="badge-jur">{current.jurisdiction || 'US'}</span>
              <span className="badge-warning">CONFIDENCE: {Math.round((current.confidenceScore || 0) * 100)}%</span>
            </div>
            <h1 className="case-hero-number font-mono">{current.patentNumber}</h1>
            <p className="case-hero-title">{current.title}</p>
          </div>

          <div className="case-recommendation-block font-mono">
            <span className="rec-lbl">SYSTEM PRE-RECOMMENDATION:</span>
            <span className={`rec-badge-hero ${current.recommendation === 'RENEW' ? 'renew' : 'lapse'}`}>
              {current.recommendation === 'RENEW' ? 'RENEWAL CANDIDATE' : 'PRUNING CANDIDATE'}
            </span>
          </div>
        </div>

        {/* Flagged Contradiction Alert Box */}
        {contradictions.length > 0 && (
          <div className="hitl-contradiction-banner font-mono">
            <div className="banner-title">
              <span>⚠</span>
              <strong>CROSS-AGENT CONTRADICTIONS DETECTED</strong>
            </div>
            <ul className="contradiction-list">
              {contradictions.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 4 Specialized Agent Cards Grid */}
        <div className="hitl-agents-grid">
          {/* Agent 1: Technical Analyst */}
          <div className="agent-dossier-card">
            <div className="agent-card-header font-mono">
              <span className="agent-role-tag">01. TECHNICAL ANALYST</span>
              <span className="agent-score text-accent">{technical.technicalScore || 0}/100</span>
            </div>
            <div className="agent-card-body font-mono">
              <div className="agent-metric-row">
                <span>Product Relevance:</span>
                <strong>{technical.productRelevance || 0}%</strong>
              </div>
              <div className="agent-metric-row">
                <span>Citation Authority:</span>
                <strong>{technical.citationPercentile || 0}th %ile</strong>
              </div>
              <p className="agent-rationale-text">{technical.technicalRationale}</p>
            </div>
          </div>

          {/* Agent 2: Valuation Specialist */}
          <div className="agent-dossier-card">
            <div className="agent-card-header font-mono">
              <span className="agent-role-tag">02. VALUATION SPECIALIST</span>
              <span className="agent-score text-accent">{valuation.valuationScore || 0}/100</span>
            </div>
            <div className="agent-card-body font-mono">
              <div className="agent-metric-row">
                <span>Annual Maintenance Fee:</span>
                <strong>${(valuation.annualCostUSD || 0).toLocaleString()}</strong>
              </div>
              <div className="agent-metric-row">
                <span>Defensive ROI Multiplier:</span>
                <strong>{valuation.renewalRoi || 0}x</strong>
              </div>
              <p className="agent-rationale-text">{valuation.valuationRationale}</p>
            </div>
          </div>

          {/* Agent 3: Legal Analyst */}
          <div className="agent-dossier-card">
            <div className="agent-card-header font-mono">
              <span className="agent-role-tag">03. LEGAL PROSECUTION</span>
              <span className={`agent-score ${legal.legalScore < 50 ? 'text-urgent' : 'text-accent'}`}>
                {legal.legalScore || 0}/100
              </span>
            </div>
            <div className="agent-card-body font-mono">
              <div className="agent-metric-row">
                <span>Prosecution Risk:</span>
                <strong className={legal.prosecutionRisk === 'HIGH' ? 'text-urgent' : ''}>
                  {legal.prosecutionRisk || 'LOW'}
                </strong>
              </div>
              <div className="agent-metric-row">
                <span>Office Action 102/103:</span>
                <strong>{legal.hasOfficeAction ? 'PENDING REJECTION' : 'CLEAN STATUS'}</strong>
              </div>
              <p className="agent-rationale-text">{legal.legalRationale}</p>
            </div>
          </div>

          {/* Agent 4: Adversarial Critic */}
          <div className="agent-dossier-card critic-card">
            <div className="agent-card-header font-mono">
              <span className="agent-role-tag text-urgent">04. ADVERSARIAL CRITIC</span>
              <span className="agent-score text-urgent">{critic.criticScore || 0}/100</span>
            </div>
            <div className="agent-card-body font-mono">
              <div className="agent-metric-row">
                <span>Confidence Penalty:</span>
                <strong className="text-urgent">-{critic.confidencePenalty || 0} pts</strong>
              </div>
              <div className="agent-metric-row">
                <span>Critic Stance:</span>
                <strong>{critic.criticRecommendation || 'REVIEW'}</strong>
              </div>
              <p className="agent-rationale-text">
                {critic.counterarguments ? critic.counterarguments.join(' ') : 'No critical flaws identified.'}
              </p>
            </div>
          </div>
        </div>

        {/* Human Action & Justification Console */}
        <div className="hitl-action-bar-box">
          <div className="hitl-actions-selector">
            <button
              type="button"
              className={`hitl-btn renew ${chosenAction === 'RENEW' ? 'active' : ''}`}
              onClick={() => handleActionSelect('RENEW')}
            >
              ✓ AUTHORIZE RENEWAL
            </button>
            <button
              type="button"
              className={`hitl-btn lapse ${chosenAction === 'LAPSE' ? 'active' : ''}`}
              onClick={() => handleActionSelect('LAPSE')}
            >
              ✕ AUTHORIZE LAPSE
            </button>
            <button
              type="button"
              className={`hitl-btn override ${chosenAction === 'OVERRIDE' ? 'active' : ''}`}
              onClick={() => handleActionSelect('OVERRIDE')}
            >
              ⚡ OVERRIDE AGENTS
            </button>
          </div>

          {chosenAction && (
            <form onSubmit={handleCommit} className="hitl-commit-form font-mono">
              <label className="justification-lbl">
                <span>ATTORNEY REASONING & AUDIT TRAIL</span>
                <span className="required-star">*</span>
              </label>
              <textarea
                className="justification-input"
                rows={2}
                placeholder="State legal / commercial justification for decision commitment..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
              />

              {errorMsg && <div className="hitl-error-banner font-mono">⚠ {errorMsg}</div>}

              <button
                type="submit"
                className={`hitl-submit-btn ${chosenAction === 'RENEW' ? 'commit-renew' : 'commit-lapse'}`}
                disabled={!justification.trim() || submitting}
              >
                {submitting ? 'COMMITTING TO AUDIT LEDGER...' : `COMMIT ${chosenAction} DECISION →`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
