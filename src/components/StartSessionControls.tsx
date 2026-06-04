import React from 'react';
import { useI18n } from '@/i18n';
import type { AgentCatalogEntry } from '@/types';

interface Props {
  onStart: () => void;
  starting: boolean;
  /** First launch: pick agent then start */
  variant: 'empty';
  providers: AgentCatalogEntry[];
  selectedProviderId: string;
  onProviderChange: (id: string) => void;
}

interface ResumeProps {
  onStart: () => void;
  starting: boolean;
  /** After stop: resume stored agent only (no picker) */
  variant: 'restart';
  providerId?: string;
}

export const StartSessionControls: React.FC<Props | ResumeProps> = (props) => {
  const { t } = useI18n();
  const { onStart, starting, variant } = props;

  if (variant === 'restart') {
    const { providerId } = props;
    return (
      <div className={`start-session-controls ${variant}`} data-testid="start-session-controls">
        {providerId ? (
          <span className="session-provider-pill" data-testid="session-provider-pill">
            {t('chat.session_agent_label')}: {providerId}
          </span>
        ) : null}
        <button
          type="button"
          className="restart-btn"
          onClick={onStart}
          disabled={starting}
          data-testid="start-session-btn"
        >
          {starting ? t('chat.resuming') : t('chat.resume_session')}
        </button>
      </div>
    );
  }

  const { providers, selectedProviderId, onProviderChange } = props;
  const labelId = 'start-provider-empty';

  return (
    <div className={`start-session-controls ${variant}`} data-testid="start-session-controls">
      <label className="start-provider-label" htmlFor={labelId}>
        {t('chat.start_agent_label')}
      </label>
      <select
        id={labelId}
        className="start-provider-select"
        value={selectedProviderId}
        onChange={(e) => onProviderChange(e.target.value)}
        disabled={starting || providers.length === 0}
        data-testid="start-provider-select"
      >
        {providers.length === 0 ? (
          <option value="">{t('chat.no_agents_enabled')}</option>
        ) : (
          providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))
        )}
      </select>
      <button
        type="button"
        className="restart-btn"
        onClick={onStart}
        disabled={starting || providers.length === 0}
        data-testid="start-session-btn"
      >
        {starting ? t('chat.starting') : t('chat.start_session')}
      </button>
    </div>
  );
};
