import type { Session, GatewayConfig, PlatformInfo } from '@/types';

const API_BASE = '';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  listSessions: () => fetchJSON<{ sessions: Session[] }>('/api/sessions'),

  createSession: (title: string, workDir = '~') =>
    fetchJSON<{ session?: Session; error?: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, work_dir: workDir }),
    }),

  sendMessage: (sessionId: string, message: string) =>
    fetchJSON<{ response?: string; status?: string; error?: string }>(
      `/api/sessions/${sessionId}/messages`,
      { method: 'POST', body: JSON.stringify({ message }) }
    ),

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

  listDir: (path: string, sessionId?: string | null) =>
    fetchJSON<{ items?: string[]; dir?: string; error?: string }>('/api/cmd/ll', {
      method: 'POST',
      body: JSON.stringify({ path, session_id: sessionId }),
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
};

export function createEventSource(sessionId: string): EventSource {
  return new EventSource(`${API_BASE}/api/sessions/${sessionId}/events`);
}
