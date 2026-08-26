// ==============================================================================
// PATENT+ — Deterministic Synthetic Demo & Workspace Persistence Service
// ==============================================================================

import initialMockData from './mockData.json' with { type: 'json' };
import {
  runTechnicalAnalystAgent,
  runValuationAnalystAgent,
  runLegalAnalystAgent,
  runAdversarialCriticAgent,
  runConsensusValidator
} from './rocketridePipelineRunner.js';

export const PATENTPLUS_DEMO_DATA_VERSION = 'v2.2.0';

const STORAGE_KEY_VERSION = 'patent_plus_demo_version';
const STORAGE_KEY_PATENTS = 'patent_plus_demo_patents';
const STORAGE_KEY_DECISIONS = 'patent_plus_demo_decisions';
const STORAGE_KEY_OA = 'patent_plus_demo_oa';

/**
 * Enriches a raw patent record with 4-agent evaluations, consensus validator,
 * contradiction detection, and confidence scoring.
 */
function enrichPatentRecord(raw) {
  const technical = runTechnicalAnalystAgent(raw);
  const valuation = runValuationAnalystAgent(raw);
  const legal = runLegalAnalystAgent(raw);
  const critic = runAdversarialCriticAgent(raw, technical, valuation, legal);
  const consensus = runConsensusValidator(raw, technical, valuation, legal, critic);

  return {
    ...raw,
    compositeScore: consensus.compositeScore,
    confidenceScore: consensus.confidenceScore,
    recommendation: consensus.recommendation,
    status: consensus.status,
    requiresHumanReview: consensus.requiresHumanReview,
    escalationReason: consensus.escalationReason,
    contradictions: consensus.contradictions,
    agents: {
      technical,
      valuation,
      legal,
      critic
    },
    telemetry: {
      promptTokens: 1680,
      completionTokens: 720,
      estimatedCostUSD: 0.0158,
      evaluatedAt: raw.updatedAt || new Date().toISOString()
    }
  };
}

/**
 * Initializes and seeds the deterministic synthetic portfolio idempotently.
 */
