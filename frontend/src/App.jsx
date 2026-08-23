import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import IntelligenceStrip from './components/IntelligenceStrip';
import ScatterPlotMatrix from './components/ScatterPlotMatrix';
import PortfolioTable from './components/PortfolioTable';
import PatentDetailDrawer from './components/PatentDetailDrawer';
import DecisionLogView from './components/DecisionLogView';
import OfficeActionView from './components/OfficeActionView';
import {
  fetchDashboard,
  fetchPatents,
  fetchDecisions,
  submitDecision,
  fetchSystemStatus
} from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'decisions' | 'office-actions'
  const [dashboardData, setDashboardData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [patents, setPatents] = useState([]);
  const [totalPatents, setTotalPatents] = useState(0);
  const [decisions, setDecisions] = useState([]);
  const [selectedPatent, setSelectedPatent] = useState(null);

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingPatents, setLoadingPatents] = useState(false);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  // Filters State
  const initialFilters = {
    search: '',
    jurisdiction: 'ALL',
    status: 'ALL',
    tier: 'ALL',
    source: 'ALL',
    flagged_only: false,
    sort_by: 'score',
    sort_order: 'desc',
    limit: 250,
  };
  const [filters, setFilters] = useState(initialFilters);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  useEffect(() => {
    loadDashboard();
    loadDecisions();
    loadSystemStatus();
  }, []);

  useEffect(() => {
    loadPatents();
  }, [filters]);

  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const data = await fetchDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const data = await fetchSystemStatus();
      setSystemStatus(data);
    } catch (err) {
      console.error('System status error:', err);
    }
  };

  const loadPatents = async () => {
    try {
      setLoadingPatents(true);
      const res = await fetchPatents(filters);
      setPatents(res.patents || []);
      setTotalPatents(res.total || 0);
    } catch (err) {
      console.error('Patents error:', err);
    } finally {
      setLoadingPatents(false);
    }
  };

  const loadDecisions = async () => {
    try {
      setLoadingDecisions(true);
      const data = await fetchDecisions();
      setDecisions(data || []);
    } catch (err) {
      console.error('Decisions error:', err);
    } finally {
      setLoadingDecisions(false);
    }
  };

  const handleFilterChange = (key, value, extraKey = null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(extraKey ? { [extraKey]: prev[extraKey] === 'asc' ? 'desc' : 'asc' } : {}),
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleIntelligenceStripFilter = (type) => {
    setActiveTab('portfolio');
    if (type === 'low-value') {
      setFilters({
        ...initialFilters,
        tier: 'LOW',
        flagged_only: true,
      });
    } else if (type === 'upcoming') {
      setFilters({
        ...initialFilters,
        sort_by: 'deadline',
        sort_order: 'asc',
      });
    } else if (type === 'pending') {
      setFilters({
        ...initialFilters,
        status: 'PENDING',
      });
    }
  };

  const handleDecisionSubmit = async (payload) => {
    setSubmittingDecision(true);
    try {
      const res = await submitDecision(payload);
      showToast(`DECISION COMMITTED: ${res.decision} FOR ${res.patentNumber}`);
      setSelectedPatent(null);

      // Refresh state
      await loadDashboard();
      await loadPatents();
      await loadDecisions();
    } catch (err) {
      console.error('Decision submission error:', err);
      showToast(`SUBMISSION ERROR: ${err.message}`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const stats = dashboardData?.stats || {
    activePatents: 247,
    upcomingDeadlines: 12,
    pendingDecisions: 8,
    lowValueFlagged: 23,
    dataSourceStatus: 'CACHED DATA',
    aiProviderStatus: 'LOCAL DEMO AI',
  };

  return (
    <div className="cinematic-shell">
      {/* Slim Left Sidebar Instrument Panel */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          activePatents: stats.activePatents,
          decisionsCount: decisions.length,
          officeActionsCount: 1,
        }}
        systemStatus={systemStatus}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          dataSourceStatus={stats.dataSourceStatus}
          aiProviderStatus={stats.aiProviderStatus}
        />

        {/* Content Body */}
        <main className="content-body">
          {activeTab === 'portfolio' && (
            <div>
              {/* Cinematic Dashboard Hero */}
              <section className="hero-overview-section">
                <div className="hero-tag">PORTFOLIO OVERVIEW</div>
                <div className="hero-stats-headline">
                  <div className="hero-dominant-number">{stats.activePatents}</div>
                  <div className="hero-dominant-label">ACTIVE PATENTS</div>
                </div>
                <p className="hero-description">
                  Capital deployed across the active intellectual property portfolio.
                </p>
                <div className="hero-indicator-line" />
              </section>

              {/* Horizontal Intelligence Readout Strip */}
              <IntelligenceStrip
                upcomingDeadlines={stats.upcomingDeadlines}
                pendingDecisions={stats.pendingDecisions}
                lowValueFlagged={stats.lowValueFlagged}
                onSelectFilter={handleIntelligenceStripFilter}
              />

              {/* Value vs Deadline Matrix (Scatter Plot) */}
              <ScatterPlotMatrix
                patents={patents}
                onSelectPatent={setSelectedPatent}
                selectedPatentId={selectedPatent?.id}
              />

              {/* Terminal Portfolio Table */}
              <PortfolioTable
                patents={patents}
                totalCount={totalPatents}
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                onSelectPatent={setSelectedPatent}
                selectedPatentId={selectedPatent?.id}
                loading={loadingPatents}
              />
            </div>
          )}

          {activeTab === 'decisions' && (
            <DecisionLogView decisions={decisions} loading={loadingDecisions} />
          )}

          {activeTab === 'office-actions' && (
            <OfficeActionView onNotify={showToast} />
          )}
        </main>
      </div>

      {/* Right Slide-Over Intelligence Drawer */}
      {selectedPatent && (
        <PatentDetailDrawer
          patent={selectedPatent}
          onClose={() => setSelectedPatent(null)}
          onSubmitDecision={handleDecisionSubmit}
          submitting={submittingDecision}
        />
      )}

      {/* Cinematic Toast Notification */}
      {toastMessage && (
        <div className="cinematic-toast">
          <span className="pulse-dot" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
