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
  /** Set when the agent was stopped via WebUI or platform /quit */
  stopped_at?: string | null;
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

export interface AgentProviderConfig {
  enabled?: boolean;
  default_args?: string;
  mode?: string;
  permission?: string;
}

/** Entry from `GET /api/agents` (server-integrated provider catalog). */
export interface AgentCatalogEntry {
  id: string;
  display_name: string;
  cli_binary: string;
  aliases: string[];
  config: AgentProviderConfig;
}

export interface AgentsApiResponse {
  default: string;
  providers: AgentCatalogEntry[];
}

/** `config.json` `agent` — `default` plus dynamic provider profile keys. */
export type AgentSection = {
  default: string;
} & Record<string, string | AgentProviderConfig | undefined>;

export interface GatewayConfig {
  log: {
    level: string;
    file: string;
    max_lines: number;
    max_size_mb: number;
  };
  agent: AgentSection;
  feishu: {
    enabled: boolean;
    app_id: string;
    app_secret: string;
    require_pairing: boolean;
  };
  telegram: {
    enabled: boolean;
    bot_token: string;
    /** HTTP/SOCKS proxy for Telegram Bot API only; empty = direct connection */
    proxy: string;
    require_pairing: boolean;
  };
  qq: {
    enabled: boolean;
    app_id: string;
    app_secret: string;
    sandbox: boolean;
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

/** Session list filter — fixed platform ids from the gateway. */
export type PlatformFilter = 'webui' | 'feishu' | 'telegram' | 'qq';

export const PLATFORM_FILTERS: PlatformFilter[] = [
  'webui',
  'feishu',
  'telegram',
  'qq',
];

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