function initializeDemoDataset() {
  const rawList = initialMockData.patents || [];
  
  // Specific pre-configured test cases required for Judge Demo
  const caseA_Quantum = {
    id: 'pat-real-001',
    patentNumber: 'US10123456B2',
    applicationNumber: '15/624,192',
    title: 'Fault-Tolerant Quantum Cryptographic Processing Unit and Entangled Key Distribution',
    jurisdiction: 'US',
    applicant: 'Cloudflare / Q-Tech Labs',
    filingDate: '2017-06-15',
    grantDate: '2018-10-30',
    expiryDate: '2037-06-15',
    productRelevance: 94.0,
    citationPercentile: 96.0,
    remainingLifeNormalized: 68.0,
    renewalCost: 3700.0,
    businessValueScore: 88,
    businessValueTier: 'HIGH',
    renewalDeadline: '2026-10-30',
    renewalStatus: 'RENEW',
    isFlagged: false,
    sourceType: 'SYNTHETIC',
    hasOfficeAction: false,
    claims: [
      { claimNumber: 1, isIndependent: true, text: 'A quantum cryptographic processor comprising an array of trapped ion qubits...' },
      { claimNumber: 2, isIndependent: false, text: 'The processor of claim 1, further comprising a cryogenic optical bus...' }
    ]
  };

  const caseB_LowConf = {
    id: 'pat-synth-014',
    patentNumber: 'US10456789B2',
    applicationNumber: '16/244,109',
    title: 'Adaptive Multi-Tenant Edge Cache Invalidation for Ephemeral Serverless Containers',
    jurisdiction: 'US',
    applicant: 'FastEdge Networks Inc.',
    filingDate: '2019-02-10',
    grantDate: '2021-04-18',
    expiryDate: '2039-02-10',
    productRelevance: 52.0,
    citationPercentile: 48.0,
    remainingLifeNormalized: 72.0,
    renewalCost: 4200.0,
    businessValueScore: 50,
    businessValueTier: 'MEDIUM',
    renewalDeadline: '2026-09-15',
    renewalStatus: 'PENDING',
    isFlagged: false,
    sourceType: 'SYNTHETIC',
    hasOfficeAction: true,
    rejectionGrounds: [
      { statute: '35 U.S.C. 103', rejectionType: 'Obviousness over US20180123A1 in view of RFC 7234' }
    ],
    claims: [
      { claimNumber: 1, isIndependent: true, text: 'A caching system operating across heterogeneous network edges...' }
    ]
  };

  const caseC_Contradiction = {
    id: 'pat-synth-088',
    patentNumber: 'US10888999B2',
    applicationNumber: '16/890,231',
    title: 'Distributed Inverted Index Rebalancing Algorithm for Sharded Lexical Datastores',
    jurisdiction: 'US',
    applicant: 'LexiScale Systems Corp.',
    filingDate: '2018-09-20',
    grantDate: '2021-01-12',
    expiryDate: '2038-09-20',
    productRelevance: 34.0,
    citationPercentile: 42.0,
    remainingLifeNormalized: 25.0,
    renewalCost: 6400.0,
    businessValueScore: 76, // Optimistic valuation claim triggering critic contradiction
    businessValueTier: 'HIGH',
    renewalDeadline: '2026-09-30',
    renewalStatus: 'PENDING',
    isFlagged: true,
    sourceType: 'SYNTHETIC',
    hasOfficeAction: true,
    rejectionGrounds: [
      { statute: '35 U.S.C. 102', rejectionType: 'Anticipation by Lucene Core v8.2 Reference Architecture' }
    ],
    claims: [
      { claimNumber: 1, isIndependent: false, text: 'A method for reindexing sharded postings...' }
    ]
  };

  const caseD_Lapse = {
    id: 'pat-synth-190',
    patentNumber: 'US9876543B1',
    applicationNumber: '14/555,102',
    title: 'Legacy Token Ring Media Access Control Protocol for Coaxial Baseband LANs',
    jurisdiction: 'US',
    applicant: 'Legacy Networks LLC',
    filingDate: '2014-04-12',
    grantDate: '2016-08-09',
    expiryDate: '2034-04-12',
    productRelevance: 12.0,
    citationPercentile: 15.0,
    remainingLifeNormalized: 18.0,
    renewalCost: 7400.0,
    businessValueScore: 18,
    businessValueTier: 'LOW',
    renewalDeadline: '2026-08-28',
    renewalStatus: 'LAPSE',
    isFlagged: true,
    sourceType: 'SYNTHETIC',
    hasOfficeAction: false,
    claims: [
      { claimNumber: 1, isIndependent: true, text: 'A token-passing apparatus...' }
    ]
  };

  // Merge raw list with curated case instances
  const baseMap = new Map();
  rawList.forEach((p) => baseMap.set(p.patentNumber, p));
  baseMap.set(caseA_Quantum.patentNumber, caseA_Quantum);
  baseMap.set(caseB_LowConf.patentNumber, caseB_LowConf);
  baseMap.set(caseC_Contradiction.patentNumber, caseC_Contradiction);
  baseMap.set(caseD_Lapse.patentNumber, caseD_Lapse);

  const enrichedList = Array.from(baseMap.values()).map(enrichPatentRecord);
  return enrichedList;
}

export function getStoredPatents() {
  if (typeof window === 'undefined') {
    return initializeDemoDataset();
  }

  try {
    const currentVer = localStorage.getItem(STORAGE_KEY_VERSION);
    if (currentVer === PATENTPLUS_DEMO_DATA_VERSION) {
      const stored = localStorage.getItem(STORAGE_KEY_PATENTS);
      if (stored) return JSON.parse(stored);
    }
  } catch (_) {}

  // Seed fresh version
  const fresh = initializeDemoDataset();
  saveStoredPatents(fresh);
  try {
    localStorage.setItem(STORAGE_KEY_VERSION, PATENTPLUS_DEMO_DATA_VERSION);
  } catch (_) {}
  return fresh;
}

export function saveStoredPatents(patents) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PATENTS, JSON.stringify(patents));
  } catch (_) {}
}

