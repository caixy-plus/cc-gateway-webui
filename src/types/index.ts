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
  /** CLI flags offered as quick-select chips for default_args (server-driven). */
  default_args_suggestions?: string[];
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
  platforms: PlatformsMap;
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

export interface PlatformFieldSchema {
  key: string;
  kind: 'bool' | 'text' | 'secret';
  label_key: string;
  hint_key?: string | null;
}

export interface PlatformInfo {
  name: string;
  id?: string;
  display_name?: string;
  enabled: boolean;
  state: string;
  require_pairing?: boolean;
  transport?: string;
  capabilities?: Record<string, boolean>;
  fields?: PlatformFieldSchema[];
  config?: Record<string, unknown>;
}

export interface FeishuPlatformConfig {
  enabled: boolean;
  app_id: string;
  app_secret: string;
  require_pairing: boolean;
}

export interface TelegramPlatformConfig {
  enabled: boolean;
  bot_token: string;
  proxy: string;
  require_pairing: boolean;
}

export interface PlatformsMap {
  feishu: FeishuPlatformConfig;
  telegram: TelegramPlatformConfig;
}

export type ThemeMode = 'auto' | 'dark' | 'light';

/** Session list filter: WebUI tab plus integrated platform ids from `GET /api/platforms`. */
export type PlatformFilter = 'webui' | string;

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
