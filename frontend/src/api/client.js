const BASE_URL = '/api';

export async function fetchDashboard() {
  const res = await fetch(`${BASE_URL}/dashboard`);
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchPatents(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const res = await fetch(`${BASE_URL}/patents?${query.toString()}`);
  if (!res.ok) throw new Error(`Patents fetch failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchPatent(idOrNumber) {
  const res = await fetch(`${BASE_URL}/patents/${encodeURIComponent(idOrNumber)}`);
  if (!res.ok) throw new Error(`Patent fetch failed: ${res.statusText}`);
  return await res.json();
}

export async function recalculateRationale(idOrNumber) {
  const res = await fetch(`${BASE_URL}/patents/${encodeURIComponent(idOrNumber)}/recalculate-rationale`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Rationale recalculation failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchDecisions() {
  const res = await fetch(`${BASE_URL}/decisions`);
  if (!res.ok) throw new Error(`Decisions fetch failed: ${res.statusText}`);
  return await res.json();
}

export async function submitDecision(data) {
  const res = await fetch(`${BASE_URL}/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Decision submission failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchOfficeActions() {
  const res = await fetch(`${BASE_URL}/office-actions`);
  if (!res.ok) throw new Error(`Office actions fetch failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchOfficeAction(id) {
  const res = await fetch(`${BASE_URL}/office-actions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Office action fetch failed: ${res.statusText}`);
  return await res.json();
}

export async function generateOfficeActionDraft(id) {
  const res = await fetch(`${BASE_URL}/office-actions/${encodeURIComponent(id)}/generate`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Office action generation failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchSystemStatus() {
  const res = await fetch(`${BASE_URL}/system/status`);
  if (!res.ok) throw new Error(`System status fetch failed: ${res.statusText}`);
  return await res.json();
}