export function getStoredDecisions() {
  if (typeof window === 'undefined') {
    return initialMockData.decisions || [];
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DECISIONS);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return initialMockData.decisions || [];
}

export function saveStoredDecisions(decisions) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(decisions));
  } catch (_) {}
}

export function getStoredOfficeActions() {
  if (typeof window === 'undefined') {
    return initialMockData.officeActions || [];
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY_OA);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return initialMockData.officeActions || [];
}

export function saveStoredOfficeActions(oas) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_OA, JSON.stringify(oas));
  } catch (_) {}
}

export function mockFetchDashboard() {
  const patents = getStoredPatents();
  const decisions = getStoredDecisions();

  const totalActive = patents.length;
  const upcomingDeadlines = patents.filter((p) => {
    if (!p.renewalDeadline) return false;
    return p.renewalDeadline >= '2026-08-01' && p.renewalDeadline <= '2026-11-30';
  }).length;

  const autoStagedCount = patents.filter((p) => p.status === 'AUTO_RECOMMENDATION').length;
  const humanReviewCount = patents.filter((p) => p.status === 'HUMAN_REVIEW' || p.requiresHumanReview).length;
  const renewCount = patents.filter((p) => p.recommendation === 'RENEW').length;
  const lapseCount = patents.filter((p) => p.recommendation === 'LAPSE').length;
  const lowValueFlagged = patents.filter((p) => p.businessValueScore < 40 || p.isFlagged).length;

  const totalCostExposure = patents.reduce((acc, p) => acc + (Number(p.renewalCost) || 0), 0);
  const projectedPruningSavings = patents
    .filter((p) => p.recommendation === 'LAPSE')
    .reduce((acc, p) => acc + (Number(p.renewalCost) || 0), 0);

  const avgConfidence = Math.round(
    patents.reduce((acc, p) => acc + (p.confidenceScore || 0.8), 0) / Math.max(1, patents.length) * 100
  );

  const jurBreakdown = {};
  const tierBreakdown = {};
  const statusBreakdown = {};

  patents.forEach((p) => {
    jurBreakdown[p.jurisdiction] = (jurBreakdown[p.jurisdiction] || 0) + 1;
    tierBreakdown[p.businessValueTier] = (tierBreakdown[p.businessValueTier] || 0) + 1;
    statusBreakdown[p.status || p.renewalStatus] = (statusBreakdown[p.status || p.renewalStatus] || 0) + 1;
  });

  return {
    stats: {
      activePatents: totalActive,
      upcomingDeadlines,
      autoStagedCount,
      humanReviewRequiredCount: humanReviewCount,
      renewRecommendations: renewCount,
      lapseRecommendations: lapseCount,
      lowValueFlagged,
      averageConfidencePercent: avgConfidence,
      totalCostExposureUSD: totalCostExposure,
      projectedPruningSavingsUSD: projectedPruningSavings,
      dataSourceStatus: 'DEMO WORKSPACE · SYNTHETIC',
      aiProviderStatus: 'RocketRide Wave Multi-Agent',
      demoVersion: PATENTPLUS_DEMO_DATA_VERSION
    },
    breakdowns: {
      jurisdiction: jurBreakdown,
      tiers: tierBreakdown,
      status: statusBreakdown
    },
    recentDecisions: decisions.slice(0, 5)
  };
}

import { isUrgentDeadline } from '../utils/dates.js';

