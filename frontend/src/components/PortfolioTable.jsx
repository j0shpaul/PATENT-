import React, { useState } from 'react';
import { formatPatentCost } from '../utils/currency';
import { getDaysToRenewal, getFormattedDate, isUrgentDeadline } from '../utils/dates';

// Reusable Single Portfolio Row Component (guaranteed identical layout & grid)
function PortfolioRow({
  patent,
  isSelected,
  isUrgent,
  daysLeft,
  formattedDate,
  tierClass,
  statusTag,
  onSelect
}) {
  return (
    <div
      className={`portfolio-table-grid portfolio-row-item ${isSelected ? 'selected' : ''} ${isUrgent ? 'urgent' : ''}`}
      onClick={() => onSelect(patent)}
      role="button"
      tabIndex={0}
    >
      {/* 1. PATENT COLUMN */}
      <div className="col-cell col-patent-meta">
        <div className="cell-patent-line">
          <span className="patent-num font-mono">{patent.patentNumber}</span>
          <span className="badge-jur">{patent.jurisdiction}</span>
          {patent.sourceType === 'REAL' && (
            <span className="badge-micro-source real">● REAL</span>
          )}
        </div>
        <div className="cell-patent-title" title={patent.title}>
          {patent.title}
        </div>
        <div className="cell-patent-assignee font-mono" title={patent.applicant}>
          {patent.applicant}
        </div>
      </div>

      {/* 2. VALUE COLUMN */}
      <div className="col-cell col-value-meta">
        <div className="cell-value-score-row">
          <span className={`cell-score-digits font-mono ${tierClass}`}>
            {patent.businessValueScore}
          </span>
          <span className="cell-tier-tag font-mono">
            {patent.businessValueTier}
          </span>
        </div>
        <div className="cell-value-track">
          <div
            className={`cell-value-fill ${tierClass}`}
            style={{ width: `${Math.min(100, patent.businessValueScore)}%` }}
          />
        </div>
      </div>

      {/* 3. DEADLINE COLUMN */}
      <div className="col-cell col-deadline-meta">
        <div className={`cell-days-remaining font-mono ${isUrgent ? 'urgent' : ''}`}>
          {daysLeft > 0 ? `${daysLeft} DAYS` : 'OVERDUE'}
        </div>
        <div className="cell-formatted-date font-mono">
          {formattedDate}
        </div>
      </div>

      {/* 4. COST COLUMN (Right-aligned) */}
      <div className="col-cell col-cost-meta">
        <div className="cell-cost-amount font-mono">
          {formatPatentCost(patent.renewalCost, patent.jurisdiction)}
        </div>
        <div className="cell-cost-freq font-mono">
          /year
        </div>
      </div>

      {/* 5. RECOMMENDATION COLUMN */}
      <div className="col-cell col-recommendation-meta">
        <div className={`cell-recommendation-badge font-mono ${statusTag.class}`}>
          <span className="status-dot">●</span>
          <span>{statusTag.label}</span>
        </div>
      </div>

      {/* 6. ACTION COLUMN */}
      <div className="col-cell col-action-meta">
        <button
          className="cell-inspect-action-btn font-mono"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(patent);
          }}
        >
          INSPECT →
        </button>
      </div>
    </div>
  );
}

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const getTierClass = (tier) => {
    if (tier === 'HIGH') return 'high';
    if (tier === 'MEDIUM') return 'medium';
    return 'low';
  };

  const getStatusTag = (status, isFlagged, score) => {
    if (status === 'RENEW') return { label: 'RENEW', class: 'renew' };
    if (status === 'LAPSE') return { label: 'LAPSE', class: 'lapse' };
    if (isFlagged || score < 40) return { label: 'LAPSE', class: 'lapse' };
    if (status === 'PENDING') return { label: 'REVIEW', class: 'review' };
    return { label: 'REVIEW', class: 'review' };
  };

  const handleQuickChip = (type) => {
    if (type === 'all') {
      onResetFilters();
    } else if (type === 'urgent') {
      onFilterChange('flagged_only', false);
      onFilterChange('sort_by', 'deadline');
      onFilterChange('sort_order', 'asc');
    } else if (type === 'low-value') {
      onFilterChange('tier', 'LOW');
      onFilterChange('flagged_only', true);
    } else if (type === 'pending') {
      onFilterChange('status', 'PENDING');
      onFilterChange('flagged_only', false);
    } else if (type === 'us') {
      onFilterChange('jurisdiction', 'US');
    } else if (type === 'ep') {
      onFilterChange('jurisdiction', 'EP');
    }
  };

  // Compute portfolio attention requirement
  const attentionCount = patents.filter(
    (p) => isUrgentDeadline(p.renewalDeadline) || p.businessValueScore < 40 || p.isFlagged
  ).length;

  return (
    <div className="portfolio-command-screen">
      {/* 1. SHORT PAGE HEADER */}
      <div className="portfolio-page-header">
        <div className="portfolio-header-kicker font-mono">PORTFOLIO</div>
        <div className="portfolio-header-headline-row">
          <span className="portfolio-assets-count font-mono">
            {totalCount || patents.length} ASSETS
          </span>
          {attentionCount > 0 && (
            <span className="portfolio-attention-signal font-mono">
              <span className="signal-dot urgent" /> {attentionCount} REQUIRE ATTENTION
            </span>
          )}
        </div>
      </div>

      {/* 2. CLEAN HORIZONTAL FILTER BAR */}
      <div className="portfolio-filter-toolbar">
        {/* Search Field */}
        <div className="portfolio-search-box">
          <svg
            className="search-icon"
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
            className="portfolio-search-input"
            placeholder="Search patents..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
          {filters.search && (
            <button
              className="search-clear-x font-mono"
              onClick={() => onFilterChange('search', '')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="portfolio-quick-pills-row">
          <button
            className={`portfolio-pill ${!filters.flagged_only && filters.jurisdiction === 'ALL' && filters.status === 'ALL' && filters.tier === 'ALL' && filters.sort_by === 'score' ? 'active' : ''}`}
            onClick={() => handleQuickChip('all')}
          >
            ALL
          </button>
          <button
            className={`portfolio-pill ${filters.sort_by === 'deadline' ? 'active urgent' : ''}`}
            onClick={() => handleQuickChip('urgent')}
          >
            URGENT
          </button>
          <button
            className={`portfolio-pill ${filters.flagged_only || filters.tier === 'LOW' ? 'active warning' : ''}`}
            onClick={() => handleQuickChip('low-value')}
          >
            REVIEW
          </button>
          <button
            className={`portfolio-pill ${filters.status === 'PENDING' ? 'active' : ''}`}
            onClick={() => handleQuickChip('pending')}
          >
            PENDING
          </button>
          <button
            className={`portfolio-pill ${filters.jurisdiction === 'US' ? 'active' : ''}`}
            onClick={() => handleQuickChip('us')}
          >
            US
          </button>
          <button
            className={`portfolio-pill ${filters.jurisdiction === 'EP' ? 'active' : ''}`}
            onClick={() => handleQuickChip('ep')}
          >
            EP
          </button>
        </div>

        {/* Actions (Filters Dropdown & Reset) */}
        <div className="portfolio-toolbar-actions">
          <button
            className={`portfolio-advanced-toggle-btn font-mono ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <span>FILTERS</span>
            <span className="toggle-arrow">{showAdvancedFilters ? '▲' : '▾'}</span>
          </button>
          <button
            className="portfolio-reset-action-btn font-mono"
            onClick={onResetFilters}
          >
            RESET
          </button>
        </div>
      </div>

      {/* Collapsible Advanced Filters Tray */}
      {showAdvancedFilters && (
        <div className="portfolio-advanced-tray">
          <div className="tray-filter-group">
            <label className="font-mono">JURISDICTION</label>
            <select
              className="terminal-select"
              value={filters.jurisdiction || 'ALL'}
              onChange={(e) => onFilterChange('jurisdiction', e.target.value)}
            >
              <option value="ALL">All Jurisdictions</option>
              <option value="US">US (USPTO)</option>
              <option value="EP">EP (EPO)</option>
              <option value="IN">IN (India)</option>
            </select>
          </div>

          <div className="tray-filter-group">
            <label className="font-mono">VALUE TIER</label>
            <select
              className="terminal-select"
              value={filters.tier || 'ALL'}
              onChange={(e) => onFilterChange('tier', e.target.value)}
            >
              <option value="ALL">All Conviction Tiers</option>
              <option value="HIGH">High Conviction (70–100)</option>
              <option value="MEDIUM">Moderate (40–69)</option>
              <option value="LOW">Low Value (0–39)</option>
            </select>
          </div>

          <div className="tray-filter-group">
            <label className="font-mono">STATUS</label>
            <select
              className="terminal-select"
              value={filters.status || 'ALL'}
              onChange={(e) => onFilterChange('status', e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="REVIEW">REVIEW</option>
              <option value="PENDING">PENDING</option>
              <option value="RENEW">RENEW</option>
              <option value="LAPSE">LAPSE</option>
            </select>
          </div>

          <div className="tray-filter-group">
            <label className="font-mono">SORT BY</label>
            <select
              className="terminal-select"
              value={filters.sort_by || 'score'}
              onChange={(e) => onFilterChange('sort_by', e.target.value)}
            >
              <option value="score">Business Value Score</option>
              <option value="deadline">Renewal Deadline</option>
              <option value="cost">Renewal Cost</option>
              <option value="patentNumber">Patent Number</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. PERFECTLY ALIGNED COMMAND TABLE */}
      <div className="portfolio-command-table-wrapper">
        {/* SHARED CSS GRID HEADER */}
        <div className="portfolio-table-grid portfolio-table-header-row font-mono">
          <div className="col-hdr col-patent-meta">PATENT</div>
          <div className="col-hdr col-value-meta">VALUE</div>
          <div className="col-hdr col-deadline-meta">DEADLINE</div>
          <div className="col-hdr col-cost-meta">COST</div>
          <div className="col-hdr col-recommendation-meta">RECOMMENDATION</div>
          <div className="col-hdr col-action-meta">ACTION</div>
        </div>

        {/* TABLE BODY (SAME EXACT CSS GRID PER ROW) */}
        {loading ? (
          <div className="portfolio-state-message">
            <span className="loading-spinner" />
            <span>Scanning asset conviction data...</span>
          </div>
        ) : patents.length === 0 ? (
          <div className="portfolio-state-message empty">
            <div className="empty-title font-mono">NO PATENTS FOUND</div>
            <p className="empty-sub">No portfolio assets match the active search or filter parameters.</p>
            <button className="empty-reset-cta font-mono" onClick={onResetFilters}>
              RESET FILTERS
            </button>
          </div>
        ) : (
          <div className="portfolio-rows-container">
            {patents.map((pat) => {
              const daysLeft = getDaysToRenewal(pat.renewalDeadline);
              const urgent = isUrgentDeadline(pat.renewalDeadline);
              const isSelected = selectedPatentId === pat.id;
              const statusTag = getStatusTag(pat.renewalStatus, pat.isFlagged, pat.businessValueScore);
              const formattedDate = getFormattedDate(pat.renewalDeadline);
              const tierClass = getTierClass(pat.businessValueTier);

              return (
                <PortfolioRow
                  key={pat.id}
                  patent={pat}
                  isSelected={isSelected}
                  isUrgent={urgent}
                  daysLeft={daysLeft}
                  formattedDate={formattedDate}
                  tierClass={tierClass}
                  statusTag={statusTag}
                  onSelect={onSelectPatent}
                />
              );
            })}
          </div>
        )}

        {/* Table Summary Footer */}
        <div className="portfolio-table-footer-bar font-mono">
          <span>PORTFOLIO ASSETS: <strong>{patents.length}</strong> OF <strong>{totalCount}</strong></span>
          <span className="footer-inspect-hint">Click any row to open the Decision Workspace</span>
        </div>
      </div>
    </div>
  );
}
