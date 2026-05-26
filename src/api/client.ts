import type { Session, GatewayConfig, PlatformInfo } from '@/types';

const API_BASE = '';

export interface UpdateCheckResponse {
  status?: 'available' | 'up_to_date' | string;
  update_available?: boolean;
  has_update?: boolean;
  current?: string;
  current_version?: string;
  latest?: string;
  latest_version?: string;
  release_notes?: string;
  body?: string;
  download_url?: string;
  url?: string;
  error?: string;
}

async function fetchJSON<T>(url: string, options?: RequestInit, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  listSessions: (source?: string) =>
    fetchJSON<{ sessions: Session[] }>(`/api/sessions${source ? `?source=${encodeURIComponent(source)}` : ''}`),

  createSession: (title: string, workDir = '~') =>
    fetchJSON<{ session?: Session; error?: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, work_dir: workDir }),
    }),

  sendMessage: (sessionId: string, message: string, signal?: AbortSignal) =>
    fetchJSON<{ response?: string; status?: string; error?: string }>(
      `/api/sessions/${sessionId}/messages`,
      { method: 'POST', body: JSON.stringify({ message }) },
      signal
    ),

  startSession: (sessionId: string) =>
    fetchJSON<{ status?: string; session?: Session; error?: string }>(
      `/api/sessions/${sessionId}/start`,
      { method: 'POST' }
    ),

  // NOTE: stop (POST) and delete (DELETE) share the same URL /api/sessions/{id}.
  // The backend distinguishes by HTTP method: POST -> handle_stop_session, DELETE -> handle_delete_session.
  // This is intentional; do not mistake POST here for the create-session or start-session endpoints.
  stopSession: (sessionId: string) =>
    fetchJSON<{ status?: string; error?: string }>(`/api/sessions/${sessionId}`, {
      method: 'POST',
    }),

  deleteSession: (sessionId: string) =>
    fetchJSON<{ status?: string; error?: string }>(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  getHistory: (sessionId: string) =>
    fetchJSON<{ history: Array<{ role: string; content: string }>; error?: string }>(
      `/api/sessions/${sessionId}/history`
    ),

  listDir: (path: string, sessionId?: string | null, showHidden = false) =>
    fetchJSON<{ items?: string[]; dir?: string; error?: string }>('/api/cmd/ll', {
      method: 'POST',
      body: JSON.stringify({ path, session_id: sessionId, show_hidden: showHidden }),
    }),

  changeDir: (path: string, sessionId?: string | null) =>
    fetchJSON<{ dir?: string; error?: string }>('/api/cmd/cd', {
      method: 'POST',
      body: JSON.stringify({ path, session_id: sessionId }),
    }),

  pwd: (sessionId?: string | null) =>
    fetchJSON<{ dir?: string; error?: string }>('/api/cmd/pwd', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),

  resetDir: (sessionId?: string | null) =>
    fetchJSON<{ dir?: string; error?: string }>('/api/cmd/cd_default', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),

  getConfig: () => fetchJSON<{ config: GatewayConfig; effective: Partial<GatewayConfig> }>('/api/config'),

  saveConfig: (config: Partial<GatewayConfig>) =>
    fetchJSON<{ status?: string; error?: string }>('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getPlatforms: () => fetchJSON<{ platforms: PlatformInfo[] }>('/api/platforms'),

  getVersion: () => fetchJSON<{ version: string }>('/api/version'),

  checkUpdate: () => fetchJSON<UpdateCheckResponse>('/api/update/check'),

  installUpdate: () => fetchJSON<{ status?: string; command?: string; error?: string }>('/api/update', {
    method: 'POST',
  }),

  restart: () => fetchJSON<{ status?: string; command?: string; error?: string }>('/api/restart', {
    method: 'POST',
  }),
};

export function createEventSource(sessionId: string): EventSource {
  return new EventSource(`${API_BASE}/api/sessions/${sessionId}/events`);
}
