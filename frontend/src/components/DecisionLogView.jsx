import React, { useState } from 'react';

export default function DecisionLogView({ decisions = [], loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDecisions = decisions.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.patentNumber.toLowerCase().includes(q) ||
      (d.patentTitle && d.patentTitle.toLowerCase().includes(q)) ||
      d.decision.toLowerCase().includes(q) ||
      d.reasoning.toLowerCase().includes(q)
    );
  });

  return (
    <div className="ledger-container">
      {/* Ledger Header Card */}
      <div className="ledger-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Decision Audit Ledger
            </span>
            <span className="badge-micro-source synth" style={{ color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>
              ● APPEND ONLY
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            Permanent cryptographic audit trail of all executive patent renewal and lapse authorizations
          </div>
        </div>

        <div className="terminal-search-box" style={{ maxWidth: '300px' }}>
          <svg
            className="terminal-search-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="terminal-search-input"
            placeholder="Search audit trail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Ledger Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Loading permanent decision ledger...
        </div>
      ) : filteredDecisions.length === 0 ? (
        <div className="ledger-entry-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
            NO DECISION RECORDS FOUND
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
            {decisions.length === 0
              ? 'No renewal authorizations or lapse decisions have been committed yet. Select any flagged asset in the Portfolio view to log a permanent decision.'
              : 'No audit records match the search filter.'}
          </div>
        </div>
      ) : (
        <div className="ledger-timeline">
          {filteredDecisions.map((dec) => {
            const isLapse = dec.decision === 'LAPSE';
            return (
              <div key={dec.id} className="ledger-entry-card">
                <div className={`ledger-node-dot ${isLapse ? 'lapse' : ''}`} />

                <div className="ledger-entry-header">
                  <div className="ledger-patent-id">
                    <span>{dec.patentNumber}</span>
                    <span className={`terminal-status-tag ${isLapse ? 'lapse' : 'renew'}`}>
                      {dec.decision}
                    </span>
                  </div>

                  <span className="ledger-timestamp">{dec.timestamp}</span>
                </div>

                {dec.patentTitle && (
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {dec.patentTitle}
                  </div>
                )}

                <div className="ledger-reasoning-quote">
                  "{dec.reasoning}"
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="ledger-actor-chip">
                    AUTHORIZING COUNSEL: <strong>{dec.actor || 'Lead IP Attorney'}</strong>
                  </span>
                  <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    RECORD ID: {dec.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
