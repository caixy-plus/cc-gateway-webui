import React from 'react';
import { useI18n } from '@/i18n';
import type { PlatformInfo } from '@/types';

interface Props {
  platforms: PlatformInfo[];
  onClose: () => void;
}

export const PlatformsModal: React.FC<Props> = ({ platforms, onClose }) => {
  const { t } = useI18n();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('platforms.title')}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="platforms-list">
          {platforms.length === 0 && <div className="platform-empty">{t('platforms.empty')}</div>}
          {platforms.map((p) => (
            <div key={p.name} className="platform-card">
              <div>
                <div className="platform-name">{p.name}</div>
                {p.mode && <div className="platform-detail">{t('platforms.mode', { mode: p.mode })}</div>}
                <div className="platform-detail">{t('platforms.allow', { allow: p.allow_from })}</div>
              </div>
              <div className="platform-status">{t('platforms.connected')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
