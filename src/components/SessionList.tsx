import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import type { Session, PlatformInfo, ThemeMode, SourceFilter } from '@/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isSameDay = d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isSameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Strip basic Markdown formatting for plain-text rendering of release notes */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1');
}

function platformIcon(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'webui': return '💻';
    case 'feishu': return '📱';
    case 'telegram': return '✈️';
    default: return '🔌';
  }
}

interface Props {
  sessions: Session[];
  activeId: string | null;
  platforms: PlatformInfo[];
  theme: ThemeMode;
  version: string;
  sourceFilter: SourceFilter;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onCreate: () => void;
  onOpenSettings: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onRestart: () => void;
  onSourceFilterChange: (filter: SourceFilter) => void;
  restarting?: boolean;
}

export const SessionList: React.FC<Props> = ({
  sessions,
  activeId,
  platforms,
  theme,
  version,
  sourceFilter,
  onSelect,
  onDelete,
  onCreate,
  onOpenSettings,
  onThemeChange,
  onRestart,
  onSourceFilterChange,
  restarting,
}) => {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [releaseInfo, setReleaseInfo] = useState<{ version: string; body: string } | null>(null);

  const checkUpdate = async () => {
    if (checking) return;
    setChecking(true);
    setUpdateMsg(null);
    setReleaseInfo(null);
    try {
      const res = await fetch('https://api.github.com/repos/caixinyun/cc-gateway/releases/latest');
      if (!res.ok) throw new Error('Failed to check');
      const data = await res.json();
      const latest = (data.tag_name as string)?.replace(/^v/, '') || '';
      if (latest && latest !== version) {
        setUpdateMsg(t('sidebar.update_available', { version: latest }));
        const body = (data.body as string) || '';
        setReleaseInfo({ version: latest, body });
      } else {
        setUpdateMsg(t('sidebar.up_to_date'));
      }
    } catch {
      setUpdateMsg(t('sidebar.check_failed'));
    } finally {
      setChecking(false);
      setTimeout(() => setUpdateMsg(null), 4000);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">C</div>
          <h1>cc-gateway</h1>
        </div>
        <div className="header-actions">
          <div className="theme-pill" data-testid="theme-pill">
            <button className={theme === 'auto' ? 'active' : ''} onClick={() => onThemeChange('auto')} title="auto">
              ◐
            </button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => onThemeChange('dark')} title="dark">
              ☾
            </button>
            <button className={theme === 'light' ? 'active' : ''} onClick={() => onThemeChange('light')} title="light">
              ☼
            </button>
          </div>
        </div>
      </div>

      {releaseInfo && (
        <div className="changelog-box">
          <div className="changelog-header">
            <span>{t('sidebar.changelog', { version: releaseInfo.version })}</span>
            <button onClick={() => setReleaseInfo(null)}>×</button>
          </div>
          <div className="changelog-body">{stripMarkdown(releaseInfo.body)}</div>
        </div>
      )}

      <div className="new-session-btn" onClick={onCreate} data-testid="new-session-btn">
        {t('sidebar.new_session')}
      </div>

      <div className="session-list">
        {sessions.length === 0 && (
          <div className="no-sessions">{t('sidebar.no_sessions')}</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-item ${s.id === activeId ? 'active' : ''}`}
            data-testid="session-item"
            data-session-id={s.id}
            onClick={() => onSelect(s.id)}
          >
            <div className="session-info">
              <div className="session-header-row">
                <div className="session-title-group">
                  <span className={`status-dot ${s.active ? 'online' : 'offline'}`} />
                  <span className="platform-icon" title={s.platform}>{platformIcon(s.platform)}</span>
                  <span className="title">{s.title}</span>
                </div>
                <span className="created-at">{formatTime(s.created_at)}</span>
              </div>
              <div className="meta">
                <span className="work-dir" title={s.work_dir}>{s.work_dir}</span>
              </div>
            </div>
            {s.source === 'WebUI' && (
              <button className="delete-btn" onClick={(e) => onDelete(s.id, e)}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="source-filter-pill" data-testid="source-filter-pill">
        <button
          className={sourceFilter === 'all' ? 'active' : ''}
          onClick={() => onSourceFilterChange('all')}
          title={t('sidebar.all_sources')}
        >
          ⊙
        </button>
        <button
          className={sourceFilter === 'WebUI' ? 'active' : ''}
          onClick={() => onSourceFilterChange('WebUI')}
          title="WebUI"
        >
          💻
        </button>
        <button
          className={sourceFilter === 'Feishu' ? 'active' : ''}
          onClick={() => onSourceFilterChange('Feishu')}
          title="Feishu"
        >
          📱
        </button>
        <button
          className={sourceFilter === 'Telegram' ? 'active' : ''}
          onClick={() => onSourceFilterChange('Telegram')}
          title="Telegram"
        >
          ✈️
        </button>
        <button
          className={sourceFilter === 'TUI' ? 'active' : ''}
          onClick={() => onSourceFilterChange('TUI')}
          title="TUI"
        >
          ⌨
        </button>
      </div>

      {platforms.length > 0 && (
        <div className="platforms-section">
          <div className="section-label">{t('sidebar.connected_platforms')}</div>
          {platforms.map((p) => (
            <div key={p.name} className="platform-row">
              <span>{p.name}</span>
              <span className={`platform-status ${p.enabled ? 'connected' : 'off'}`}>
                {p.enabled ? t('sidebar.connected') : t('sidebar.off')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <div className="footer-actions">
          <button className="icon-btn" onClick={onOpenSettings} title={t('sidebar.settings')} data-testid="settings-btn">
            ⚙
          </button>
          <button className={`icon-btn ${restarting ? 'spinning' : ''}`} onClick={onRestart} disabled={restarting} title={t('sidebar.restart_gateway')}>
            ↻
          </button>
        </div>
        <div className="version-info">
          <span className="version-label">{t('sidebar.version', { version })}</span>
          <button onClick={checkUpdate} disabled={checking} title={t('sidebar.check_update')}>
            ↻
          </button>
          {checking && <span style={{ opacity: 0.6 }}>{t('sidebar.checking')}</span>}
          {updateMsg && (
            <span className={`version-msg ${updateMsg.includes('available') ? 'available' : 'ok'}`}>
              {updateMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
