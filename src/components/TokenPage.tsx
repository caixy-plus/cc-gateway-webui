import React, { useState } from 'react';
import { setToken } from '@/api/client';
import { useI18n } from '@/i18n';

interface Props {
  onTokenSet: () => void;
}

export const TokenPage: React.FC<Props> = ({ onTokenSet }) => {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setToken(trimmed);
    setError(false);
    onTokenSet();
  };

  return (
    <div className="token-page">
      <div className="token-card">
        <div className="token-icon">&#9881;</div>
        <h2>{t('token.title')}</h2>
        <p>{t('token.description')}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            placeholder={t('token.placeholder')}
            autoFocus
            className={error ? 'has-error' : ''}
          />
          <button type="submit">{t('token.submit')}</button>
        </form>
        {error && <p className="token-error">{t('token.invalid')}</p>}
        <p className="token-hint">{t('token.hint')}</p>
      </div>
    </div>
  );
};
