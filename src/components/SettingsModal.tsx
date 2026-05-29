import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n';
import type { GatewayConfig } from '@/types';

interface Props {
  config: GatewayConfig | null;
  onClose: () => void;
  onSave: (config: Partial<GatewayConfig>) => void;
}

const NEED_RESTART_KEYS = new Set(['port']);

export const SettingsModal: React.FC<Props> = ({ config, onClose, onSave }) => {
  const { t } = useI18n();
  const [form, setForm] = useState<GatewayConfig | null>(null);
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (config) {
      setForm(JSON.parse(JSON.stringify(config)));
      setChangedKeys(new Set());
      setLoadError(false);
    }
  }, [config]);

  // Show error state if config failed to load (config is null after load attempt)
  // The parent should have called loadConfig before opening this modal.
  // We use a flag to distinguish "still loading" from "load failed".
  useEffect(() => {
    if (!config) {
      // If config stays null after mount, it means loadConfig failed in the parent
      const timer = setTimeout(() => setLoadError(true), 500);
      return () => clearTimeout(timer);
    }
  }, [config]);

  if (!form) {
    if (loadError) {
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>{t('settings.title')}</h3>
              <button onClick={onClose}>×</button>
            </div>
            <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <p style={{ marginBottom: '12px' }}>{t('settings.load_failed')}</p>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  background: 'var(--accent)',
                  color: 'var(--bg-void)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {t('app.ok')}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const update = (path: string, value: unknown) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let target: Record<string, unknown> = next;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]] as Record<string, unknown>;
      }
      target[parts[parts.length - 1]] = value;
      return next;
    });
    setChangedKeys((prev) => new Set(prev).add(path.split('.')[0]));
  };

  const handleSave = () => {
    if (!form) return;
    // NOTE: This sends only the top-level keys that were changed. If multiple
    // admins modify different sections concurrently, the last save wins for the
    // entire top-level section (e.g., "feishu", "claude"). A backend-level
    // optimistic concurrency (e.g., ETag / version field) would be needed for
    // full protection against silent overwrites.
    const partial: Partial<GatewayConfig> = {};
    changedKeys.forEach((k) => {
      (partial as unknown as Record<string, unknown>)[k] = (form as unknown as Record<string, unknown>)[k];
    });
    onSave(partial);
  };

  const needsRestart = Array.from(changedKeys).some((k) => NEED_RESTART_KEYS.has(k));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '640px', maxHeight: '85vh' }}>
        <div className="modal-header">
          <h3>{t('settings.title')}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="settings-form">
          {needsRestart && (
            <div className="restart-notice">
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>
                {t('settings.restart_required')}
              </div>
              {t('settings.restart_notice')}
              <div style={{ marginTop: '6px' }}>
                {t('settings.restart_cmd', { cmd: 'cc-gateway restart' })}
              </div>
            </div>
          )}

          <div className="settings-section">
            <h4>{t('settings.general')}</h4>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.port')}</label>
                <input type="number" value={form.port} onChange={(e) => update('port', parseInt(e.target.value) || 17534)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.default_dir')}</label>
                <input type="text" value={form.default_dir} onChange={(e) => update('default_dir', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('settings.media_retention')}</label>
                <input type="number" value={form.media_retention_days} onChange={(e) => update('media_retention_days', parseInt(e.target.value) || 30)} />
              </div>
            </div>
            <div className="form-group checkbox-row">
              <input type="checkbox" id="show_thinking" checked={form.show_thinking} onChange={(e) => update('show_thinking', e.target.checked)} />
              <label htmlFor="show_thinking" style={{ textTransform: 'none', letterSpacing: '0' }}>
                {t('settings.show_thinking')}
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h4>{t('settings.log')}</h4>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.level')}</label>
                <select value={form.log.level} onChange={(e) => update('log.level', e.target.value)}>
                  <option value="trace">trace</option>
                  <option value="debug">debug</option>
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="error">error</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('settings.file')}</label>
                <input type="text" value={form.log.file} onChange={(e) => update('log.file', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.max_lines')}</label>
                <input type="number" value={form.log.max_lines} onChange={(e) => update('log.max_lines', parseInt(e.target.value) || 100000)} />
              </div>
              <div className="form-group">
                <label>{t('settings.max_size')}</label>
                <input type="number" value={form.log.max_size_mb} onChange={(e) => update('log.max_size_mb', parseInt(e.target.value) || 50)} />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h4>{t('settings.agent')}</h4>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.agent_default')}</label>
                <select value={form.agent.default} onChange={(e) => update('agent.default', e.target.value)}>
                  <option value="claude">{t('settings.agent_claude')}</option>
                  <option value="cursor">{t('settings.agent_cursor')}</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.agent_claude')} / {t('settings.cli_path')}</label>
                <input
                  type="text"
                  value={form.agent.claude.cli_path || ''}
                  onChange={(e) => update('agent.claude.cli_path', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('settings.agent_claude')} / {t('settings.default_args')}</label>
                <input
                  type="text"
                  value={form.agent.claude.default_args || ''}
                  onChange={(e) => update('agent.claude.default_args', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.agent_cursor')} / {t('settings.cli_path')}</label>
                <input
                  type="text"
                  value={form.agent.cursor.cli_path || ''}
                  onChange={(e) => update('agent.cursor.cli_path', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('settings.agent_cursor')} / {t('settings.default_args')}</label>
                <input
                  type="text"
                  value={form.agent.cursor.default_args || ''}
                  onChange={(e) => update('agent.cursor.default_args', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h4>{t('settings.feishu')}</h4>
            <div className="form-group checkbox-row">
              <input type="checkbox" id="feishu_enabled" checked={form.feishu.enabled} onChange={(e) => update('feishu.enabled', e.target.checked)} />
              <label htmlFor="feishu_enabled" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.enabled')}</label>
            </div>
            <div className="form-group checkbox-row">
              <input type="checkbox" id="feishu_require_pairing" checked={form.feishu.require_pairing} onChange={(e) => update('feishu.require_pairing', e.target.checked)} />
              <label htmlFor="feishu_require_pairing" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.require_pairing')}</label>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.app_id')}</label>
                <input type="text" value={form.feishu.app_id} onChange={(e) => update('feishu.app_id', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('settings.app_secret')}</label>
                <input type="text" value={form.feishu.app_secret} onChange={(e) => update('feishu.app_secret', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.allow_from')}</label>
                <input type="text" value={form.feishu.allow_from} onChange={(e) => update('feishu.allow_from', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('settings.encrypt_key')}</label>
                <input type="text" value={form.feishu.encrypt_key} onChange={(e) => update('feishu.encrypt_key', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.mode')}</label>
                <select value={form.feishu.mode} onChange={(e) => update('feishu.mode', e.target.value)}>
                  <option value="websocket">websocket</option>
                  <option value="webhook">webhook</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('settings.webhook_bind')}</label>
                <input type="text" value={form.feishu.webhook_bind} onChange={(e) => update('feishu.webhook_bind', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h4>{t('settings.telegram')}</h4>
            <div className="form-group checkbox-row">
              <input type="checkbox" id="tg_enabled" checked={form.telegram.enabled} onChange={(e) => update('telegram.enabled', e.target.checked)} />
              <label htmlFor="tg_enabled" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.enabled')}</label>
            </div>
            <div className="form-group checkbox-row">
              <input type="checkbox" id="tg_require_pairing" checked={form.telegram.require_pairing} onChange={(e) => update('telegram.require_pairing', e.target.checked)} />
              <label htmlFor="tg_require_pairing" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.require_pairing')}</label>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.bot_token')}</label>
                <input type="text" value={form.telegram.bot_token} onChange={(e) => update('telegram.bot_token', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('settings.allow_from')}</label>
                <input type="text" value={form.telegram.allow_from} onChange={(e) => update('telegram.allow_from', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('settings.webhook_url')}</label>
              <input type="text" value={form.telegram.webhook_url} onChange={(e) => update('telegram.webhook_url', e.target.value)} />
            </div>
          </div>

          <button className="save-btn" onClick={handleSave}>
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
