import React from 'react';

export default function Sidebar({
  activeTab,
  onTabChange,
  counts = {},
  systemStatus
}) {
  const navItems = [
    { id: 'command', label: 'COMMAND', badge: counts.attentionCount > 0 ? `${counts.attentionCount}` : null, badgeClass: 'urgent' },
    { id: 'batch', label: 'BATCH ENGINE', badge: 'PIPE', badgeClass: 'accent' },
    { id: 'human-review', label: 'HUMAN REVIEW', badge: counts.humanReviewCount > 0 ? `${counts.humanReviewCount}` : null, badgeClass: 'warning' },
    { id: 'portfolio', label: 'PORTFOLIO', badge: `${counts.activePatents || 247}` },
    { id: 'office-actions', label: 'OFFICE ACTIONS', badge: counts.officeActionsCount ? `${counts.officeActionsCount}` : null },
    { id: 'decisions', label: 'AUDIT LEDGER', badge: counts.decisionsCount > 0 ? `${counts.decisionsCount}` : null },
    { id: 'system', label: 'SYSTEM' }
  ];

  return (
    <aside className="cinematic-sidebar">
      <div className="sidebar-top">
        {/* Brand */}
        <div className="sidebar-brand-block" onClick={() => onTabChange('command')}>
          <div className="brand-symbol">◈</div>
          <div className="brand-text">
            <span className="brand-name">PATENT+</span>
            <span className="brand-sub">INTELLIGENCE</span>
          </div>
        </div>

        {/* Minimal Navigation */}
        <nav className="sidebar-nav-list">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => onTabChange(item.id)}
              >
                <span className="nav-btn-label">{item.label}</span>
                {item.badge && (
                  <span className={`nav-btn-badge ${item.badgeClass || ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Minimal Footer System Status Indicator */}
      <div className="sidebar-footer-diagnostic" onClick={() => onTabChange('system')}>
        <div className="diag-pulse-line">
          <span className="pulse-dot" />
          <span className="diag-engine-name">SQLITE · ACTIVE</span>
        </div>
        <span className="diag-link-arrow">SYSTEM →</span>
      </div>
    </aside>
  );
}
