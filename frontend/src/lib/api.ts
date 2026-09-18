import { useAuthStore } from './auth';

const API_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? ''
    : '';

/**
 * Centralized API client that attaches Authorization Bearer from React state.
 * Never logs the token. Returns null on 401 to let callers handle re-auth.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; data: unknown; error?: string }> {
  const token = useAuthStore.getState().token;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Clear token on 401 — caller should handle re-auth
    useAuthStore.getState().clearToken();
    return { ok: false, status: 401, data: {}, error: 'Unauthorized — token invalido o scaduto' };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: string }).error ?? `HTTP ${res.status} ${res.statusText}`;
    return { ok: false, status: res.status, data: {}, error: msg };
  }

  const data = await res.json();
  return { ok: true, status: res.status, data };
}

export async function fetchModels(): Promise<unknown[]> {
  const result = await apiFetch('/api/localai/models');
  if (!result.ok) throw new Error(result.error ?? `HTTP ${result.status}`);
  return (result.data as { data?: unknown[] }).data ?? [];
}

export async function sendChat(model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const result = await apiFetch('/api/localai/chat', {
    method: 'POST',
    body: JSON.stringify({ model, messages }),
  });
  if (!result.ok) throw new Error(result.error ?? `HTTP ${result.status}`);
  const data = result.data as { choices?: Array<{ message?: { content: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model');
  return content;
}

export async function deleteModel(modelId: string): Promise<void> {
  const result = await apiFetch(`/api/localai/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
  });
  if (!result.ok) throw new Error(result.error ?? `HTTP ${result.status}`);
}

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  // Health is public, no auth required
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ status: string; timestamp: string }>;
}
