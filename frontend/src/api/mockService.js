import initialMockData from './mockData.json';

// In-memory / localStorage state persistence for realistic interactive demo
const STORAGE_KEY_DECISIONS = 'patent_plus_demo_decisions';
const STORAGE_KEY_PATENTS = 'patent_plus_demo_patents';
const STORAGE_KEY_OA = 'patent_plus_demo_oa';

function getStoredPatents() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PATENTS);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return initialMockData.patents;
}

function saveStoredPatents(patents) {
  try {
    localStorage.setItem(STORAGE_KEY_PATENTS, JSON.stringify(patents));
  } catch (_) {}
}

function getStoredDecisions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DECISIONS);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return initialMockData.decisions;
}

function saveStoredDecisions(decisions) {
  try {
    localStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(decisions));
  } catch (_) {}
}

function getStoredOfficeActions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_OA);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return initialMockData.officeActions;
}

function saveStoredOfficeActions(oas) {
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
    return p.renewalDeadline >= '2026-08-23' && p.renewalDeadline <= '2026-11-25';
  }).length;

  const pendingDecisions = patents.filter((p) => p.renewalStatus === 'PENDING').length;
  const lowValueFlagged = patents.filter((p) => p.businessValueScore < 40 || p.isFlagged).length;

  const realCount = patents.filter((p) => p.sourceType === 'REAL').length;
  const syntheticCount = patents.filter((p) => p.sourceType === 'SYNTHETIC').length;

  const jurBreakdown = {};
  const tierBreakdown = {};
  const statusBreakdown = {};

  patents.forEach((p) => {
    jurBreakdown[p.jurisdiction] = (jurBreakdown[p.jurisdiction] || 0) + 1;
    tierBreakdown[p.businessValueTier] = (tierBreakdown[p.businessValueTier] || 0) + 1;
    statusBreakdown[p.renewalStatus] = (statusBreakdown[p.renewalStatus] || 0) + 1;
  });

  return {
    stats: {
      activePatents: totalActive,
      upcomingDeadlines,
      pendingDecisions,
      lowValueFlagged,
      realPatentsCount: realCount,
      syntheticPatentsCount: syntheticCount,
      dataSourceStatus: 'CACHED DATA',
      aiProviderStatus: 'LOCAL DEMO AI'
    },
    breakdowns: {
      jurisdiction: jurBreakdown,
      tiers: tierBreakdown,
      status: statusBreakdown
    },
    recentDecisions: decisions.slice(0, 5)
  };
}