export function mockFetchPatents(params = {}) {
  let list = [...getStoredPatents()];

  const search = (params.search || '').trim().toLowerCase();
  if (search) {
    list = list.filter((p) =>
      (p.patentNumber || '').toLowerCase().includes(search) ||
      (p.title || '').toLowerCase().includes(search) ||
      (p.applicant || '').toLowerCase().includes(search)
    );
  }

  // Canonical Tab-based Filtering
  if (params.tab === 'URGENT' || params.urgent_only) {
    list = list.filter((p) => isUrgentDeadline(p.renewalDeadline) || p.isFlagged);
  } else if (params.tab === 'REVIEW' || params.review_only) {
    list = list.filter((p) => p.requiresHumanReview || p.status === 'HUMAN_REVIEW' || (p.confidenceScore && p.confidenceScore < 0.85) || (p.contradictions && p.contradictions.length > 0));
  } else if (params.tab === 'US' || params.jurisdiction === 'US') {
    list = list.filter((p) => p.jurisdiction === 'US');
  } else if (params.tab === 'EP' || params.jurisdiction === 'EP') {
    list = list.filter((p) => p.jurisdiction === 'EP');
  } else {
    // General filters if tab is ALL or unspecified
    if (params.jurisdiction && params.jurisdiction !== 'ALL') {
      list = list.filter((p) => p.jurisdiction === params.jurisdiction);
    }
    if (params.status && params.status !== 'ALL') {
      list = list.filter((p) => (p.status === params.status || p.renewalStatus === params.status));
    }
    if (params.tier && params.tier !== 'ALL') {
      list = list.filter((p) => p.businessValueTier === params.tier);
    }
    if (params.flagged_only) {
      list = list.filter((p) => p.isFlagged);
    }
  }

  // Sorting
  if (params.sort_by === 'deadline') {
    list.sort((a, b) => new Date(a.renewalDeadline) - new Date(b.renewalDeadline));
  } else if (params.sort_by === 'score') {
    list.sort((a, b) => (b.businessValueScore || 0) - (a.businessValueScore || 0));
  } else if (params.sort_by === 'cost') {
    list.sort((a, b) => (b.renewalCost || 0) - (a.renewalCost || 0));
  }
  if (params.sort_order === 'asc' && params.sort_by !== 'deadline') {
    list.reverse();
  }

  const total = list.length;
  const limit = params.limit ? Number(params.limit) : 250;
  const offset = params.offset ? Number(params.offset) : 0;

  return {
    patents: list.slice(offset, offset + limit),
    total,
    limit,
    offset
  };
}

export function mockFetchPatent(idOrNumber) {
  const patents = getStoredPatents();
  const found = patents.find(
    (p) => p.patentNumber === idOrNumber || p.id === idOrNumber || (p.patentNumber && p.patentNumber.replace(/\D/g, '') === idOrNumber.replace(/\D/g, ''))
  );
  if (!found) {
    throw new Error(`Patent record ${idOrNumber} not found in workspace.`);
  }
  return found;
}

export function mockRecalculateRationale(idOrNumber) {
  const patents = getStoredPatents();
  const idx = patents.findIndex((p) => p.patentNumber === idOrNumber || p.id === idOrNumber);
  if (idx === -1) {
    throw new Error(`Patent record ${idOrNumber} not found.`);
  }

  const enriched = enrichPatentRecord(patents[idx]);
  patents[idx] = enriched;
  saveStoredPatents(patents);
  return enriched;
}

export function mockFetchDecisions() {
  return getStoredDecisions();
}

export function mockSubmitDecision(data) {
  const patents = getStoredPatents();
  const decisions = getStoredDecisions();

  const patNumber = data.patentNumber || data.id;
  const decisionType = data.decision || data.actionType || 'RENEW';
  const reasoning = data.reasoning || data.rationale || 'Decision committed by IP Attorney.';

  const newEntry = {
    id: `dec-${Date.now()}`,
    patentNumber: patNumber,
    decision: decisionType,
    previousStatus: 'HUMAN_REVIEW',
    actionType: data.actionType || decisionType,
    reasoning,
    confidenceScore: data.confidenceScore || 0.85,
    contradictions: data.contradictions || [],
    actor: data.actor || 'Lead IP Partner / Attorney',
    timestamp: new Date().toISOString(),
    source: 'RocketRide Human Review Station'
  };

  const updatedDecisions = [newEntry, ...decisions];
  saveStoredDecisions(updatedDecisions);

  // Update patent status in stored portfolio
  const patIndex = patents.findIndex((p) => p.patentNumber === patNumber || p.id === patNumber);
  if (patIndex !== -1) {
    patents[patIndex].renewalStatus = decisionType;
    patents[patIndex].status = 'COMPLETED';
    patents[patIndex].requiresHumanReview = false;
    patents[patIndex].decisionLog = newEntry;
    saveStoredPatents(patents);
  }

  return newEntry;
}

