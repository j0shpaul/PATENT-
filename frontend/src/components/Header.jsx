import React from 'react';

export default function Header({ dataSourceStatus, aiProviderStatus }) {
  const getSourceClass = () => {
    if (dataSourceStatus === 'LIVE DATA') return 'live';
    if (dataSourceStatus === 'CACHED DATA') return 'cached';
    return 'demo';
  };

  const getAiClass = () => {
    if (aiProviderStatus === 'ANTHROPIC AI') return 'ai-anthropic';
    return 'ai-demo';
  };

  return (
    <header className="app-header">
      <div className="brand-section">
        <span className="brand-title">PATENT+</span>
        <span className="brand-subtitle">portfolio intelligence</span>
      </div>

      <div className="header-status-group">
        <div className={`status-pill ${getSourceClass()}`} title="External patent registry data status">
          <span style={{ fontSize: '9px' }}>●</span> {dataSourceStatus || 'CACHED DATA'}
        </div>

        <div className={`status-pill ${getAiClass()}`} title="Active intelligence generation engine">
          <span style={{ fontSize: '9px' }}>●</span> {aiProviderStatus || 'LOCAL DEMO AI'}
        </div>

        <div className="attorney-pill" title="Current session identity">
          <span>● ATTORNEY (LEAD IP COUNSEL)</span>
        </div>
      </div>
    </header>
  );
}
