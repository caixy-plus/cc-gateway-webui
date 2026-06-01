export interface Session {
  id: string;
  title: string;
  source: string;
  platform: string;
  chat_id: string;
  work_dir: string;
  active: boolean;
  provider?: string;
  provider_session_id?: string | null;
  created_at: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'permission_request';
  content: string;
  /** request_id for permission/confirm/select/question prompts */
  requestId?: string;
}

export interface EventData {
  session_id: string;
  role: string;
  content: string;
}

export interface DirItem {
  name: string;
  is_dir: boolean;
}

export interface GatewayConfig {
  log: {
    level: string;
    file: string;
    max_lines: number;
    max_size_mb: number;
  };
  agent: {
    default: 'claude' | 'cursor' | 'pi' | 'codewhale';
    claude: {
      enabled?: boolean;
      default_args?: string;
      mode?: string;
      permission?: string;
    };
    cursor: {
      enabled?: boolean;
      default_args?: string;
      mode?: string;
      permission?: string;
    };
    pi: {
      enabled?: boolean;
      default_args?: string;
      mode?: string;
      permission?: string;
    };
    codewhale: {
      enabled?: boolean;
      default_args?: string;
      mode?: string;
      permission?: string;
    };
  };
  feishu: {
    enabled: boolean;
    app_id: string;
    app_secret: string;
    require_pairing: boolean;
  };
  telegram: {
    enabled: boolean;
    bot_token: string;
    require_pairing: boolean;
  };
  default_dir: string;
  show_thinking: boolean;
  media_retention_days: number;
  port: number;
  bind_address: string;
  allowed_ips: string[];
  webui_token?: string;
  session_retention_per_channel?: number;
}

export interface PendingPairing {
  pairing_code: string;
  platform: string;
  chat_id: string;
  created_at: string;
}

export interface ApprovedChat {
  platform: string;
  chat_id: string;
  approved_at: string;
  enabled: boolean;
}

export interface PlatformInfo {
  name: string;
  enabled: boolean;
  state: string;
  require_pairing?: boolean;
}

export type ThemeMode = 'auto' | 'dark' | 'light';

export type SourceFilter = 'all' | 'WebUI' | 'Feishu' | 'Telegram' | 'TUI';

/** Which config fields need a daemon restart vs apply live (from GET /api/config). */
export interface ConfigRestartPolicy {
  daemon_restart: string[];
  live: string[];
}

export interface SaveConfigResult {
  status?: string;
  error?: string;
  requires_restart?: boolean;
  restart_fields?: string[];
  live_fields?: string[];
}
