import React from 'react';
import { formatPortfolioExposure, formatPatentCost, sanitizeCurrencyText } from '../utils/currency';
import { getDaysToRenewal, DEMO_REFERENCE_DATE } from '../utils/dates';

export default function CommandOverview({
  dashboardData,
  patents = [],
  decisions = [],
  onSelectPatent,
  selectedPatentId,
  onNavigateToPortfolio,
  onNavigateToDecisions
}) {
  // 1. Authoritative Decided Set
  const decidedPatentNumbers = new Set(
    (decisions || []).map((d) => d.patentNumber).filter(Boolean)
  );

  const isUndecided = (p) => {
    if (!p) return false;
    if (decidedPatentNumbers.has(p.patentNumber) || decidedPatentNumbers.has(p.id)) return false;
    if (p.renewalStatus === 'DECIDED_RENEW' || p.renewalStatus === 'DECIDED_LAPSE') return false;
    return true;
  };

  // 2. Calculate Real Portfolio Counts & Health using fixed DEMO_REFERENCE_DATE
  const patentDaysList = patents.map((p) => ({
    ...p,
    daysLeft: getDaysToRenewal(p.renewalDeadline)
  }));

  const undecidedPatentDaysList = patentDaysList.filter(isUndecided);

  const urgentPatents = undecidedPatentDaysList
    .filter((p) => p.daysLeft > 0 && p.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const reviewPatents = undecidedPatentDaysList.filter(
    (p) => p.requiresHumanReview || p.status === 'HUMAN_REVIEW' || (p.confidenceScore && p.confidenceScore < 0.85) || (p.contradictions && p.contradictions.length > 0) || p.isFlagged || p.businessValueScore < 40
  );

  const healthyPatents = patentDaysList.filter(
    (p) => p.businessValueScore >= 70 && !p.isFlagged
  );

  const urgentCount = urgentPatents.length;
  const reviewCount = reviewPatents.length;
  const healthyCount = healthyPatents.length;
  const totalAttention = urgentCount + reviewCount;

  const avgHealthScore = patents.length > 0
    ? Math.round(patents.reduce((sum, p) => sum + (p.businessValueScore || 0), 0) / patents.length)
    : 74;

  const totalExposureCost = patents.reduce((sum, p) => sum + (p.renewalCost || 0), 0);
  const formattedExposure = formatPortfolioExposure(totalExposureCost);

  // 3. Determine "The Next Decision" (The most imminent priority undecided asset)
  const remainingUndecided = [...undecidedPatentDaysList].sort((a, b) => a.daysLeft - b.daysLeft);
  const nextDecisionPatent = urgentPatents[0] || reviewPatents[0] || remainingUndecided[0] || null;

  const nextDays = nextDecisionPatent ? nextDecisionPatent.daysLeft : null;
  const nextDecisionAction = nextDecisionPatent
    ? (nextDecisionPatent.businessValueScore >= 70 ? 'RENEW' : 'ALLOW TO LAPSE')
    : null;

  // 4. Health Radial Arc Calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const healthPercent = Math.min(100, Math.max(0, avgHealthScore));
  const strokeDashoffset = circumference - (healthPercent / 100) * circumference;

  // 5. Sample Distribution Spectrum (sample 32 representative nodes)
  const sampleStep = Math.max(1, Math.floor(patents.length / 32));
  const distributionSample = patents
    .slice(0, 32 * sampleStep)
    .filter((_, idx) => idx % sampleStep === 0)
    .slice(0, 32)
    .sort((a, b) => (a.businessValueScore || 0) - (b.businessValueScore || 0));

  return (
    <div className="cinematic-mission-control">
      {/* ============================================================
          1. TOP HERO: MONUMENTAL OPENING FRAME
          ============================================================ */}
      <section className="mc-hero-frame">
        <div className="mc-hero-left">
          <div className="mc-eyebrow">
            <span className="mc-pulse-dot" />
            <span>PORTFOLIO COMMAND · {patents.length || 247} ASSETS</span>
          </div>

          <h1 className="mc-headline">
            {totalAttention > 0 ? (
              <>
                <span className="mc-num-highlight">{totalAttention}</span> {totalAttention === 1 ? 'patent needs' : 'patents need'} attention.
              </>
            ) : (
              'Portfolio is healthy.'
            )}
          </h1>

          <div className="mc-subline">
            {nextDecisionPatent ? (
              <>Next deadline · <strong className="text-urgent">{nextDays} days</strong> ({nextDecisionPatent.patentNumber})</>
            ) : (
              'All priority decisions addressed.'
            )}
          </div>
        </div>

        {/* Right: Radial Health Indicator */}
        <div className="mc-hero-right">
          <div className="mc-radial-gauge-wrapper">
            <svg className="mc-radial-svg" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="mc-radial-track"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="mc-radial-fill"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset
                }}
              />
            </svg>
            <div className="mc-radial-center">
              <span className="mc-radial-num">{avgHealthScore}</span>
              <span className="mc-radial-lbl">PORTFOLIO<br />HEALTH</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. ATTENTION STRIP: COMPACT NAVIGATION SIGNALS
          ============================================================ */}
      <section className="mc-attention-strip">
        <button
          className="mc-signal-pill urgent"
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio({ filterType: 'urgent' })}
          title="Inspect urgent deadlines"
        >
          <span className="mc-signal-count">{String(urgentCount).padStart(2, '0')}</span>
          <span className="mc-signal-label">URGENT</span>
        </button>

        <button
          className="mc-signal-pill review"
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio({ filterType: 'review' })}
          title="Inspect low value / review assets"
        >
          <span className="mc-signal-count">{String(reviewCount).padStart(2, '0')}</span>
          <span className="mc-signal-label">REVIEW</span>
        </button>

        <button
          className="mc-signal-pill healthy"
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio({ filterType: 'healthy' })}
          title="Inspect healthy core assets"
        >
          <span className="mc-signal-count">{String(healthyCount).padStart(2, '0')}</span>
          <span className="mc-signal-label">HEALTHY</span>
        </button>
      </section>

      {/* ============================================================
          3. THE NEXT DECISION: THE CINEMATIC HERO COMPONENT
          ============================================================ */}
      <section className="mc-next-decision-section">
        {nextDecisionPatent ? (
          <div
            className="mc-next-decision-card"
            onClick={() => onSelectPatent && onSelectPatent(nextDecisionPatent)}
            role="button"
            tabIndex={0}
          >
            <div className="mc-card-kicker">NEXT DECISION</div>

            <div className="mc-decision-main-row">
              {/* Left: Patent Identifier & Recommendation */}
              <div className="mc-decision-lead">
                <div className="mc-decision-pat-num">
                  {nextDecisionPatent.patentNumber}
                  <span className="badge-jur">{nextDecisionPatent.jurisdiction}</span>
                </div>
                <div className="mc-decision-action-query">
                  {nextDecisionAction} · {nextDays} DAYS
                </div>
                <div className="mc-decision-title-snippet font-mono">
                  {formatPatentCost(nextDecisionPatent.renewalCost, nextDecisionPatent.jurisdiction)} · {nextDecisionPatent.title}
                </div>
              </div>

              {/* Middle: Business Value Score */}
              <div className="mc-decision-stat">
                <div className="mc-stat-huge accent">
                  {nextDecisionPatent.businessValueScore}
                </div>
                <div className="mc-stat-sub">{nextDecisionPatent.businessValueTier || 'HIGH'} CONVICTION</div>
              </div>

              {/* Right: Days Remaining */}
              <div className="mc-decision-stat">
                <div className="mc-stat-huge urgent">
                  {nextDays} <span className="mc-stat-unit">DAYS</span>
                </div>
                <div className="mc-stat-sub">UNTIL DEADLINE</div>
              </div>

              {/* CTA Button */}
              <div className="mc-decision-cta">
                <button
                  className="mc-inspect-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPatent && onSelectPatent(nextDecisionPatent);
                  }}
                >
                  INSPECT →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mc-next-decision-card clear">
            <div className="mc-card-kicker font-mono">PORTFOLIO STATUS</div>
            <div className="mc-clear-state-box font-mono">
              <div className="clear-state-badge">✓ PORTFOLIO CLEAR</div>
              <div className="clear-state-msg">No pending decisions. All priority deadlines addressed.</div>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================
          4. PORTFOLIO SIGNAL: MINIMAL SPECTRUM DISTRIBUTION
          ============================================================ */}
      <section className="mc-spectrum-section">
        <div className="mc-spectrum-header">
          <span className="mc-spectrum-title">EXPOSURE SPECTRUM</span>
          <div className="mc-spectrum-metrics">
            <span><strong>{patents.length || 247}</strong> ASSETS</span>
            <span>·</span>
            <span><strong>{formattedExposure}</strong> EXPOSURE</span>
            <span>·</span>
            <span className="text-urgent"><strong>{totalAttention}</strong> REVIEW</span>
          </div>
        </div>

        {/* Minimal Horizontal Node Distribution */}
        <div className="mc-spectrum-bar-track">
          <span className="spectrum-axis-lbl left">LOW VALUE</span>
          <div className="spectrum-nodes-line">
            {distributionSample.map((p, idx) => {
              const isUrgentDot = p.businessValueScore < 40 || p.isFlagged;
              const isHighVal = p.businessValueScore >= 70;
              const dotClass = isUrgentDot ? 'urgent' : isHighVal ? 'healthy' : 'neutral';

              return (
                <div
                  key={p.id || idx}
                  className={`spectrum-dot ${dotClass}`}
                  onClick={() => onSelectPatent && onSelectPatent(p)}
                  title={`${p.patentNumber}: Score ${p.businessValueScore}/100`}
                />
              );
            })}
          </div>
          <span className="spectrum-axis-lbl right">HIGH VALUE</span>
        </div>
      </section>

      {/* ============================================================
          5. RECENT ACTIVITY: MINIMAL LEDGER SNAPSHOT
          ============================================================ */}
      <section className="mc-recent-section">
        <div className="mc-recent-header">
          <span className="mc-recent-title">RECENT DECISIONS</span>
          <button
            className="mc-view-ledger-btn"
            onClick={() => onNavigateToDecisions && onNavigateToDecisions()}
          >
            VIEW LEDGER →
          </button>
        </div>

        <div className="mc-recent-list">
          {decisions && decisions.length > 0 ? (
            decisions.slice(0, 3).map((dec, idx) => {
              const isLapse = dec.decision === 'LAPSE';
              return (
                <div
                  key={dec.id || idx}
                  className="mc-recent-row"
                  onClick={() => onNavigateToDecisions && onNavigateToDecisions()}
                >
                  <span className={`mc-recent-badge ${isLapse ? 'lapse' : 'renew'}`}>
                    {dec.decision === 'RENEW' ? 'RENEWED' : 'LAPSED'}
                  </span>
                  <span className="mc-recent-num font-mono">{dec.patentNumber}</span>
                  <span className="mc-recent-actor font-mono">{dec.actor || 'Attorney'}</span>
                  <span className="mc-recent-time font-mono">{dec.timestamp}</span>
                </div>
              );
            })
          ) : (
            <div className="mc-recent-empty font-mono">
              <span>No decisions logged in current session.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
