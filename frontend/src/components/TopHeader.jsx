import React from 'react';

export default function TopHeader({
  activeTab,
  dataSourceStatus,
  aiProviderStatus
}) {
  const getSectionTitle = () => {
    if (activeTab === 'portfolio') return 'PORTFOLIO INTELLIGENCE';
    if (activeTab === 'decisions') return 'DECISION AUDIT LEDGER';
    if (activeTab === 'office-actions') return 'OFFICE ACTION ANALYST WORKSTATION';
    return 'CONTROL ROOM';
  };

  const getSourceClass = () => {
    if (dataSourceStatus === 'LIVE DATA') return 'live';
    if (dataSourceStatus === 'CACHED DATA') return 'cached';
    return 'demo';
  };

  const getAiClass = () => {
    if (aiProviderStatus === 'ANTHROPIC AI') return 'ai';
    return 'demo';
  };

  return (
    <header className="top-header">
      <div className="top-header-left">
        <span className="header-section-title">{getSectionTitle()}</span>
        <span className="header-date-string">Sunday, 23 August 2026</span>
      </div>

      <div className="top-header-right">
        <div className={`header-pill ${getSourceClass()}`} title="External Patent Data Pipeline">
          <span className="pulse-dot" /> {dataSourceStatus || 'CACHED DATA'}
        </div>

        <div className={`header-pill ${getAiClass()}`} title="Active AI Legal Intelligence Engine">
          <span className="pulse-dot" /> {aiProviderStatus || 'LOCAL DEMO AI'}
        </div>
      </div>
    </header>
  );
}
