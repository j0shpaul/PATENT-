import React from 'react';

export default function TopHeader({
  activeTab,
  dataSourceStatus = 'CACHED DATA',
  aiProviderStatus = 'LOCAL DEMO AI',
  onNavigate
}) {
  const tabTitles = {
    'command': 'COMMAND CENTER',
    'portfolio': 'PORTFOLIO DIRECTORY',
    'office-actions': 'PROSECUTION WORKSTATION',
    'decisions': 'DECISION AUDIT LEDGER',
    'system': 'PLATFORM RUNTIME & REGISTRY'
  };

  const isLiveRegistry = dataSourceStatus === 'LIVE DATA';
  const isClaudeAI = aiProviderStatus === 'ANTHROPIC AI' || aiProviderStatus === 'ANTHROPIC_AI';

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
          title="Patent Registry Connection Status"
        >
          <span className="pill-dot" />
          <span>{isLiveRegistry ? 'LIVE REGISTRY' : 'VERIFIED CACHE'}</span>
        </button>

        <button
          className={`runtime-pill ${isClaudeAI ? 'claude' : 'local'}`}
          onClick={() => onNavigate && onNavigate('system')}
          title="AI Legal Intelligence Provider"
        >
          <span className="pill-dot" />
          <span>{isClaudeAI ? 'CLAUDE 3.5' : 'LOCAL DEMO AI'}</span>
        </button>

        <div className="runtime-pill session">
          <span className="session-dot">●</span>
          <span>LEAD IP COUNSEL</span>
        </div>
      </div>
    </header>
  );
}
