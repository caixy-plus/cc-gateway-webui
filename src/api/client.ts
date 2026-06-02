import type { Session, GatewayConfig, PlatformInfo } from '@/types';

const API_BASE = '';

const TOKEN_KEY = 'cc_gateway_token';

function getToken(): string | null {
  const fromSession = sessionStorage.getItem(TOKEN_KEY);
  if (fromSession) return fromSession;

  const fromLocal = (() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  })();
  if (fromLocal) {
    sessionStorage.setItem(TOKEN_KEY, fromLocal);
    return fromLocal;
  }

  const m = document.cookie.match(/(?:^|;\s*)cc_gateway_token=([^;]*)/);
  if (m && m[1]) {
    const decoded = (() => {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return m[1];
      }
    })();
    if (decoded) {
      sessionStorage.setItem(TOKEN_KEY, decoded);
      return decoded;
    }
  }

  return null;
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  // Also set as cookie for robust cross-session persistence
  try {
    const encoded = encodeURIComponent(token);
    document.cookie = `cc_gateway_token=${encoded}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {}
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }
  return { 'Content-Type': 'application/json' };
}

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

export class ApiError extends Error {
  errorKey?: string;
  status: number;

  constructor(message: string, status: number, errorKey?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorKey = errorKey;
  }
}

function tryParseJson(text: string): unknown | null {
  const t = text.trim();
  if (!t) return null;
  // Some endpoints may not set content-type correctly; attempt JSON parse anyway.
  if (!t.startsWith('{') && !t.startsWith('[')) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function extractError(bodyJson: unknown): { message: string; errorKey?: string } {
  const obj = bodyJson && typeof bodyJson === 'object' ? (bodyJson as any) : null;
  const errorKey = obj && typeof obj.error_key === 'string' ? (obj.error_key as string) : undefined;
  const message =
    (obj && typeof obj.error === 'string' ? (obj.error as string) : '') ||
    (obj && typeof obj.message === 'string' ? (obj.message as string) : '') ||
    '';

  // Avoid showing raw JSON as a message.
  if (message) return { message, errorKey };
  return { message: '', errorKey };
}

async function fetchJSON<T>(url: string, options?: RequestInit, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: getAuthHeaders(),
    ...options,
    signal,
  });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const bodyText = await res.text();
  const bodyJson: unknown = (isJson ? tryParseJson(bodyText) : null) ?? tryParseJson(bodyText);

  if (!res.ok) {
    const extracted = extractError(bodyJson);
    const errMsg = extracted.message || `HTTP ${res.status}`;
    throw new ApiError(errMsg, res.status, extracted.errorKey);
  }

  if (bodyJson !== null) {
    const extracted = extractError(bodyJson);
    if (extracted.message) {
      throw new ApiError(extracted.message, res.status, extracted.errorKey);
    }
    return bodyJson as T;
  }
  if (!bodyText) {
    return {} as T;
  }
  return JSON.parse(bodyText) as T;
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

  getConfig: () =>
    fetchJSON<{
      config: GatewayConfig;
      effective: Partial<GatewayConfig>;
      agents?: import('@/types').AgentsApiResponse;
      restart_policy?: import('@/types').ConfigRestartPolicy;
    }>('/api/config'),

  getAgents: () => fetchJSON<import('@/types').AgentsApiResponse>('/api/agents'),

  saveConfig: (config: Partial<GatewayConfig>) =>
    fetchJSON<import('@/types').SaveConfigResult>('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getPlatforms: () => fetchJSON<{ platforms: PlatformInfo[] }>('/api/platforms'),

  setRequirePairing: (platform: string, requirePairing: boolean) =>
    fetchJSON<{ status?: string; platform?: string; require_pairing?: boolean; error?: string }>(
      '/api/platforms/require_pairing',
      { method: 'POST', body: JSON.stringify({ platform, require_pairing: requirePairing }) }
    ),

  getVersion: () => fetchJSON<{ version: string }>('/api/version'),

  checkUpdate: () => fetchJSON<UpdateCheckResponse>('/api/update/check'),

  installUpdate: () => fetchJSON<{ status?: string; command?: string; error?: string }>('/api/update', {
    method: 'POST',
  }),

  restart: () => fetchJSON<{ status?: string; command?: string; error?: string }>('/api/restart', {
    method: 'POST',
  }),

  listPairings: () =>
    fetchJSON<{ pending: Array<{ pairing_code: string; platform: string; chat_id: string; created_at: string }> }>(
      '/api/pairing/pending'
    ),

  approvePairing: (pairingCode: string) =>
    fetchJSON<{ status?: string; platform?: string; chat_id?: string; error?: string }>(
      '/api/pairing/approve',
      { method: 'POST', body: JSON.stringify({ pairing_code: pairingCode }) }
    ),

  rejectPairing: (pairingCode: string) =>
    fetchJSON<{ status?: string; error?: string }>(
      '/api/pairing/reject',
      { method: 'POST', body: JSON.stringify({ pairing_code: pairingCode }) }
    ),

  listApprovedChats: () =>
    fetchJSON<{ approved: Array<{ platform: string; chat_id: string; approved_at: string; enabled: boolean }> }>(
      '/api/pairing/approved'
    ),

  setApprovalEnabled: (platform: string, chatId: string, enabled: boolean) =>
    fetchJSON<{ status?: string; enabled?: boolean; error?: string }>(
      '/api/pairing/approved/set_enabled',
      { method: 'POST', body: JSON.stringify({ platform, chat_id: chatId, enabled }) }
    ),

  removeApproval: (platform: string, chatId: string) =>
    fetchJSON<{ status?: string; error?: string }>(
      '/api/pairing/approved/remove',
      { method: 'POST', body: JSON.stringify({ platform, chat_id: chatId }) }
    ),

  respondPermission: (sessionId: string, requestId: string, action: 'allow' | 'deny', reason?: string) =>
    fetchJSON<{ status?: string; error?: string }>(
      `/api/sessions/${sessionId}/permission`,
      { method: 'POST', body: JSON.stringify({ request_id: requestId, action, reason }) }
    ),
};

export function createEventSource(sessionId: string): EventSource {
  const token = getToken();
  const url = token
    ? `${API_BASE}/api/sessions/${sessionId}/events?token=${encodeURIComponent(token)}`
    : `${API_BASE}/api/sessions/${sessionId}/events`;
  return new EventSource(url);
}
