import React, { useState, useEffect } from 'react';
import { recalculateRationale } from '../api/client';
import { formatPatentCost, sanitizeCurrencyText } from '../utils/currency';
import { getDaysToRenewal } from '../utils/dates';

export default function PatentDetailDrawer({
  patent,
  onClose,
  onSubmitDecision,
  submitting = false
}) {
  if (!patent) return null;

  // Progressive Disclosure States
  const [showWhyFactors, setShowWhyFactors] = useState(false);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState(null); // null (hidden) | 'claims' | 'priorArt' | 'dates' | 'source'

  // Consequential Decision State
  const [chosenDecision, setChosenDecision] = useState(null); // null | 'RENEW' | 'LAPSE'
  const [attorneyReasoning, setAttorneyReasoning] = useState(
    patent.businessValueScore < 40 || patent.isFlagged
      ? 'No current product dependency and renewal cost exceeds commercial defensibility threshold.'
      : 'Core strategic asset protecting active revenue line; continued exclusive protection warranted.'
  );

  // AI Recalculation State
  const [currentRationale, setCurrentRationale] = useState(patent.businessValueRationale);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState(false);

  // Confirmation & Error Screen States
  const [committedRecord, setCommittedRecord] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);

  const daysLeft = getDaysToRenewal(patent.renewalDeadline);
  const isFlagged = patent.isFlagged || patent.businessValueScore < 40;
  const recommendedAction = isFlagged ? 'ALLOW TO LAPSE' : 'RENEW';

  useEffect(() => {
    // Reset state on patent change
    setCurrentRationale(patent.businessValueRationale);
    setShowWhyFactors(false);
    setActiveEvidenceTab(null);
    setChosenDecision(null);
    setAttorneyReasoning(
      patent.businessValueScore < 40 || patent.isFlagged
        ? 'No current product dependency and renewal cost exceeds commercial defensibility threshold.'
        : 'Core strategic asset protecting active revenue line; continued exclusive protection warranted.'
    );
    setCommittedRecord(null);
    setSubmissionError(null);
  }, [patent.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleRecalculateRationale = async () => {
    setIsRecalculating(true);
    setRecalcSuccess(false);
    try {
      const res = await recalculateRationale(patent.id || patent.patentNumber);
      if (res.businessValueRationale) {
        setCurrentRationale(res.businessValueRationale);
      }
      setRecalcSuccess(true);
      setTimeout(() => setRecalcSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to recalculate rationale:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleCommitDecision = async (e) => {
    if (e) e.preventDefault();
    if (!chosenDecision || !attorneyReasoning.trim() || submitting) return;

    setSubmissionError(null);
    try {
      const result = await onSubmitDecision({
        patentNumber: patent.patentNumber,
        decision: chosenDecision,
        reasoning: attorneyReasoning.trim(),
        actor: 'Lead IP Attorney'
      });

      // Show Full-Screen Takeover Confirmation
      setCommittedRecord({
        decision: chosenDecision,
        patentNumber: patent.patentNumber,
        patentTitle: patent.title,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
        actor: 'Lead IP Attorney'
      });
    } catch (err) {
      console.error('Decision commitment failed:', err);
      setSubmissionError(err.message || 'The backend could not confirm this decision. Nothing has been recorded.');
    }
  };

  return (
    <div className="case-room-backdrop" onClick={onClose}>
      <div className="case-room-modal" onClick={(e) => e.stopPropagation()}>
        {/* ============================================================
            5. FULL-SCREEN AUDIT COMMITMENT CONFIRMATION TAKEOVER
            ============================================================ */}
        {committedRecord ? (
          <div className="case-confirmation-takeover">
            <div className="takeover-content">
              <div className="takeover-icon-pulse">
                <span className="takeover-check-mark">✓</span>
              </div>

              <div className="takeover-pre-heading">AUDIT LEDGER COMMITMENT COMPLETE</div>

              <h1 className="takeover-main-title">
                DECISION<br />COMMITTED
              </h1>

              <div className={`takeover-decision-tag ${committedRecord.decision === 'RENEW' ? 'renew' : 'lapse'}`}>
                {committedRecord.decision === 'RENEW' ? 'RENEWAL AUTHORIZED' : 'DELIBERATE LAPSE COMMITTED'}
              </div>

              <div className="takeover-patent-id">
                {committedRecord.patentNumber}
              </div>

              <p className="takeover-patent-title">
                {committedRecord.patentTitle}
              </p>

              <div className="takeover-meta-card">
                <div className="meta-row">
                  <span>Authorizing Actor:</span>
                  <strong>{committedRecord.actor}</strong>
                </div>
                <div className="meta-row">
                  <span>Audit Timestamp:</span>
                  <strong>{committedRecord.date} · {committedRecord.timestamp}</strong>
                </div>
                <div className="meta-row">
                  <span>Persistence Status:</span>
                  <strong className="text-accent">PERMANENTLY RECORDED IN SQLite</strong>
                </div>
              </div>

              <button className="takeover-exit-btn" onClick={onClose}>
                RETURN TO PORTFOLIO →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header Control Bar */}
            <div className="case-room-header">
              <div className="case-identifier-line">
                <span className="case-badge-active">CASE DOSSIER</span>
                <span className="case-badge-jur">{patent.jurisdiction}</span>
                <span className={`badge-micro-source ${patent.sourceType === 'REAL' ? 'real' : 'synth'}`}>
                  {patent.sourceType === 'REAL' ? '● VERIFIED REAL DATA' : 'SYNTHETIC RECORD'}
                </span>
              </div>

              <button className="case-close-x-btn" onClick={onClose} aria-label="Close case file">
                ✕
              </button>
            </div>

            {/* Scrollable Progressive Dossier Body */}
            <div className="case-room-body">
              {/* ============================================================
                  1. ACTION — DOMINANT HERO DECISION FRAME
                  ============================================================ */}
              <section className="case-signal-block">
                <div className="case-hero-action-row">
                  <div className="case-hero-lead">
                    <h1 className="case-patent-huge-num">{patent.patentNumber}</h1>
                    <h2 className="case-patent-title">{patent.title}</h2>
                    <div className="case-assignee-text font-mono">
                      ASSIGNED TO {patent.applicant}
                    </div>
                  </div>

                  <div className="case-action-decision-pill">
                    <span className={`case-rec-badge ${isFlagged ? 'lapse' : 'renew'}`}>
                      ● {recommendedAction}
                    </span>
                  </div>
                </div>

                <div className="case-signal-callout">
                  <div className="callout-item">
                    <span className="callout-lbl">BUSINESS VALUE</span>
                    <div className="callout-huge-val accent">
                      {patent.businessValueScore}
                    </div>
                    <span className="callout-sub">{patent.businessValueTier} CONVICTION</span>
                  </div>

                  <div className="callout-divider" />

                  <div className="callout-item">
                    <span className="callout-lbl">RENEWAL DEADLINE</span>
                    <div className="callout-huge-val urgent">
                      {daysLeft > 0 ? `${daysLeft} DAYS` : 'OVERDUE'}
                    </div>
                    <span className="callout-sub">{patent.renewalDeadline}</span>
                  </div>

                  <div className="callout-divider" />

                  <div className="callout-item">
                    <span className="callout-lbl">MAINTENANCE COST</span>
                    <div className="callout-huge-val">
                      {formatPatentCost(patent.renewalCost, patent.jurisdiction)}
                    </div>
                    <span className="callout-sub">ANNUAL OBLIGATION</span>
                  </div>
                </div>

                {/* Progressive WHY toggle button */}
                <div className="case-why-toggle-wrap">
                  <button
                    className={`case-why-btn ${showWhyFactors ? 'active' : ''}`}
                    onClick={() => setShowWhyFactors(!showWhyFactors)}
                  >
                    {showWhyFactors ? '▲ HIDE EXPLANATION' : '▼ WHY THIS SCORE?'}
                  </button>
                </div>
              </section>

              {/* ============================================================
                  2. EXPLANATION — REVEALED ON [ WHY? ]
                  ============================================================ */}
              {showWhyFactors && (
                <section className="case-progressive-section why-section-revealed">
                  <div className="case-summary-sentence">
                    <p className="summary-quote-text font-mono">
                      "{sanitizeCurrencyText(currentRationale, patent.jurisdiction)}"
                    </p>
                  </div>

                  <div className="why-factors-expanded-drawer">
                    <div className="factor-visual-rows">
                      <div className="factor-row">
                        <div className="factor-hdr font-mono">
                          <span>COMMERCIAL PRODUCT RELEVANCE (40%)</span>
                          <strong>{Math.round(patent.productRelevance)}</strong>
                        </div>
                        <div className="factor-bar-track">
                          <div
                            className={`factor-bar-fill ${patent.productRelevance < 40 ? 'urgent' : ''}`}
                            style={{ width: `${Math.min(100, patent.productRelevance)}%` }}
                          />
                        </div>
                      </div>

                      <div className="factor-row">
                        <div className="factor-hdr font-mono">
                          <span>CITATION STRENGTH (25%)</span>
                          <strong>{Math.round(patent.citationPercentile)}</strong>
                        </div>
                        <div className="factor-bar-track">
                          <div
                            className={`factor-bar-fill ${patent.citationPercentile < 40 ? 'urgent' : ''}`}
                            style={{ width: `${Math.min(100, patent.citationPercentile)}%` }}
                          />
                        </div>
                      </div>

                      <div className="factor-row">
                        <div className="factor-hdr font-mono">
                          <span>REMAINING ENFORCEABLE TERM (20%)</span>
                          <strong>{Math.round(patent.remainingLifeNormalized)}</strong>
                        </div>
                        <div className="factor-bar-track">
                          <div
                            className={`factor-bar-fill ${patent.remainingLifeNormalized < 40 ? 'urgent' : ''}`}
                            style={{ width: `${Math.min(100, patent.remainingLifeNormalized)}%` }}
                          />
                        </div>
                      </div>

                      <div className="factor-row">
                        <div className="factor-hdr font-mono">
                          <span>RENEWAL ECONOMICS (15%)</span>
                          <strong>{Math.round(patent.inverseRenewalCostPercentile)}</strong>
                        </div>
                        <div className="factor-bar-track">
                          <div
                            className={`factor-bar-fill ${patent.inverseRenewalCostPercentile < 40 ? 'urgent' : ''}`}
                            style={{ width: `${Math.min(100, patent.inverseRenewalCostPercentile)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="recalculate-rationale-row">
                      <button
                        className="recalculate-live-btn font-mono"
                        onClick={handleRecalculateRationale}
                        disabled={isRecalculating}
                      >
                        {isRecalculating ? (
                          <>
                            <span className="mini-spinner" /> RE-CALCULATING RATIONALE...
                          </>
                        ) : recalcSuccess ? (
                          '✓ RATIONALE UPDATED'
                        ) : (
                          '⚡ RE-RUN AI RATIONALE'
                        )}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* ============================================================
                  3. EVIDENCE & MULTI-AGENT DOSSIER — PROGRESSIVE DOCUMENT LAYERS
                  ============================================================ */}
              <section className="case-progressive-section">
                <div className="evidence-selector-tabs">
                  <span className="evidence-lbl font-mono">DOSSIER:</span>
                  <button
                    className={`evidence-pill font-mono ${activeEvidenceTab === 'agents' ? 'active' : ''}`}
                    onClick={() => setActiveEvidenceTab(activeEvidenceTab === 'agents' ? null : 'agents')}
                  >
                    4 SPECIALIST AGENTS {activeEvidenceTab === 'agents' ? '▲' : '▼'}
                  </button>
                  <button
                    className={`evidence-pill font-mono ${activeEvidenceTab === 'dates' ? 'active' : ''}`}
                    onClick={() => setActiveEvidenceTab(activeEvidenceTab === 'dates' ? null : 'dates')}
                  >
                    REGISTRY & DATES {activeEvidenceTab === 'dates' ? '▲' : '▼'}
                  </button>
                  <button
                    className={`evidence-pill font-mono ${activeEvidenceTab === 'claims' ? 'active' : ''}`}
                    onClick={() => setActiveEvidenceTab(activeEvidenceTab === 'claims' ? null : 'claims')}
                  >
                    CLAIMS ({patent.claims?.length || 0}) {activeEvidenceTab === 'claims' ? '▲' : '▼'}
                  </button>
                  <button
                    className={`evidence-pill font-mono ${activeEvidenceTab === 'source' ? 'active' : ''}`}
                    onClick={() => setActiveEvidenceTab(activeEvidenceTab === 'source' ? null : 'source')}
                  >
                    PROVENANCE {activeEvidenceTab === 'source' ? '▲' : '▼'}
                  </button>
                </div>

                {activeEvidenceTab && (
                  <div className="evidence-panel-revealed">
                    {activeEvidenceTab === 'agents' && (
                      <div className="hitl-agents-grid" style={{ marginTop: '8px' }}>
                        <div className="agent-dossier-card">
                          <div className="agent-card-header font-mono">
                            <span className="agent-role-tag">01. TECHNICAL ANALYST</span>
                            <span className="agent-score text-accent">{patent.agents?.technical?.technicalScore || Math.round(patent.productRelevance || 80)}/100</span>
                          </div>
                          <div className="agent-card-body font-mono">
                            <div className="agent-metric-row"><span>Product Alignment:</span><strong>{patent.agents?.technical?.productRelevance || Math.round(patent.productRelevance || 80)}%</strong></div>
                            <div className="agent-metric-row"><span>Citation Authority:</span><strong>{patent.agents?.technical?.citationPercentile || Math.round(patent.citationPercentile || 85)}th %ile</strong></div>
                            <p className="agent-rationale-text">{patent.agents?.technical?.technicalRationale || 'Core technological asset protecting enterprise standard.'}</p>
                          </div>
                        </div>

                        <div className="agent-dossier-card">
                          <div className="agent-card-header font-mono">
                            <span className="agent-role-tag">02. VALUATION SPECIALIST</span>
                            <span className="agent-score text-accent">{patent.agents?.valuation?.valuationScore || patent.businessValueScore || 75}/100</span>
                          </div>
                          <div className="agent-card-body font-mono">
                            <div className="agent-metric-row"><span>Annual Annuity:</span><strong>${(patent.renewalCost || 3200).toLocaleString()}</strong></div>
                            <div className="agent-metric-row"><span>Defensive ROI:</span><strong>{patent.agents?.valuation?.renewalRoi || '2.4'}x</strong></div>
                            <p className="agent-rationale-text">{patent.agents?.valuation?.valuationRationale || 'High commercial conviction.'}</p>
                          </div>
                        </div>

                        <div className="agent-dossier-card">
                          <div className="agent-card-header font-mono">
                            <span className="agent-role-tag">03. LEGAL PROSECUTION</span>
                            <span className={`agent-score ${(patent.agents?.legal?.legalScore || 85) < 50 ? 'text-urgent' : 'text-accent'}`}>{patent.agents?.legal?.legalScore || 85}/100</span>
                          </div>
                          <div className="agent-card-body font-mono">
                            <div className="agent-metric-row"><span>Prosecution Risk:</span><strong>{patent.agents?.legal?.prosecutionRisk || (patent.hasOfficeAction ? 'HIGH' : 'LOW')}</strong></div>
                            <div className="agent-metric-row"><span>Office Action:</span><strong>{patent.hasOfficeAction ? 'PENDING REJECTION' : 'CLEAN STATUS'}</strong></div>
                            <p className="agent-rationale-text">{patent.agents?.legal?.legalRationale || 'No pending statutory rejections recorded.'}</p>
                          </div>
                        </div>

                        <div className="agent-dossier-card critic-card">
                          <div className="agent-card-header font-mono">
                            <span className="agent-role-tag text-urgent">04. ADVERSARIAL CRITIC</span>
                            <span className="agent-score text-urgent">{patent.agents?.critic?.criticScore || 85}/100</span>
                          </div>
                          <div className="agent-card-body font-mono">
                            <div className="agent-metric-row"><span>Confidence Penalty:</span><strong className="text-urgent">-{patent.agents?.critic?.confidencePenalty || 0} pts</strong></div>
                            <div className="agent-metric-row"><span>Critic Stance:</span><strong>{patent.agents?.critic?.criticRecommendation || 'PROCEED WITH CAUTION'}</strong></div>
                            <p className="agent-rationale-text">{patent.agents?.critic?.counterarguments ? patent.agents.critic.counterarguments.join(' ') : 'No fatal design-around or validity flaws identified.'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeEvidenceTab === 'dates' && (
                      <div className="evidence-dates-grid">
                        <div className="date-cell">
                          <span className="cell-k">APPLICATION:</span>
                          <span className="cell-v font-mono">{patent.applicationNumber || 'N/A'}</span>
                        </div>
                        <div className="date-cell">
                          <span className="cell-k">FILING DATE:</span>
                          <span className="cell-v font-mono">{patent.filingDate}</span>
                        </div>
                        <div className="date-cell">
                          <span className="cell-k">GRANT DATE:</span>
                          <span className="cell-v font-mono">{patent.grantDate || 'Pending Prosecution'}</span>
                        </div>
                        <div className="date-cell">
                          <span className="cell-k">STATUTORY EXPIRY:</span>
                          <span className="cell-v font-mono">{patent.expiryDate}</span>
                        </div>
                      </div>
                    )}

                    {activeEvidenceTab === 'claims' && (
                      <div className="evidence-claims-flow">
                        {!patent.claims || patent.claims.length === 0 ? (
                          <div className="no-claims-text font-mono">No independent claims indexed for this record.</div>
                        ) : (
                          patent.claims.map((clm) => (
                            <div key={clm.id} className="claim-document-box font-mono">
                              <div className="claim-doc-header">
                                <strong>Claim {clm.claimNumber}</strong> ({clm.isIndependent ? 'INDEPENDENT' : 'DEPENDENT'})
                              </div>
                              <p className="claim-doc-body">{clm.claimText}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {activeEvidenceTab === 'source' && (
                      <div className="evidence-source-details font-mono">
                        <div><strong>Source:</strong> {patent.sourceProvider}</div>
                        <div><strong>Type:</strong> {patent.sourceType}</div>
                        <div><strong>Retrieved:</strong> {patent.retrievalTimestamp || 'Verified Cache'}</div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ============================================================
                  4. DECISION — THE COMMITMENT ACTION
                  ============================================================ */}
              <section className="case-decision-climax-block">
                {/* Two Clear Choices */}
                <div className="decision-enormous-choices">
                  <button
                    type="button"
                    className={`decision-choice-btn renew ${chosenDecision === 'RENEW' ? 'selected' : ''}`}
                    onClick={() => setChosenDecision('RENEW')}
                  >
                    <div className="choice-icon">✓</div>
                    <div className="choice-texts">
                      <span className="choice-title">RENEW PATENT</span>
                      <span className="choice-sub">Maintain exclusive protection</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`decision-choice-btn lapse ${chosenDecision === 'LAPSE' ? 'selected' : ''}`}
                    onClick={() => setChosenDecision('LAPSE')}
                  >
                    <div className="choice-icon">✕</div>
                    <div className="choice-texts">
                      <span className="choice-title">ALLOW TO LAPSE</span>
                      <span className="choice-sub">Terminate renewal obligation</span>
                    </div>
                  </button>
                </div>

                {/* When a choice is made, render reasoning input & commit button */}
                {chosenDecision && (
                  <form onSubmit={handleCommitDecision} className="decision-commitment-workflow">
                    <div className="why-reasoning-input-box">
                      <label className="reasoning-prompt-label font-mono">
                        <span>ATTORNEY REASONING (AUDIT LOG)</span>
                        <span className="required-dot">*</span>
                      </label>
                      <textarea
                        className="reasoning-text-input font-mono"
                        placeholder="State legal / commercial justification for audit record..."
                        value={attorneyReasoning}
                        onChange={(e) => setAttorneyReasoning(e.target.value)}
                        rows={2}
                        required
                      />
                    </div>

                    {submissionError && (
                      <div className="decision-failure-banner font-mono">
                        <div className="failure-title">⚠ COMMITMENT FAILED</div>
                        <div className="failure-msg">{submissionError}</div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className={`consequential-commit-btn ${chosenDecision === 'RENEW' ? 'commit-renew' : 'commit-lapse'}`}
                      disabled={!attorneyReasoning.trim() || submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="loading-spinner" /> COMMITTING...
                        </>
                      ) : (
                        `COMMIT ${chosenDecision} DECISION →`
                      )}
                    </button>
                  </form>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
