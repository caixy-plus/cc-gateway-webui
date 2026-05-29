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
  role: 'user' | 'assistant' | 'system';
  content: string;
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
    default: 'claude' | 'cursor';
    claude: {
      cli_path?: string;
      default_args?: string;
      mode?: string;
      permission?: string;
    };
    cursor: {
      cli_path?: string;
      default_args?: string;
      mode?: string;
      permission?: string;
    };
  };
  feishu: {
    enabled: boolean;
    app_id: string;
    app_secret: string;
    allow_from: string;
    encrypt_key: string;
    mode: string;
    webhook_bind: string;
    require_pairing: boolean;
  };
  telegram: {
    enabled: boolean;
    bot_token: string;
    allow_from: string;
    webhook_url: string;
    require_pairing: boolean;
  };
  default_dir: string;
  show_thinking: boolean;
  media_retention_days: number;
  port: number;
  session_retention_per_channel?: number;
}

export interface PendingPairing {
  pairing_code: string;
  platform: string;
  chat_id: string;
  created_at: string;
}

export interface PlatformInfo {
  name: string;
  enabled: boolean;
  mode?: string;
  allow_from: string;
}

export type ThemeMode = 'auto' | 'dark' | 'light';

export type SourceFilter = 'all' | 'WebUI' | 'Feishu' | 'Telegram' | 'TUI';
