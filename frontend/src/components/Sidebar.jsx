import React from 'react';

export default function Sidebar({
  activeTab,
  onTabChange,
  counts = {},
  systemStatus = {}
}) {
  const getUsptoStatus = () => {
    const s = systemStatus?.uspto;
    if (s === 'LIVE') return { label: 'LIVE', class: 'connected' };
    return { label: 'CACHED', class: 'cached' };
  };

  const getEpoStatus = () => {
    const s = systemStatus?.epo;
    if (s === 'LIVE') return { label: 'LIVE', class: 'connected' };
    return { label: 'CACHED', class: 'cached' };
  };

  const getAiStatus = () => {
    const s = systemStatus?.ai;
    if (s === 'ANTHROPIC AI') return { label: 'CLAUDE', class: 'connected' };
    return { label: 'LOCAL', class: 'local' };
  };

  const uspto = getUsptoStatus();
  const epo = getEpoStatus();
  const ai = getAiStatus();

  return (
    <aside className="sidebar-panel">
      <div className="sidebar-top">
        {/* Brand */}
        <div className="sidebar-brand">
          <span className="sidebar-brand-title">PATENT+</span>
          <span className="sidebar-brand-subtitle">portfolio intelligence</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => onTabChange('portfolio')}
          >
            <div className="sidebar-nav-label">
              <span className="sidebar-nav-dot">{activeTab === 'portfolio' ? '◉' : '◌'}</span>
              <span>Portfolio</span>
            </div>
            {counts.activePatents !== undefined && (
              <span className="sidebar-nav-count">{counts.activePatents}</span>
            )}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'decisions' ? 'active' : ''}`}
            onClick={() => onTabChange('decisions')}
          >
            <div className="sidebar-nav-label">
              <span className="sidebar-nav-dot">{activeTab === 'decisions' ? '◉' : '◌'}</span>
              <span>Decisions</span>
            </div>
            {counts.decisionsCount !== undefined && counts.decisionsCount > 0 && (
              <span className="sidebar-nav-count">{counts.decisionsCount}</span>
            )}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'office-actions' ? 'active' : ''}`}
            onClick={() => onTabChange('office-actions')}
          >
            <div className="sidebar-nav-label">
              <span className="sidebar-nav-dot">{activeTab === 'office-actions' ? '◉' : '◌'}</span>
              <span>Office Actions</span>
            </div>
            {counts.officeActionsCount !== undefined && (
              <span className="sidebar-nav-count">{counts.officeActionsCount}</span>
            )}
          </button>
        </nav>
      </div>

      {/* System Diagnostics Panel */}
      <div className="sidebar-system-card">
        <div className="sidebar-system-title">SYSTEM STATUS</div>
        <div className="system-status-list">
          <div className="system-status-row">
            <span className="system-status-name">USPTO</span>
            <span className={`system-status-val ${uspto.class}`}>
              <span className="pulse-dot" /> {uspto.label}
            </span>
          </div>

          <div className="system-status-row">
            <span className="system-status-name">EPO</span>
            <span className={`system-status-val ${epo.class}`}>
              <span className="pulse-dot" /> {epo.label}
            </span>
          </div>

          <div className="system-status-row">
            <span className="system-status-name">AI ENGINE</span>
            <span className={`system-status-val ${ai.class}`}>
              <span className="pulse-dot" /> {ai.label}
            </span>
          </div>

          <div className="system-status-row">
            <span className="system-status-name">DATABASE</span>
            <span className="system-status-val connected">
              <span className="pulse-dot" /> READY
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
