import React, { useState } from 'react';
import { resetDemoDataset } from '../api/client';

export default function SystemStatusView({
  systemStatus,
  dashboardData,
  onResetComplete,
  onNotify
}) {
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const stats = dashboardData?.stats || {
    activePatents: 247,
    realPatentsCount: 10,
    syntheticPatentsCount: 237,
    dataSourceStatus: 'CACHED DATA',
    aiProviderStatus: 'LOCAL DEMO AI'
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      const res = await resetDemoDataset();
      setConfirmResetOpen(false);
      if (onNotify) {
        onNotify(`✓ ${res.message || 'Database freshly seeded with 247 patents.'}`);
      }
      if (onResetComplete) {
        await onResetComplete();
      }
    } catch (err) {
      console.error('Reset demo error:', err);
      if (onNotify) {
        onNotify(`Reset failed: ${err.message}`);
      }
    } finally {
      setResetting(false);
    }
  };

  const usptoStatus = systemStatus?.uspto || (stats.dataSourceStatus === 'LIVE DATA' ? 'LIVE' : 'CACHED');
  const epoStatus = systemStatus?.epo || (stats.dataSourceStatus === 'LIVE DATA' ? 'LIVE' : 'CACHED');
  const aiStatus = systemStatus?.ai || stats.aiProviderStatus || 'LOCAL DEMO AI';

  return (
    <div className="system-view-container">
      {/* 1. TOP HEADER */}
      <div className="system-header-panel">
        <div className="section-title-tag font-mono">SYSTEM DIAGNOSTICS</div>
        <h2 className="system-main-heading">RUNTIME STATUS</h2>
      </div>

      {/* 2. COMPACT DIAGNOSTIC TILES GRID */}
      <div className="system-tiles-grid">
        <div className="system-diag-tile">
          <div className="tile-top">
            <span className="tile-label font-mono">DATABASE</span>
            <span className="tile-status-tag connected font-mono">
              <span className="pulse-dot" /> CONNECTED
            </span>
          </div>
          <div className="tile-value font-mono">SQLite (WAL)</div>
        </div>

        <div className="system-diag-tile">
          <div className="tile-top">
            <span className="tile-label font-mono">USPTO ODP</span>
            <span className={`tile-status-tag ${usptoStatus === 'LIVE' ? 'connected' : 'cached'} font-mono`}>
              <span className="pulse-dot" /> {usptoStatus === 'LIVE' ? 'LIVE' : 'CACHED'}
            </span>
          </div>
          <div className="tile-value font-mono">API v1</div>
        </div>

        <div className="system-diag-tile">
          <div className="tile-top">
            <span className="tile-label font-mono">EPO OPS</span>
            <span className={`tile-status-tag ${epoStatus === 'LIVE' ? 'connected' : 'cached'} font-mono`}>
              <span className="pulse-dot" /> {epoStatus === 'LIVE' ? 'LIVE' : 'CACHED'}
            </span>
          </div>
          <div className="tile-value font-mono">OPS v3.2</div>
        </div>

        <div className="system-diag-tile">
          <div className="tile-top">
            <span className="tile-label font-mono">AI ENGINE</span>
            <span className={`tile-status-tag ${aiStatus === 'ANTHROPIC AI' ? 'connected' : 'local'} font-mono`}>
              <span className="pulse-dot" /> READY
            </span>
          </div>
          <div className="tile-value font-mono">{aiStatus === 'ANTHROPIC AI' ? 'Claude 3.5' : 'Local Legal AI'}</div>
        </div>
      </div>

      {/* 3. PROVENANCE & DATA SUMMARY */}
      <div className="provenance-panel">
        <div className="provenance-header">
          <h3 className="provenance-title font-mono">PORTFOLIO PROVENANCE</h3>
          <span className="provenance-badge font-mono">247 ASSETS</span>
        </div>

        <div className="provenance-breakdown-grid">
          <div className="prov-item">
            <span className="prov-label font-mono">ACTIVE PATENTS</span>
            <span className="prov-val font-mono">{stats.activePatents}</span>
          </div>

          <div className="prov-item">
            <span className="prov-label font-mono">REAL CACHED</span>
            <span className="prov-val text-accent font-mono">{stats.realPatentsCount || 10}</span>
          </div>

          <div className="prov-item">
            <span className="prov-label font-mono">SYNTHETIC</span>
            <span className="prov-val text-muted font-mono">{stats.syntheticPatentsCount || 237}</span>
          </div>

          <div className="prov-item">
            <span className="prov-label font-mono">OFFICE ACTIONS</span>
            <span className="prov-val text-warning font-mono">1</span>
          </div>
        </div>
      </div>

      {/* 4. DEMO DATASET RESET */}
      <div className="dataset-reset-panel">
        <div className="reset-panel-left">
          <h3 className="reset-panel-title font-mono">DATASET RESET</h3>
          <p className="reset-panel-desc font-mono">
            Restore initial deterministic 247-patent dataset.
          </p>
        </div>

        <div className="reset-panel-right">
          {confirmResetOpen ? (
            <div className="confirm-reset-box font-mono">
              <span className="confirm-reset-msg">Reset all 247 assets?</span>
              <div className="confirm-reset-actions">
                <button
                  className="confirm-yes-btn font-mono"
                  onClick={handleResetDemo}
                  disabled={resetting}
                >
                  {resetting ? 'RESETTING...' : 'CONFIRM RESET'}
                </button>
                <button
                  className="confirm-no-btn font-mono"
                  onClick={() => setConfirmResetOpen(false)}
                  disabled={resetting}
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <button
              className="reset-demo-btn font-mono"
              onClick={() => setConfirmResetOpen(true)}
            >
              🔄 RESET DATASET
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
