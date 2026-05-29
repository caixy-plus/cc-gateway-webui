import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import { api } from '@/api/client';
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

type UpdateState = 'available' | 'installing' | 'install_started' | 'install_error';

interface UpdateDialogState {
  open: boolean;
  state: UpdateState;
  latest: string;
  current: string;
  body: string;
  error: string;
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
  onOpenPairing: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onRestart: () => void;
  onSourceFilterChange: (filter: SourceFilter) => void;
  restarting?: boolean;
  pairingCount?: number;
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
  onOpenPairing,
  onThemeChange,
  onRestart,
  onSourceFilterChange,
  restarting,
  pairingCount,
}) => {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [updateMsgKind, setUpdateMsgKind] = useState<'ok' | 'error'>('ok');
  const [updateDialog, setUpdateDialog] = useState<UpdateDialogState>({
    open: false,
    state: 'available',
    latest: '',
    current: version,
    body: '',
    error: '',
  });

  const checkUpdate = async () => {
    if (checking) return;
    setChecking(true);
    setUpdateMsg(null);
    try {
      const data = await api.checkUpdate();
      if (data.error) throw new Error(data.error);
      const latest = (data.latest_version || data.latest || '').replace(/^v/, '');
      const current = data.current_version || data.current || version;
      const body = data.release_notes || data.body || '';
      const hasUpdate = data.update_available ?? data.has_update ?? (latest !== '' && latest !== version);
      if (hasUpdate) {
        setUpdateDialog({
          open: true,
          state: 'available',
          latest,
          current,
          body,
          error: '',
        });
      } else {
        setUpdateMsgKind('ok');
        setUpdateMsg(t('sidebar.up_to_date'));
        window.setTimeout(() => setUpdateMsg(null), 4000);
      }
    } catch (err) {
      setUpdateMsgKind('error');
      setUpdateMsg(t('sidebar.check_failed'));
      window.setTimeout(() => setUpdateMsg(null), 4000);
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    if (updateDialog.state === 'installing') return;
    setUpdateDialog((prev) => ({ ...prev, state: 'installing', error: '' }));
    try {
      const data = await api.installUpdate();
      if (data.error) throw new Error(data.error);
      setUpdateDialog((prev) => ({ ...prev, state: 'install_started', error: '' }));
    } catch (err) {
      setUpdateDialog((prev) => ({
        ...prev,
        state: 'install_error',
        error: err instanceof Error ? err.message : t('update.install_failed'),
      }));
    }
  };

  const closeUpdateDialog = () => {
    if (updateDialog.state === 'installing') return;
    setUpdateDialog((prev) => ({ ...prev, open: false }));
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

      {updateDialog.open && (
        <div className="modal-overlay" onClick={closeUpdateDialog}>
          <div className="modal-content update-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('update.title')}</h3>
              <button onClick={closeUpdateDialog} disabled={updateDialog.state === 'installing'}>×</button>
            </div>
            <div className="update-modal-body">
              <div className={`update-hero ${updateDialog.state}`}>
                <div className="update-icon">
                  {updateDialog.state === 'available' && '↑'}
                  {updateDialog.state === 'install_error' && '!'}
                  {updateDialog.state === 'installing' && '↻'}
                  {updateDialog.state === 'install_started' && '✓'}
                </div>
                <div>
                  <div className="update-status-title">
                    {updateDialog.state === 'available' && t('update.available_title', { version: updateDialog.latest })}
                    {updateDialog.state === 'install_error' && t('update.install_error_title')}
                    {updateDialog.state === 'installing' && t('update.installing_title')}
                    {updateDialog.state === 'install_started' && t('update.install_started_title')}
                  </div>
                  <div className="update-status-subtitle">
                    {updateDialog.state === 'available' && t('update.available_desc')}
                    {updateDialog.state === 'install_error' && updateDialog.error}
                    {updateDialog.state === 'installing' && t('update.installing_desc')}
                    {updateDialog.state === 'install_started' && t('update.install_started_desc')}
                  </div>
                </div>
              </div>

              <div className="update-version-grid">
                <div>
                  <span>{t('update.current_version')}</span>
                  <strong>v{updateDialog.current || version}</strong>
                </div>
                <div>
                  <span>{t('update.latest_version')}</span>
                  <strong>{updateDialog.latest ? `v${updateDialog.latest}` : '--'}</strong>
                </div>
              </div>

              {updateDialog.body && (
                <div className="update-notes">
                  <div className="update-notes-title">{t('update.release_notes')}</div>
                  <div className="update-notes-body">{stripMarkdown(updateDialog.body)}</div>
                </div>
              )}
            </div>
            <div className="update-modal-actions">
              <button className="secondary-btn" onClick={closeUpdateDialog} disabled={updateDialog.state === 'installing'}>
                {t('update.close')}
              </button>
              {updateDialog.state === 'install_error' && (
                <button className="secondary-btn" onClick={installUpdate}>
                  {t('update.retry')}
                </button>
              )}
              {updateDialog.state === 'available' && (
                <button className="primary-btn" onClick={installUpdate}>
                  {t('update.install_now')}
                </button>
              )}
            </div>
          </div>
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
                <span className="provider-tag" title="agent provider">
                  {s.provider || 'claude'}
                </span>
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
          <button
            className="icon-btn pairing-btn"
            onClick={onOpenPairing}
            title={t('sidebar.pairing')}
            data-testid="pairing-btn"
          >
            🔑
            {pairingCount !== undefined && pairingCount > 0 && (
              <span className="pairing-badge">{pairingCount}</span>
            )}
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
            <span className={`version-msg ${updateMsgKind}`}>
              {updateMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