export function mockFetchOfficeActions() {
  return getStoredOfficeActions();
}

export function mockFetchOfficeAction(id) {
  const oas = getStoredOfficeActions();
  const found = oas.find((o) => o.id === id || o.patentNumber === id);
  if (!found) throw new Error(`Office action ${id} not found.`);
  return found;
}

export function mockGenerateOfficeActionDraft(id) {
  const oa = mockFetchOfficeAction(id);
  const draftText = `IN THE UNITED STATES PATENT AND TRADEMARK OFFICE\n\nIn re Application of: ${oa.applicant || 'Patent Applicant'}\nApplication No.: ${oa.applicationNumber || '16/890,231'}\nFor: ${oa.patentTitle || 'Patent Subject Matter'}\n\nRESPONSE UNDER 37 C.F.R. § 1.111\n\nHonorable Commissioner for Patents,\n\nIn response to the outstanding Office Action, Applicant respectfully traverses the statutory rejections under 35 U.S.C. §§ 102/103:\n\nI. CLAIM AMENDMENTS & PERIMETER RESTRUCTURING\nApplicant has amended independent Claim 1 to explicitly incorporate the decentralized cryptographic synchronization parameters disclosed in paragraph [0042]. Specifically, the amended claim elements require dual-phase consensus verification which is neither taught nor suggested by the cited references.\n\nII. TRAVERSAL OF 35 U.S.C. § 102 ANTICIPATION REJECTION\nThe Examiner rejected Claims 1-8 under 35 U.S.C. § 102 as being anticipated by US20210045678A1 (Zhang et al.). Applicant respectfully traverses this ground. Zhang discloses a single-node serialized buffer, which fails to disclose or render obvious Applicant's parallelized fault-tolerant key-distribution protocol.\n\nIII. CONCLUSION\nIn view of the foregoing amendments and remarks, all pending claims are in condition for allowance. Favorable reconsideration and prompt notice of allowance are respectfully requested.`;
  const nowStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  oa.aiResponseDraft = draftText;
  oa.aiProviderUsed = 'RocketRide Legal Prosecution Agent (Claude 3.5 Sonnet)';
  oa.responseDraftedAt = nowStr;

  // Persist updated OA
  const allOas = getStoredOfficeActions();
  const idx = allOas.findIndex((o) => o.id === id || o.patentNumber === id);
  if (idx !== -1) {
    allOas[idx] = oa;
    saveStoredOfficeActions(allOas);
  }

  return {
    officeActionId: id,
    patentNumber: oa.patentNumber,
    draft: draftText,
    generatedDraft: draftText,
    aiResponseDraft: draftText,
    strategy: 'Traverse 35 U.S.C. 102 anticipation rejection with clarifying claim amendment on independent claim 1.',
    responseDraftedAt: nowStr,
    generatedAt: nowStr,
    provider: 'RocketRide Legal Prosecution Agent (Claude 3.5 Sonnet)',
    status: 'SUCCESS'
  };
}

export function mockFetchSystemStatus() {
  return {
    status: 'HEALTHY',
    mode: 'DEMO WORKSPACE',
    aiEngine: 'RocketRide Wave Multi-Agent',
    dataEngine: 'RocketRide Workspace Persistence',
    postgresAuditSink: 'UNAVAILABLE (Local Demo Mode)',
    version: PATENTPLUS_DEMO_DATA_VERSION,
    timestamp: new Date().toISOString()
  };
}

export function mockResetDemoDataset() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_PATENTS);
      localStorage.removeItem(STORAGE_KEY_DECISIONS);
      localStorage.removeItem(STORAGE_KEY_OA);
      localStorage.removeItem(STORAGE_KEY_VERSION);
    } catch (_) {}
  }
  const fresh = initializeDemoDataset();
  saveStoredPatents(fresh);
  return { status: 'RESET_COMPLETE', patentsCount: fresh.length };
}
