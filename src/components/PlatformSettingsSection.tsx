import React from 'react';
import { useI18n, type TranslationKey } from '@/i18n';
import type { GatewayConfig, PlatformInfo } from '@/types';

interface Props {
  entry: PlatformInfo;
  form: GatewayConfig;
  update: (path: string, value: unknown) => void;
}

function settingsLabelKey(labelKey: string): TranslationKey {
  return `settings.${labelKey}` as TranslationKey;
}

function platformTitleKey(id: string): TranslationKey | null {
  const key = `settings.${id}` as TranslationKey;
  return key;
}

export const PlatformSettingsSection: React.FC<Props> = ({ entry, form, update }) => {
  const { t } = useI18n();
  const id = entry.id ?? entry.name;
  const section = (form.platforms as unknown as Record<string, Record<string, unknown>>)[id];
  if (!section || !entry.fields?.length) {
    return null;
  }

  const titleKey = platformTitleKey(id);
  const title = titleKey ? t(titleKey) : (entry.display_name ?? id);
  const enabled = Boolean(section.enabled);

  return (
    <div className="settings-section">
      <h4>
        {title}
        <span className={`section-badge${enabled ? ' on' : ''}`}>
          {enabled ? t('settings.on') : t('settings.off')}
        </span>
      </h4>
      <div className="checkbox-group">
        {entry.fields
          .filter((f) => f.kind === 'bool')
          .map((field) => {
            const inputId = `${id}_${field.key}`;
            const checked = Boolean(section[field.key]);
            return (
              <div className="checkbox-row" key={field.key}>
                <input
                  type="checkbox"
                  id={inputId}
                  checked={checked}
                  onChange={(e) => update(`platforms.${id}.${field.key}`, e.target.checked)}
                />
                <label htmlFor={inputId} style={{ textTransform: 'none', letterSpacing: '0' }}>
                  {t(settingsLabelKey(field.label_key))}
                </label>
              </div>
            );
          })}
      </div>
      {entry.fields.some((f) => f.hint_key === 'require_pairing_hint') && (
        <div className="field-hint">{t('settings.require_pairing_hint')}</div>
      )}
      {entry.fields
        .filter((f) => f.kind === 'text' || f.kind === 'secret')
        .map((field) => (
          <React.Fragment key={field.key}>
            <div className={`form-row${field.key === 'bot_token' || field.key === 'proxy' ? ' full' : ''}`}>
              <div className="form-group">
                <label>{t(settingsLabelKey(field.label_key))}</label>
                <input
                  type={field.kind === 'secret' ? 'password' : 'text'}
                  value={String(section[field.key] ?? '')}
                  placeholder={
                    field.hint_key === 'telegram_proxy_placeholder'
                      ? t('settings.telegram_proxy_placeholder')
                      : undefined
                  }
                  onChange={(e) => update(`platforms.${id}.${field.key}`, e.target.value)}
                />
              </div>
            </div>
            {field.hint_key && field.hint_key !== 'require_pairing_hint' && (
              <div className="field-hint">{t(settingsLabelKey(field.hint_key))}</div>
            )}
          </React.Fragment>
        ))}
    </div>
  );
};
