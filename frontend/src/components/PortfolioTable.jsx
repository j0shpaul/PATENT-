import React from 'react';

export default function PortfolioTable({
  patents = [],
  totalCount = 0,
  filters,
  onFilterChange,
  onResetFilters,
  onSelectPatent,
  selectedPatentId,
  loading = false
}) {
  const formatCost = (cost, jurisdiction) => {
    const symbol = jurisdiction === 'EP' ? '€' : '$';
    return `${symbol}${cost.toLocaleString()}`;
  };

  const getTierClass = (tier) => {
    if (tier === 'HIGH') return 'high';
    if (tier === 'MEDIUM') return 'medium';
    return 'low';
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'renew') return 'renew';
    if (s === 'lapse') return 'lapse';
    if (s === 'review') return 'review';
    return 'pending';
  };

  const isUrgentDeadline = (deadlineStr) => {
    if (!deadlineStr) return false;
    const dl = new Date(deadlineStr);
    const now = new Date('2026-08-23');
    const diffDays = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  };

  return (
    <div>
      {/* Filter & Search Bar */}
      <div className="table-filter-bar">
        <div className="terminal-search-box">
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
            placeholder="Search patents by ID, title, or assignee..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </div>

        <div className="terminal-filter-selects">
          <select
            className="terminal-select"
            value={filters.jurisdiction || 'ALL'}
            onChange={(e) => onFilterChange('jurisdiction', e.target.value)}
          >
            <option value="ALL">Jurisdiction: All</option>
            <option value="US">US (USPTO)</option>
            <option value="EP">EP (EPO)</option>
            <option value="IN">IN (India)</option>
          </select>

          <select
            className="terminal-select"
            value={filters.status || 'ALL'}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="ALL">Status: All</option>
            <option value="REVIEW">REVIEW</option>
            <option value="PENDING">PENDING</option>
            <option value="RENEW">RENEW</option>
            <option value="LAPSE">LAPSE</option>
          </select>

          <select
            className="terminal-select"
            value={filters.tier || 'ALL'}
            onChange={(e) => onFilterChange('tier', e.target.value)}
          >
            <option value="ALL">Value Tier: All</option>
            <option value="HIGH">High (70–100)</option>
            <option value="MEDIUM">Medium (40–69)</option>
            <option value="LOW">Low (0–39)</option>
          </select>

          <select
            className="terminal-select"
            value={filters.source || 'ALL'}
            onChange={(e) => onFilterChange('source', e.target.value)}
          >
            <option value="ALL">Source: All</option>
            <option value="REAL">Real Records</option>
            <option value="SYNTHETIC">Synthetic Portfolio</option>
          </select>

          <button className="terminal-reset-btn" onClick={onResetFilters}>
            Reset
          </button>
        </div>
      </div>

      {/* Terminal Table Panel */}
      <div className="terminal-table-panel">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Portfolio Intelligence Ledger
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Showing {patents.length} of {totalCount} records
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="terminal-table">
            <thead>
              <tr>
                <th
                  className="sortable"
                  onClick={() =>
                    onFilterChange(
                      'sort_by',
                      'patentNumber',
                      'sort_order'
                    )
                  }
                >
                  Patent
                </th>
                <th>Title & Assignee</th>
                <th>Jur</th>
                <th
                  className="sortable"
                  onClick={() => onFilterChange('sort_by', 'score')}
                  style={{ textAlign: 'right' }}
                >
                  Value
                </th>
                <th
                  className="sortable"
                  onClick={() => onFilterChange('sort_by', 'deadline')}
                  style={{ textAlign: 'right' }}
                >
                  Deadline
                </th>
                <th
                  className="sortable"
                  onClick={() => onFilterChange('sort_by', 'cost')}
                  style={{ textAlign: 'right' }}
                >
                  Fee
                </th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading portfolio intelligence records...
                  </td>
                </tr>
              ) : patents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No patents match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                patents.map((pat) => {
                  const urgent = isUrgentDeadline(pat.renewalDeadline);
                  const isFlagged = pat.isFlagged || pat.businessValueScore < 40;
                  const isSelected = selectedPatentId === pat.id;

                  return (
                    <tr
                      key={pat.id}
                      className={`${isFlagged ? 'flagged-row' : ''} ${isSelected ? 'selected-row' : ''}`}
                      onClick={() => onSelectPatent(pat)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="patent-identifier">{pat.patentNumber}</span>
                          <span className={`badge-micro-source ${pat.sourceType === 'REAL' ? 'real' : 'synth'}`}>
                            {pat.sourceType === 'REAL' ? 'REAL' : 'SYNTH'}
                          </span>
                        </div>
                      </td>
                      <td style={{ maxWidth: '380px' }}>
                        <div
                          style={{
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            lineHeight: 1.35,
                            marginBottom: '2px',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                          title={pat.title}
                        >
                          {pat.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {pat.applicant}
                        </div>
                      </td>
                      <td>
                        <span className="badge-jur">{pat.jurisdiction}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="terminal-score-cell" style={{ justifyContent: 'flex-end' }}>
                          <span style={{ fontWeight: 700 }}>{pat.businessValueScore}</span>
                          <span className={`score-badge-tier ${getTierClass(pat.businessValueTier)}`}>
                            {pat.businessValueTier}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <span className="font-mono" style={{ fontSize: '12px' }}>{pat.renewalDeadline}</span>
                          {urgent && (
                            <span
                              style={{
                                fontSize: '8.5px',
                                padding: '1px 4px',
                                backgroundColor: 'var(--urgent-dim)',
                                color: 'var(--urgent)',
                                border: '1px solid var(--urgent-border)',
                                borderRadius: '2px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700
                              }}
                            >
                              URGENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right' }}>
                        {formatCost(pat.renewalCost, pat.jurisdiction)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`terminal-status-tag ${getStatusClass(pat.renewalStatus)}`}>
                          {pat.renewalStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
