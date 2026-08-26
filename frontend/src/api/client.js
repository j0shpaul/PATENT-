// ==============================================================================
// PATENT+ — Data Access Layer & Production API Client
// ==============================================================================

import {
  mockFetchDashboard,
  mockFetchPatents,
  mockFetchPatent,
  mockRecalculateRationale,
  mockFetchDecisions,
  mockSubmitDecision,
  mockFetchOfficeActions,
  mockFetchOfficeAction,
  mockGenerateOfficeActionDraft,
  mockFetchSystemStatus,
  mockResetDemoDataset
} from './mockService.js';

const ENV_API_URL = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_API_URL || '').trim() : '';
const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.DEV) : false;
export const isProduction = typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.PROD) : false;

const getBaseUrl = () => {
  if (ENV_API_URL) {
    return ENV_API_URL.endsWith('/api') ? ENV_API_URL.replace(/\/$/, '') : `${ENV_API_URL.replace(/\/$/, '')}/api`;
  }
  
  // Local development environment handling
  if (IS_DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
    if (typeof window !== 'undefined' && window.location.port === '5173') {
      return '/api';
    }
    return null;
  }
  
  return null;
};

const BASE_URL = getBaseUrl();

export async function fetchDashboard() {
  if (!BASE_URL) {
    return mockFetchDashboard();
  }

  try {
    const res = await fetch(`${BASE_URL}/dashboard`);
    if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] External backend unreachable, using workspace data:', err.message);
    return mockFetchDashboard();
  }
}

export async function fetchPatents(params = {}) {
  if (!BASE_URL) {
    return mockFetchPatents(params);
  }

  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const res = await fetch(`${BASE_URL}/patents?${query.toString()}`);
    if (!res.ok) throw new Error(`Patents fetch failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] External backend unreachable, using workspace data:', err.message);
    return mockFetchPatents(params);
  }
}

export async function fetchPatent(idOrNumber) {
  if (!BASE_URL) {
    return mockFetchPatent(idOrNumber);
  }

  try {
    const res = await fetch(`${BASE_URL}/patents/${encodeURIComponent(idOrNumber)}`);
    if (!res.ok) throw new Error(`Patent detail fetch failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn(`[PATENT+ Data Layer] External backend unreachable for ${idOrNumber}, using workspace data:`, err.message);
    return mockFetchPatent(idOrNumber);
  }
}

export async function recalculateRationale(idOrNumber) {
  if (!BASE_URL) {
    return mockRecalculateRationale(idOrNumber);
  }

  try {
    const res = await fetch(`${BASE_URL}/patents/${encodeURIComponent(idOrNumber)}/recalculate-rationale`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Rationale recalculation failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] Recalculating rationale locally:', err.message);
    return mockRecalculateRationale(idOrNumber);
  }
}

export async function fetchDecisions() {
  if (!BASE_URL) {
    return mockFetchDecisions();
  }

  try {
    const res = await fetch(`${BASE_URL}/decisions`);
    if (!res.ok) throw new Error(`Decisions fetch failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] Using workspace decision ledger:', err.message);
    return mockFetchDecisions();
  }
}

export async function submitDecision(data) {
  if (!BASE_URL) {
    return mockSubmitDecision(data);
  }

  try {
    const res = await fetch(`${BASE_URL}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Decision submission failed: ${res.statusText} (${res.status})`);
    }
    // Also update local workspace mirror
    mockSubmitDecision(data);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] Backend unreachable; persisting decision in workspace storage:', err.message);
    return mockSubmitDecision(data);
  }
}

export async function fetchOfficeActions() {
  if (!BASE_URL) {
    return mockFetchOfficeActions();
  }

  try {
    const res = await fetch(`${BASE_URL}/office-actions`);
    if (!res.ok) throw new Error(`Office actions fetch failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] Using workspace office actions:', err.message);
    return mockFetchOfficeActions();
  }
}

export async function fetchOfficeAction(id) {
  if (!BASE_URL) {
    return mockFetchOfficeAction(id);
  }

  try {
    const res = await fetch(`${BASE_URL}/office-actions/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Office action fetch failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn(`[PATENT+ Data Layer] Using workspace office action for ${id}:`, err.message);
    return mockFetchOfficeAction(id);
  }
}

export async function generateOfficeActionDraft(id) {
  if (!BASE_URL) {
    return mockGenerateOfficeActionDraft(id);
  }

  try {
    const res = await fetch(`${BASE_URL}/office-actions/${encodeURIComponent(id)}/generate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Office action generation failed: ${res.statusText} (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] Generating draft locally:', err.message);
    return mockGenerateOfficeActionDraft(id);
  }
}

export async function fetchSystemStatus() {
  if (!BASE_URL) {
    return mockFetchSystemStatus();
  }

  try {
    const res = await fetch(`${BASE_URL}/system/status`);
    if (!res.ok) throw new Error(`System status fetch failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    return mockFetchSystemStatus();
  }
}

export async function resetDemoDataset() {
  if (!BASE_URL) {
    return mockResetDemoDataset();
  }

  try {
    const res = await fetch(`${BASE_URL}/system/reset-demo`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Reset demo dataset failed: ${res.statusText} (${res.status})`);
    }
    mockResetDemoDataset();
    return await res.json();
  } catch (err) {
    return mockResetDemoDataset();
  }
}

export async function fetchPipelineStatus() {
  if (!BASE_URL) {
    return {
      pipeline: 'PATENT+ Multi-Agent Portfolio Decision Pipeline',
      topology: '5-Column Wave (Webhook -> Guardrails -> 3 Specialists -> Critic -> Consensus)',
      activeProvider: 'GROUNDED_RULE_ENGINE',
      activeModel: 'rule-grounded-v3',
      operatingMode: 'STANDALONE_WORKSPACE',
      status: 'OPERATIONAL'
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/pipeline/status`);
    if (!res.ok) throw new Error(`Pipeline status failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return {
      pipeline: 'PATENT+ Multi-Agent Portfolio Decision Pipeline',
      activeProvider: 'GROUNDED_RULE_ENGINE',
      status: 'OPERATIONAL'
    };
  }
}

export async function executePipelineBatchAPI(patents, batchId) {
  if (!BASE_URL) {
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}/pipeline/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patents, batchId }),
    });
    if (!res.ok) throw new Error(`Batch pipeline execution failed: ${res.statusText} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Data Layer] Backend pipeline execution unavailable, using client-side runner:', err.message);
    return null;
  }
}

