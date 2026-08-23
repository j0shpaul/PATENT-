import React from 'react';

export default function Navigation({ activeTab, onTabChange, counts = {} }) {
  return (
    <nav className="app-nav">
      <button
        className={`nav-tab ${activeTab === 'portfolio' ? 'active' : ''}`}
        onClick={() => onTabChange('portfolio')}
      >
        <span>Portfolio</span>
        {counts.activePatents !== undefined && (
          <span className="nav-badge">{counts.activePatents}</span>
        )}
      </button>

      <button
        className={`nav-tab ${activeTab === 'decisions' ? 'active' : ''}`}
        onClick={() => onTabChange('decisions')}
      >
        <span>Decisions</span>
        {counts.decisionsCount !== undefined && counts.decisionsCount > 0 && (
          <span className="nav-badge">{counts.decisionsCount}</span>
        )}
      </button>

      <button
        className={`nav-tab ${activeTab === 'office-actions' ? 'active' : ''}`}
        onClick={() => onTabChange('office-actions')}
      >
        <span>Office Actions</span>
        {counts.officeActionsCount !== undefined && (
          <span className="nav-badge">{counts.officeActionsCount}</span>
        )}
      </button>
    </nav>
  );
}
