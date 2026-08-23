import React from 'react';

export default function IntelligenceStrip({
  upcomingDeadlines = 12,
  pendingDecisions = 8,
  lowValueFlagged = 23,
  onSelectFilter
}) {
  return (
    <div className="intelligence-strip">
      <button
        className="intelligence-readout-item"
        onClick={() => onSelectFilter && onSelectFilter('upcoming')}
        title="Filter portfolio by upcoming renewal deadlines (< 90 days)"
      >
        <span className="readout-label">Upcoming Deadlines</span>
        <span className="readout-value">{upcomingDeadlines}</span>
        <span className="readout-subtext">renewal window within 90 days</span>
      </button>

      <div className="intelligence-separator" />

      <button
        className="intelligence-readout-item"
        onClick={() => onSelectFilter && onSelectFilter('pending')}
        title="Filter portfolio by pending decisions requiring action"
      >
        <span className="readout-label">Pending Decisions</span>
        <span className="readout-value">{pendingDecisions}</span>
        <span className="readout-subtext">awaiting lead attorney review</span>
      </button>

      <div className="intelligence-separator" />

      <button
        className="intelligence-readout-item"
        onClick={() => onSelectFilter && onSelectFilter('low-value')}
        title="Filter portfolio by low-value flagged assets (score < 40)"
      >
        <span className="readout-label">Low-Value Assets</span>
        <span className="readout-value urgent">{lowValueFlagged}</span>
        <span className="readout-subtext" style={{ color: 'var(--urgent)' }}>
          candidates for deliberate lapse
        </span>
      </button>
    </div>
  );
}
