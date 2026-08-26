import React from 'react';

export default function TopHeader({
  activeTab,
  dataSourceStatus = 'CACHED DATA',
  aiProviderStatus = 'LOCAL DEMO AI',
  onNavigate
}) {
  const tabTitles = {
    'command': 'COMMAND CENTER',
    'batch': 'ROCKETRIDE BATCH ORCHESTRATION',
    'human-review': 'HUMAN-IN-THE-LOOP REVIEW STATION',
    'portfolio': 'PORTFOLIO DIRECTORY',
    'office-actions': 'PROSECUTION WORKSTATION',
    'decisions': 'DECISION AUDIT LEDGER',
    'system': 'PLATFORM RUNTIME & REGISTRY'
  };

  const isLiveRegistry = dataSourceStatus.includes('PRODUCTION') || dataSourceStatus === 'LIVE DATA';

  return (
    <header className="cinematic-top-header">
      {/* Breadcrumb Navigation */}
      <div className="header-breadcrumbs">
        <span className="crumb-root">PATENT+</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-active">{tabTitles[activeTab] || 'COMMAND'}</span>
      </div>

      {/* Status Pills */}
      <div className="header-runtime-pills">
        <button
          className={`runtime-pill ${isLiveRegistry ? 'live' : 'cached'}`}
          onClick={() => onNavigate && onNavigate('system')}
          title="Data Storage & Persistence"
        >
          <span className="pill-dot" />
          <span>{dataSourceStatus || 'DEMO WORKSPACE · SYNTHETIC'}</span>
        </button>

        <button
          className="runtime-pill claude"
          onClick={() => onNavigate && onNavigate('batch')}
          title="AI Execution Engine"
        >
          <span className="pill-dot" />
          <span>ROCKETRIDE WAVE · 4 AGENTS</span>
        </button>

        <div className="runtime-pill session">
          <span className="session-dot">●</span>
          <span>LEAD IP COUNSEL</span>
        </div>
      </div>
    </header>
  );
}
