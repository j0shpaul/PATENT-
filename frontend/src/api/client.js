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
} from './mockService';

const ENV_API_URL = import.meta.env.VITE_API_URL;
const BASE_URL = ENV_API_URL
  ? (ENV_API_URL.endsWith('/api') ? ENV_API_URL.replace(/\/$/, '') : `${ENV_API_URL.replace(/\/$/, '')}/api`)
  : '/api';

export async function fetchDashboard() {
  try {
    const res = await fetch(`${BASE_URL}/dashboard`);
    if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock data for dashboard:', err.message);
    return mockFetchDashboard();
  }
}

export async function fetchPatents(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const res = await fetch(`${BASE_URL}/patents?${query.toString()}`);
    if (!res.ok) throw new Error(`Patents fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock data for patents:', err.message);
    return mockFetchPatents(params);
  }
}

export async function fetchPatent(idOrNumber) {
  try {
    const res = await fetch(`${BASE_URL}/patents/${encodeURIComponent(idOrNumber)}`);
    if (!res.ok) throw new Error(`Patent fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock data for patent detail:', err.message);
    return mockFetchPatent(idOrNumber);
  }
}

export async function recalculateRationale(idOrNumber) {
  try {
    const res = await fetch(`${BASE_URL}/patents/${encodeURIComponent(idOrNumber)}/recalculate-rationale`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Rationale recalculation failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock calculation for rationale:', err.message);
    return mockRecalculateRationale(idOrNumber);
  }
}

export async function fetchDecisions() {
  try {
    const res = await fetch(`${BASE_URL}/decisions`);
    if (!res.ok) throw new Error(`Decisions fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock data for decisions:', err.message);
    return mockFetchDecisions();
  }
}

export async function submitDecision(data) {
  const res = await fetch(`${BASE_URL}/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Decision submission failed: ${res.statusText} (${res.status})`);
  }
  return await res.json();
}

export async function fetchOfficeActions() {
  try {
    const res = await fetch(`${BASE_URL}/office-actions`);
    if (!res.ok) throw new Error(`Office actions fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock data for office actions:', err.message);
    return mockFetchOfficeActions();
  }
}

export async function fetchOfficeAction(id) {
  try {
    const res = await fetch(`${BASE_URL}/office-actions/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Office action fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock data for office action details:', err.message);
    return mockFetchOfficeAction(id);
  }
}

export async function generateOfficeActionDraft(id) {
  try {
    const res = await fetch(`${BASE_URL}/office-actions/${encodeURIComponent(id)}/generate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Office action generation failed: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock draft generator:', err.message);
    return mockGenerateOfficeActionDraft(id);
  }
}

export async function fetchSystemStatus() {
  try {
    const res = await fetch(`${BASE_URL}/system/status`);
    if (!res.ok) throw new Error(`System status fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock system status:', err.message);
    return mockFetchSystemStatus();
  }
}

export async function resetDemoDataset() {
  try {
    const res = await fetch(`${BASE_URL}/system/reset-demo`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Reset demo dataset failed: ${res.statusText}`);
    }
    // Clean any local fallback storage
    try {
      localStorage.removeItem('patent_plus_demo_patents');
      localStorage.removeItem('patent_plus_demo_decisions');
      localStorage.removeItem('patent_plus_demo_oa');
    } catch (_) {}
    return await res.json();
  } catch (err) {
    console.warn('[PATENT+ Demo Mode] Using fallback mock reset:', err.message);
    return mockResetDemoDataset();
  }
}

