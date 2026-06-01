import React, { useState, useEffect } from 'react';
import { useI18n, type TranslationKey } from '@/i18n';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { GatewayConfig, SaveConfigResult } from '@/types';

// ---- helper: single provider config row ----

interface ProviderConfigRowProps {
  label: string;
  provider: string;
  form: GatewayConfig;
  update: (path: string, value: unknown) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const ProviderConfigRow: React.FC<ProviderConfigRowProps> = ({ label, provider, form, update, t }) => {
  const cfg = (form.agent as unknown as Record<string, Record<string, unknown>>)[provider];
  return (
    <div className="agent-provider-row">
      <div className="agent-provider-header">
        <input
          type="checkbox"
          id={`agent_${provider}_enabled`}
          checked={(cfg?.enabled as boolean) ?? true}
          onChange={(e) => update(`agent.${provider}.enabled`, e.target.checked)}
        />
        <label htmlFor={`agent_${provider}_enabled`}>{label}</label>
      </div>
      <div className="agent-provider-args">
        <label>{t('settings.default_args')}</label>
        <input
          type="text"
          value={(cfg?.default_args as string) || ''}
          onChange={(e) => update(`agent.${provider}.default_args`, e.target.value)}
        />
      </div>
    </div>
  );
};

// ----------------------------------------------------------------

interface Props {
  config: GatewayConfig | null;
  onClose: () => void;
  onSave: (config: Partial<GatewayConfig>) => Promise<SaveConfigResult>;
  onRestart: () => void;
}

export const SettingsModal: React.FC<Props> = ({ config, onClose, onSave, onRestart }) => {
  const { t } = useI18n();
  const [form, setForm] = useState<GatewayConfig | null>(null);
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [restartDialogFields, setRestartDialogFields] = useState<string[]>([]);

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

  const handleSave = async () => {
    if (!form || saving) return;

    setSaving(true);
    const partial: Partial<GatewayConfig> = {};
    changedKeys.forEach((k) => {
      (partial as unknown as Record<string, unknown>)[k] = (form as unknown as Record<string, unknown>)[k];
    });

    try {
      const result = await onSave(partial);
      if (result.requires_restart) {
        setRestartDialogFields(result.restart_fields ?? []);
        setShowRestartDialog(true);
      }
      setChangedKeys(new Set());
    } catch {
      // Parent shows error toast
    } finally {
      setSaving(false);
    }
  };

  const handleRestartNow = () => {
    setShowRestartDialog(false);
    onRestart();
  };

  const restartFieldsLabel = restartDialogFields.join(', ');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '640px', maxHeight: '85vh' }}>
        <div className="modal-header">
          <h3>{t('settings.title')}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="settings-form">
          <div className="settings-section">
            <h4>{t('settings.general')}</h4>
            <div className="form-row full">
              <div className="form-group">
                <label>{t('settings.default_dir')}</label>
                <input type="text" value={form.default_dir} onChange={(e) => update('default_dir', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('settings.port')}</label>
                <input type="number" value={form.port} onChange={(e) => update('port', parseInt(e.target.value) || 17534)} />
              </div>
              <div className="form-group">
                <label>{t('settings.bind_address')}</label>
                <input type="text" value={form.bind_address} onChange={(e) => update('bind_address', e.target.value)} />
                <div className="field-hint">{t('settings.bind_address_hint')}</div>
              </div>
            </div>
            <div className="form-row full">
              <div className="form-group">
                <label>{t('settings.allowed_ips')}</label>
                <input
                  type="text"
                  value={(form.allowed_ips || []).join(', ')}
                  onChange={(e) => {
                    const ips = e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(s => s.length > 0);
                    update('allowed_ips', ips);
                  }}
                  placeholder="127.0.0.1, 192.168.1.0/24"
                />
                <div className="field-hint">{t('settings.allowed_ips_hint')}</div>
              </div>
            </div>
            <div className="form-row full">
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
                  <option value="pi">{t('settings.agent_pi')}</option>
                  <option value="codewhale">{t('settings.agent_codewhale')}</option>
                </select>
              </div>
            </div>

            {/* Claude */}
            <ProviderConfigRow
              label={t('settings.agent_claude')}
              provider="claude"
              form={form}
              update={update}
              t={t}
            />
            {/* Cursor */}
            <ProviderConfigRow
              label={t('settings.agent_cursor')}
              provider="cursor"
              form={form}
              update={update}
              t={t}
            />
            {/* Pi */}
            <ProviderConfigRow
              label={t('settings.agent_pi')}
              provider="pi"
              form={form}
              update={update}
              t={t}
            />
            {/* CodeWhale */}
            <ProviderConfigRow
              label={t('settings.agent_codewhale')}
              provider="codewhale"
              form={form}
              update={update}
              t={t}
            />
          </div>

          <div className="settings-section">
            <h4>
              {t('settings.feishu')}
              <span className={`section-badge${form.feishu.enabled ? ' on' : ''}`}>
                {form.feishu.enabled ? t('settings.on') : t('settings.off')}
              </span>
            </h4>
            <div className="checkbox-group">
              <div className="checkbox-row">
                <input type="checkbox" id="feishu_enabled" checked={form.feishu.enabled} onChange={(e) => update('feishu.enabled', e.target.checked)} />
                <label htmlFor="feishu_enabled" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.enabled')}</label>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" id="feishu_require_pairing" checked={form.feishu.require_pairing} onChange={(e) => update('feishu.require_pairing', e.target.checked)} />
                <label htmlFor="feishu_require_pairing" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.require_pairing')}</label>
              </div>
            </div>
            <div className="field-hint">{t('settings.require_pairing_hint')}</div>
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
          </div>

          <div className="settings-section">
            <h4>
              {t('settings.telegram')}
              <span className={`section-badge${form.telegram.enabled ? ' on' : ''}`}>
                {form.telegram.enabled ? t('settings.on') : t('settings.off')}
              </span>
            </h4>
            <div className="checkbox-group">
              <div className="checkbox-row">
                <input type="checkbox" id="tg_enabled" checked={form.telegram.enabled} onChange={(e) => update('telegram.enabled', e.target.checked)} />
                <label htmlFor="tg_enabled" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.enabled')}</label>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" id="tg_require_pairing" checked={form.telegram.require_pairing} onChange={(e) => update('telegram.require_pairing', e.target.checked)} />
                <label htmlFor="tg_require_pairing" style={{ textTransform: 'none', letterSpacing: '0' }}>{t('settings.require_pairing')}</label>
              </div>
            </div>
            <div className="field-hint">{t('settings.require_pairing_hint')}</div>
            <div className="form-row full">
              <div className="form-group">
                <label>{t('settings.bot_token')}</label>
                <input type="text" value={form.telegram.bot_token} onChange={(e) => update('telegram.bot_token', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          {changedKeys.size > 0 && (
            <span className="pending-indicator">{t('settings.unsaved')}</span>
          )}
          <button className="save-btn" onClick={handleSave} disabled={changedKeys.size === 0 || saving}>
            {saving ? '...' : t('settings.save')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showRestartDialog}
        title={t('settings.restart_after_save_title')}
        message={t('settings.restart_after_save_message', { fields: restartFieldsLabel })}
        confirmLabel={t('app.restart_now')}
        cancelLabel={t('app.later')}
        onConfirm={handleRestartNow}
        onCancel={() => setShowRestartDialog(false)}
      />
    </div>
  );
};
