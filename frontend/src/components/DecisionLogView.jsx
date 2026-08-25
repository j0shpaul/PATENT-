import React, { useState } from 'react';

export default function DecisionLogView({ decisions = [], loading = false, onSelectPatentNumber }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filteredDecisions = decisions.filter((d) => {
    const matchesSearch =
      !searchTerm.trim() ||
      d.patentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.patentTitle && d.patentTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      d.reasoning.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.actor && d.actor.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'ALL' || d.decision === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="cinematic-ledger-screen">
      {/* 1. TOP HEADER */}
      <div className="ledger-top-banner">
        <div className="ledger-title-group">
          <div className="ledger-kicker font-mono">AUDIT LEDGER</div>
          <h1 className="ledger-main-title">DECISION AUDIT TIMELINE</h1>
        </div>

        {/* Filter Toolbar */}
        <div className="ledger-toolbar-row">
          <div className="ledger-mode-pills">
            <button
              className={`pill-btn ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              ALL ({decisions.length})
            </button>
            <button
              className={`pill-btn renew ${filterType === 'RENEW' ? 'active' : ''}`}
              onClick={() => setFilterType('RENEW')}
            >
              RENEWALS ({decisions.filter((d) => d.decision === 'RENEW').length})
            </button>
            <button
              className={`pill-btn lapse ${filterType === 'LAPSE' ? 'active' : ''}`}
              onClick={() => setFilterType('LAPSE')}
            >
              LAPSES ({decisions.filter((d) => d.decision === 'LAPSE').length})
            </button>
          </div>

          <div className="ledger-search-box">
            <input
              type="text"
              className="ledger-search-input font-mono"
              placeholder="Search audit decisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="search-clear-btn" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* 2. CHRONOLOGICAL TIMELINE */}
      <div className="ledger-vertical-timeline-container">
        {loading ? (
          <div className="timeline-loading-box font-mono">
            <span className="loading-spinner" />
            <span>Loading decision log...</span>
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="timeline-empty-box font-mono">
            <div className="empty-title">NO AUDIT RECORDS</div>
            <p className="empty-desc">No decisions committed yet.</p>
          </div>
        ) : (
          <div className="timeline-events-stream">
            {filteredDecisions.map((dec, idx) => {
              const isLapse = dec.decision === 'LAPSE';

              return (
                <div key={dec.id || idx} className="timeline-event-card">
                  <div className={`timeline-spine-dot ${isLapse ? 'lapse' : 'renew'}`} />

                  <div className="timeline-card-content">
                    <div className="event-decision-action-line">
                      <span className={`event-decision-badge ${isLapse ? 'lapse' : 'renew'}`}>
                        {dec.decision === 'RENEW' ? 'RENEWED' : 'LAPSED'}
                      </span>
                      <strong
                        className="event-patent-number font-mono"
                        onClick={() => onSelectPatentNumber && onSelectPatentNumber(dec.patentNumber)}
                        role="button"
                        tabIndex={0}
                        title="Open dossier"
                      >
                        {dec.patentNumber}
                      </strong>
                      <span className="event-date-timestamp font-mono">
                        {dec.timestamp} · {dec.actor || 'Lead IP Attorney'}
                      </span>
                    </div>

                    {dec.patentTitle && (
                      <div className="event-patent-title font-mono">{dec.patentTitle}</div>
                    )}

                    <div className="event-reasoning-quote font-mono">
                      "{dec.reasoning}"
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
