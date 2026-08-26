import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import CommandOverview from './components/CommandOverview';
import PortfolioTable from './components/PortfolioTable';
import PatentDetailDrawer from './components/PatentDetailDrawer';
import OfficeActionView from './components/OfficeActionView';
import DecisionLogView from './components/DecisionLogView';
import SystemStatusView from './components/SystemStatusView';
import BatchProcessingView from './components/BatchProcessingView';
import HumanReviewStation from './components/HumanReviewStation';
import { executeRocketRidePatentBatch } from './api/rocketridePipelineRunner';
import {
  fetchDashboard,
  fetchPatents,
  fetchPatent,
  fetchDecisions,
  submitDecision,
  fetchSystemStatus
} from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('command'); // 'command' | 'batch' | 'human-review' | 'portfolio' | 'office-actions' | 'decisions' | 'system'
  const [dashboardData, setDashboardData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  
  // Canonical complete portfolio dataset (always contains the full 247 portfolio records)
  const [allPatents, setAllPatents] = useState([]);
  
  // Filtered dataset specifically for PortfolioTable view
  const [portfolioPatents, setPortfolioPatents] = useState([]);
  const [totalPortfolioPatents, setTotalPortfolioPatents] = useState(0);
  
  const [decisions, setDecisions] = useState([]);
  const [selectedPatent, setSelectedPatent] = useState(null);

  // RocketRide Batch Engine & Human Review State
  const [batchResult, setBatchResult] = useState(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [humanReviewQueue, setHumanReviewQueue] = useState([]);

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
      const list = res.patents || [];
      setAllPatents(list);
      // Pre-populate human review queue with seeded review cases if not already populated
      setHumanReviewQueue((prev) => {
        if (prev.length > 0) return prev;
        return list.filter(
          (p) =>
            p.requiresHumanReview ||
            p.status === 'HUMAN_REVIEW' ||
            p.renewalStatus === 'REVIEW' ||
            p.renewalStatus === 'HUMAN_REVIEW' ||
            (p.confidenceScore && p.confidenceScore < 0.85) ||
            (p.contradictions && p.contradictions.length > 0) ||
            p.isFlagged ||
            p.businessValueScore < 40
        );
      });
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
    if (key === 'tab') {
      if (value === 'ALL') {
        setFilters({
          ...initialFilters,
          search: filters.search || '',
          tab: 'ALL',
        });
      } else if (value === 'URGENT') {
        setFilters({
          ...initialFilters,
          search: filters.search || '',
          tab: 'URGENT',
          sort_by: 'deadline',
          sort_order: 'asc',
        });
      } else if (value === 'REVIEW') {
        setFilters({
          ...initialFilters,
          search: filters.search || '',
          tab: 'REVIEW',
        });
      } else if (value === 'US') {
        setFilters({
          ...initialFilters,
          search: filters.search || '',
          tab: 'US',
          jurisdiction: 'US',
        });
      } else if (value === 'EP') {
        setFilters({
          ...initialFilters,
          search: filters.search || '',
          tab: 'EP',
          jurisdiction: 'EP',
        });
      }
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleNavigateToPortfolioWithFilter = ({ filterType }) => {
    if (filterType === 'review' || filterType === 'low-value') {
      setActiveTab('human-review');
      return;
    }
    setActiveTab('portfolio');
    if (filterType === 'urgent') {
      handleFilterChange('tab', 'URGENT');
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

  const handleRunRocketRideBatch = async (batchInput) => {
    setIsProcessingBatch(true);
    setBatchProgress(null);
    try {
      showToast('🚀 Launching RocketRide Multi-Agent Pipeline...');
      const res = await executeRocketRidePatentBatch(batchInput, {
        onProgress: (prog) => setBatchProgress(prog)
      });
      setBatchResult(res);
      setHumanReviewQueue(res.humanReviewQueue || []);
      showToast(`✓ Batch Complete: ${res.summary.totalProcessed} evaluated (${res.summary.humanReviewRequiredCount} in Human Review)`);
    } catch (err) {
      console.error('Batch pipeline execution failed:', err);
      showToast(`Batch execution error: ${err.message}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleCommitHumanDecision = async (payload) => {
    setSubmittingDecision(true);
    try {
      const res = await submitDecision(payload);
      showToast(`✓ HUMAN DECISION COMMITTED: ${res.decision} FOR ${res.patentNumber}`);

      // Remove from human review queue
      setHumanReviewQueue((prev) => prev.filter((p) => p.patentNumber !== payload.patentNumber));

      // Refresh canonical data and views
      await Promise.all([
        loadAllPatents(),
        loadPortfolioPatents(),
        loadDashboard(),
        loadDecisions()
      ]);

      return res;
    } catch (err) {
      console.error('Human decision commitment failed:', err);
      throw err;
    } finally {
      setSubmittingDecision(false);
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
          humanReviewCount: humanReviewQueue.length,
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

          {/* TAB 2: BATCH PROCESSING CONSOLE */}
          {activeTab === 'batch' && (
            <BatchProcessingView
              onRunBatch={handleRunRocketRideBatch}
              isProcessing={isProcessingBatch}
              progress={batchProgress}
              batchResult={batchResult}
              samplePatents={allPatents}
              onNavigateToHumanReview={() => setActiveTab('human-review')}
              onSelectPatent={setSelectedPatent}
            />
          )}

          {/* TAB 3: HUMAN-IN-THE-LOOP REVIEW STATION */}
          {activeTab === 'human-review' && (
            <HumanReviewStation
              reviewQueue={humanReviewQueue}
              onCommitDecision={handleCommitHumanDecision}
              onSelectPatent={setSelectedPatent}
              submitting={submittingDecision}
            />
          )}

          {/* TAB 4: PORTFOLIO (Receives filtered portfolioPatents & canonical allPatents) */}
          {activeTab === 'portfolio' && (
            <PortfolioTable
              patents={portfolioPatents}
              allPatents={allPatents}
              totalCount={totalPortfolioPatents}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onSelectPatent={setSelectedPatent}
              selectedPatentId={selectedPatent?.id}
              loading={loadingPatents}
            />
          )}

          {/* TAB 5: OFFICE ACTIONS */}
          {activeTab === 'office-actions' && (
            <OfficeActionView onNotify={showToast} />
          )}

          {/* TAB 6: DECISIONS AUDIT LEDGER */}
          {activeTab === 'decisions' && (
            <DecisionLogView
              decisions={decisions}
              loading={loadingDecisions}
              onSelectPatentNumber={handleSelectPatentByNumber}
            />
          )}

          {/* TAB 7: SYSTEM DIAGNOSTICS */}
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
