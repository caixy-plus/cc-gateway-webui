import React, { useState, useEffect } from 'react';
import type { GatewayConfig, ThemeMode } from '@/types';

interface Props {
  config: GatewayConfig | null;
  theme: ThemeMode;
  onClose: () => void;
  onSave: (config: Partial<GatewayConfig>, theme: ThemeMode) => void;
}

export const SettingsModal: React.FC<Props> = ({ config, theme, onClose, onSave }) => {
  const [form, setForm] = useState({
    default_dir: '~',
    platform: 'feishu',
    port: 17534,
    media_retention_days: 30,
    show_thinking: false,
    theme: theme,
  });

  useEffect(() => {
    if (config) {
      setForm({
        default_dir: config.default_dir ?? '~',
        platform: config.platform ?? 'feishu',
        port: config.port ?? 17534,
        media_retention_days: config.media_retention_days ?? 30,
        show_thinking: config.show_thinking ?? false,
        theme,
      });
    }
  }, [config, theme]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = () => {
    onSave(
      {
        default_dir: form.default_dir,
        platform: form.platform,
        port: form.port,
        media_retention_days: form.media_retention_days,
        show_thinking: form.show_thinking,
      },
      form.theme
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="settings-form">
          <div className="form-group">
            <label>Theme</label>
            <select value={form.theme} onChange={(e) => update('theme', e.target.value as ThemeMode)}>
              <option value="auto">Auto (System)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="form-group">
            <label>Default Directory</label>
            <input type="text" value={form.default_dir} onChange={(e) => update('default_dir', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Platform</label>
            <input type="text" value={form.platform} onChange={(e) => update('platform', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Port</label>
            <input type="number" value={form.port} onChange={(e) => update('port', parseInt(e.target.value) || 17534)} />
          </div>
          <div className="form-group">
            <label>Media Retention (days)</label>
            <input type="number" value={form.media_retention_days} onChange={(e) => update('media_retention_days', parseInt(e.target.value) || 30)} />
          </div>
          <div className="form-group checkbox-row">
            <input type="checkbox" id="show_thinking" checked={form.show_thinking} onChange={(e) => update('show_thinking', e.target.checked)} />
            <label htmlFor="show_thinking" style={{ textTransform: 'none', letterSpacing: '0' }}>
              Show Thinking
            </label>
          </div>
          <button className="save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
