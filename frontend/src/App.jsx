import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import CommandOverview from './components/CommandOverview';
import PortfolioTable from './components/PortfolioTable';
import PatentDetailDrawer from './components/PatentDetailDrawer';
import OfficeActionView from './components/OfficeActionView';
import DecisionLogView from './components/DecisionLogView';
import SystemStatusView from './components/SystemStatusView';
import {
  fetchDashboard,
  fetchPatents,
  fetchPatent,
  fetchDecisions,
  submitDecision,
  fetchSystemStatus
} from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('command'); // 'command' | 'portfolio' | 'office-actions' | 'decisions' | 'system'
  const [dashboardData, setDashboardData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  
  // Canonical complete portfolio dataset (always contains the full 247 portfolio records)
  const [allPatents, setAllPatents] = useState([]);
  
  // Filtered dataset specifically for PortfolioTable view
  const [portfolioPatents, setPortfolioPatents] = useState([]);
  const [totalPortfolioPatents, setTotalPortfolioPatents] = useState(0);
  
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
    }, 3600);
  };

  useEffect(() => {
    loadAllPatents();
    loadDashboard();
    loadDecisions();
    loadSystemStatus();
  }, []);

  useEffect(() => {
    loadPortfolioPatents();
  }, [filters]);

  const loadAllPatents = async () => {
    try {
      const res = await fetchPatents({ limit: 250, sort_by: 'score', sort_order: 'desc' });
      setAllPatents(res.patents || []);
    } catch (err) {
      console.error('All patents fetch error:', err);
    }
  };

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

  const loadPortfolioPatents = async () => {
    try {
      setLoadingPatents(true);
      const res = await fetchPatents(filters);
      setPortfolioPatents(res.patents || []);
      setTotalPortfolioPatents(res.total || 0);
    } catch (err) {
      console.error('Portfolio patents error:', err);
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleNavigateToPortfolioWithFilter = ({ filterType }) => {
    setActiveTab('portfolio');
    if (filterType === 'urgent') {
      setFilters({
        ...initialFilters,
        sort_by: 'deadline',
        sort_order: 'asc',
      });
    } else if (filterType === 'low-value') {
      setFilters({
        ...initialFilters,
        tier: 'LOW',
        flagged_only: true,
      });
    } else if (filterType === 'healthy') {
      setFilters({
        ...initialFilters,
        tier: 'HIGH',
      });
    } else {
      setFilters(initialFilters);
    }
  };

  const handleSelectPatentByNumber = async (patentNumber) => {
    try {
      const p = await fetchPatent(patentNumber);
      setSelectedPatent(p);
    } catch (err) {
      console.error('Failed to load patent by number:', err);
      // Fallback search in existing list
      const found = allPatents.find((item) => item.patentNumber === patentNumber) ||
                    portfolioPatents.find((item) => item.patentNumber === patentNumber);
      if (found) setSelectedPatent(found);
    }
  };

  const handleDecisionSubmit = async (payload) => {
    setSubmittingDecision(true);
    try {
      const res = await submitDecision(payload);
      showToast(`DECISION COMMITTED: ${res.decision} FOR ${res.patentNumber}`);

      // Refresh canonical data and views
      await Promise.all([
        loadAllPatents(),
        loadPortfolioPatents(),
        loadDashboard(),
        loadDecisions()
      ]);

      return res;
    } catch (err) {
      console.error('Decision submission failed:', err);
      // Re-throw so drawer can render explicit error state
      throw err;
    } finally {
      setSubmittingDecision(false);
    }
  };

  const stats = dashboardData?.stats || {
    activePatents: allPatents.length || 247,
    upcomingDeadlines: 12,
    pendingDecisions: 8,
    lowValueFlagged: 23,
    dataSourceStatus: 'CACHED DATA',
    aiProviderStatus: 'LOCAL DEMO AI',
  };

  const totalAttention = (stats.upcomingDeadlines || 0) + (stats.lowValueFlagged || 0);

  return (
    <div className="cinematic-shell">
      {/* 1. Slim Left Sidebar Instrument Panel */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          attentionCount: totalAttention,
          activePatents: allPatents.length || stats.activePatents || 247,
          decisionsCount: decisions.length,
          officeActionsCount: 1,
        }}
        systemStatus={systemStatus}
      />

      {/* 2. Main Viewport */}
      <div className="main-viewport">
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          dataSourceStatus={stats.dataSourceStatus}
          aiProviderStatus={stats.aiProviderStatus}
          onNavigate={setActiveTab}
        />

        {/* Content Body */}
        <main className="content-body">
          {/* TAB 1: COMMAND OVERVIEW (Always receives canonical allPatents) */}
          {activeTab === 'command' && (
            <CommandOverview
              dashboardData={dashboardData}
              patents={allPatents}
              decisions={decisions}
              onSelectPatent={setSelectedPatent}
              selectedPatentId={selectedPatent?.id}
              onNavigateToPortfolio={handleNavigateToPortfolioWithFilter}
              onNavigateToDecisions={() => setActiveTab('decisions')}
            />
          )}

          {/* TAB 2: PORTFOLIO (Receives filtered portfolioPatents) */}
          {activeTab === 'portfolio' && (
            <PortfolioTable
              patents={portfolioPatents}
              totalCount={totalPortfolioPatents}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onSelectPatent={setSelectedPatent}
              selectedPatentId={selectedPatent?.id}
              loading={loadingPatents}
            />
          )}

          {/* TAB 3: OFFICE ACTIONS */}
          {activeTab === 'office-actions' && (
            <OfficeActionView onNotify={showToast} />
          )}

          {/* TAB 4: DECISIONS AUDIT LEDGER */}
          {activeTab === 'decisions' && (
            <DecisionLogView
              decisions={decisions}
              loading={loadingDecisions}
              onSelectPatentNumber={handleSelectPatentByNumber}
            />
          )}

          {/* TAB 5: SYSTEM DIAGNOSTICS */}
          {activeTab === 'system' && (
            <SystemStatusView
              systemStatus={systemStatus}
              dashboardData={dashboardData}
              onResetComplete={async () => {
                await Promise.all([
                  loadAllPatents(),
                  loadPortfolioPatents(),
                  loadDashboard(),
                  loadDecisions(),
                  loadSystemStatus()
                ]);
              }}
              onNotify={showToast}
            />
          )}
        </main>
      </div>

      {/* 3. Right Slide-Over Intelligence Workspace Drawer */}
      {selectedPatent && (
        <PatentDetailDrawer
          patent={selectedPatent}
          onClose={() => setSelectedPatent(null)}
          onSubmitDecision={handleDecisionSubmit}
          submitting={submittingDecision}
        />
      )}

      {/* 4. Cinematic Toast Notification */}
      {toastMessage && (
        <div className="cinematic-toast">
          <span className="pulse-dot" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