export function mockFetchPatents(params = {}) {
  let list = [...getStoredPatents()];

  const search = (params.search || '').trim().toLowerCase();
  if (search) {
    list = list.filter((p) =>
      (p.patentNumber || '').toLowerCase().includes(search) ||
      (p.title || '').toLowerCase().includes(search) ||
      (p.applicant || '').toLowerCase().includes(search) ||
      (p.applicationNumber || '').toLowerCase().includes(search)
    );
  }

  if (params.jurisdiction && params.jurisdiction !== 'ALL') {
    list = list.filter((p) => p.jurisdiction === params.jurisdiction);
  }

  if (params.status && params.status !== 'ALL') {
    list = list.filter((p) => p.renewalStatus === params.status);
  }

  if (params.tier && params.tier !== 'ALL') {
    list = list.filter((p) => p.businessValueTier === params.tier);
  }

  if (params.source && params.source !== 'ALL') {
    list = list.filter((p) => p.sourceType === params.source);
  }

  if (params.flagged_only) {
    list = list.filter((p) => p.businessValueScore < 40 || p.isFlagged);
  }

  const sortBy = params.sort_by || 'score';
  const sortOrder = (params.sort_order || 'desc').toLowerCase();

  list.sort((a, b) => {
    let valA, valB;
    if (sortBy === 'score') {
      valA = a.businessValueScore;
      valB = b.businessValueScore;
    } else if (sortBy === 'deadline') {
      valA = a.renewalDeadline || '9999-99-99';
      valB = b.renewalDeadline || '9999-99-99';
    } else if (sortBy === 'cost') {
      valA = a.renewalCost;
      valB = b.renewalCost;
    } else if (sortBy === 'patentNumber') {
      valA = a.patentNumber;
      valB = b.patentNumber;
    } else {
      valA = a.businessValueScore;
      valB = b.businessValueScore;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = list.length;
  const limit = params.limit ? parseInt(params.limit, 10) : 250;
  const offset = params.offset ? parseInt(params.offset, 10) : 0;

  return {
    total,
    patents: list.slice(offset, offset + limit)
  };
}

export function mockFetchPatent(idOrNumber) {
  const patents = getStoredPatents();
  const clean = String(idOrNumber).replace(/[,-]/g, '').trim();
  const found = patents.find(
    (p) =>
      p.id === idOrNumber ||
      p.patentNumber === clean ||
      p.patentNumber === idOrNumber ||
      p.applicationNumber === idOrNumber
  );

  if (!found) throw new Error(`Patent '${idOrNumber}' not found.`);
  return found;
}

export function mockRecalculateRationale(idOrNumber) {
  const patents = getStoredPatents();
  const p = mockFetchPatent(idOrNumber);
  const updatedPatents = patents.map((item) => {
    if (item.id === p.id) {
      return {
        ...item,
        updatedAt: new Date().toISOString()
      };
    }
    return item;
  });
  saveStoredPatents(updatedPatents);

  return {
    patentId: p.id,
    businessValueScore: p.businessValueScore,
    businessValueTier: p.businessValueTier,
    businessValueRationale: p.businessValueRationale,
    recalculatedAt: new Date().toISOString()
  };
}

export function mockFetchDecisions() {
  return getStoredDecisions();
}

export function mockSubmitDecision(data) {
  const decisions = getStoredDecisions();
  const patents = getStoredPatents();

  const newDecision = {
    id: `dec-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    patentNumber: data.patentNumber,
    patentTitle: data.patentTitle || 'Protected Asset',
    decision: data.decision,
    reasoning: data.reasoning,
    actor: data.actor || 'Attorney'
  };

  const updatedDecisions = [newDecision, ...decisions];
  saveStoredDecisions(updatedDecisions);

  // Update patent status in stored list
  const updatedPatents = patents.map((p) => {
    if (p.patentNumber === data.patentNumber) {
      return {
        ...p,
        renewalStatus: data.decision,
        updatedAt: new Date().toISOString()
      };
    }
    return p;
  });
  saveStoredPatents(updatedPatents);

  return newDecision;
}

export function mockFetchOfficeActions() {
  return getStoredOfficeActions();
}

export function mockFetchOfficeAction(id) {
  const oas = getStoredOfficeActions();
  const found = oas.find((oa) => oa.id === id || oa.patentId === id || oa.patentNumber === id);
  if (!found) throw new Error(`Office action '${id}' not found.`);
  return found;
}

export function mockGenerateOfficeActionDraft(id) {
  const oas = getStoredOfficeActions();
  const oa = mockFetchOfficeAction(id);

  const draftText = `DEMO GENERATED — ATTORNEY REVIEW REQUIRED
================================================================================
IN THE UNITED STATES PATENT AND TRADEMARK OFFICE

In re Application of:    ${oa.applicant || 'Cloudflare, Inc.'}
Application No.:         ${oa.applicationNumber || '15/624,192'}
Filing Date:             June 15, 2017
Title:                   ${oa.title || 'Ultra-low latency edge data aggregation and dispatching architecture'}
Examiner:                ${oa.examinerName || 'Robert M. Vance'}
Art Unit:                ${oa.artUnit || '2447'}
Office Action Date:      ${oa.documentDate || '2018-03-14'}
================================================================================

RESPONSE UNDER 37 C.F.R. § 1.111 TO NON-FINAL OFFICE ACTION

Mail Stop Amendment
Commissioner for Patents
P.O. Box 1450, Alexandria, VA 22313-1450

Sir:

In response to the Non-Final Office Action mailed on ${oa.documentDate || '2018-03-14'}, Applicant respectfully requests reconsideration of the application and allowance of the pending claims in view of the following remarks and proposed amendments.

--------------------------------------------------------------------------------
I. STATUS OF THE CLAIMS
--------------------------------------------------------------------------------
Claims 1-18 are currently pending in this application. In response to the Office Action:
  - Claim 1 is AMENDED herein to incorporate the dynamic jitter-adapted threshold features of Claim 3 and pre-queue zero-allocation circular buffering.
  - Claims 2-5 are retained and depend from amended Claim 1.
  - Claims 6-18 are maintained pending.

--------------------------------------------------------------------------------
II. AMENDMENTS TO THE CLAIMS
--------------------------------------------------------------------------------
Claim 1 (Currently Amended):
A computer-implemented edge data aggregation and dispatching system comprising:
  one or more edge processors;
  a non-transitory computer-readable memory storing instructions that, when executed by the one or more edge processors, cause the system to:
    intercept an incoming stream of unformatted payload chunks from a plurality of client sessions at an edge routing node;
    compute a cryptographic integrity tag for each payload chunk prior to local queue insertion;
    evaluate a composite dispatch threshold comprising both a time-window threshold (Tw) and an accumulated payload byte volume threshold (Bv), wherein the time-window threshold (Tw) dynamically scales inversely proportional to detected ingress packet jitter over a preceding sliding 500-millisecond monitoring epoch;
    upon satisfaction of either threshold, compress and aggregate the queued payload chunks into a single unified cryptographic dispatch envelope without round-trip signaling to a centralized origin cluster; and
    dispatch the unified cryptographic dispatch envelope across an asynchronous multi-path pipeline to one of a plurality of downstream edge egress nodes selected via a kernel-level zero-allocation circular buffer.

--------------------------------------------------------------------------------
III. REMARKS / TRAVERSE OF REJECTIONS
--------------------------------------------------------------------------------
A. Rejection under 35 U.S.C. § 102(a)(1) Over Srivastava (US 9,438,682 B1)
The Examiner rejected Claim 1 under 35 U.S.C. § 102(a)(1) as being anticipated by Srivastava. Applicant respectfully traverses this rejection.

Srivastava teaches a conventional batching system with fixed static timers and basic FIFO queues (Srivastava, col. 6, lines 18-35). Srivastava fails to teach or suggest the claimed composite dispatch threshold where the time-window threshold dynamically adapts inversely proportional to ingress packet jitter over a preceding sliding 500-ms epoch, combined with zero-allocation circular buffer routing.

Because Srivastava lacks these structural limitations, Claim 1 cannot be anticipated under § 102.

B. Rejection under 35 U.S.C. § 103 Over Srivastava in view of Bovet and Chen
The Examiner rejected Claims 2-5 under 35 U.S.C. § 103 over Srivastava in view of Bovet (US 8,924,561 B2) and Chen (US 2015/0341421 A1).

Neither Bovet nor Chen remedies the deficiencies of Srivastava. Bovet operates strictly at the application session layer rather than kernel-level pre-queue zero-copy buffer dispatching. Combining Srivastava and Bovet would require bodily modification that would disrupt Srivastava's core FIFO aggregation principles without reasonable expectation of success.

--------------------------------------------------------------------------------
IV. CONCLUSION
--------------------------------------------------------------------------------
In view of the foregoing amendments and remarks, all pending claims are patentable over the cited prior art. Favorable reconsideration and prompt notice of allowance are respectfully requested.

Respectfully submitted,
PATENT+ Registered Patent Attorney
Registration No. 74,819`;

  const updatedOas = oas.map((item) => {
    if (item.id === oa.id) {
      return {
        ...item,
        aiResponseDraft: draftText,
        aiProviderUsed: 'LOCAL_DEMO_AI',
        responseDraftedAt: new Date().toISOString()
      };
    }
    return item;
  });
  saveStoredOfficeActions(updatedOas);

  return {
    id: oa.id,
    draft: draftText,
    provider: 'LOCAL_DEMO_AI',
    responseDraftedAt: new Date().toISOString()
  };
}

export function mockFetchSystemStatus() {
  const patents = getStoredPatents();
  const realCount = patents.filter((p) => p.sourceType === 'REAL').length;
  const syntheticCount = patents.filter((p) => p.sourceType === 'SYNTHETIC').length;

  return {
    uspto: 'CACHED',
    epo: 'CACHED',
    ai: 'LOCAL DEMO AI',
    database: 'CONNECTED',
    activePatentsTotal: patents.length,
    sourceBreakdown: {
      REAL: realCount,
      SYNTHETIC: syntheticCount
    }
  };
}
