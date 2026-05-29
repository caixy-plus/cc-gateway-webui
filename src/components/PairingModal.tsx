import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/i18n';
import { api } from '@/api/client';
import type { PendingPairing } from '@/types';

interface Props {
  onClose: () => void;
}

export const PairingModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useI18n();
  const [pending, setPending] = useState<PendingPairing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPending = useCallback(async () => {
    try {
      const data = await api.listPairings();
      setPending(data.pending || []);
      setError('');
    } catch {
      setError(t('pairing.load_failed'));
    }
  }, [t]);

  useEffect(() => {
    fetchPending();
    const iv = setInterval(fetchPending, 5000);
    return () => clearInterval(iv);
  }, [fetchPending]);

  const handleApprove = async (code: string) => {
    setLoading(true);
    try {
      const data = await api.approvePairing(code);
      if (data.status === 'approved') {
        setPending((prev) => prev.filter((p) => p.pairing_code !== code));
      } else {
        setError(data.error || t('pairing.approve_failed'));
      }
    } catch {
      setError(t('pairing.approve_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (code: string) => {
    setLoading(true);
    try {
      const data = await api.rejectPairing(code);
      if (data.status === 'rejected') {
        setPending((prev) => prev.filter((p) => p.pairing_code !== code));
      } else {
        setError(data.error || t('pairing.reject_failed'));
      }
    } catch {
      setError(t('pairing.reject_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '520px', maxHeight: '80vh' }}>
        <div className="modal-header">
          <h3>{t('pairing.title')}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '4px 18px 18px' }}>
          {error && (
            <div style={{ color: 'var(--red)', marginBottom: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              {error}
              <button
                onClick={() => setError('')}
                style={{
                  marginLeft: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          )}

          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontFamily: 'var(--font-mono)' }}>
              {t('pairing.empty')}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>{t('pairing.platform')}</th>
                  <th style={thStyle}>{t('pairing.code')}</th>
                  <th style={thStyle}>{t('pairing.chat_id')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('pairing.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.pairing_code} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>
                      <span style={{ color: p.platform === 'feishu' ? 'var(--accent)' : 'var(--cyan)' }}>
                        {p.platform}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, letterSpacing: '0.1em', fontWeight: 600 }}>
                      {p.pairing_code}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.chat_id}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => handleApprove(p.pairing_code)}
                        disabled={loading}
                        style={approveBtnStyle}
                      >
                        {t('pairing.approve')}
                      </button>
                      <button
                        onClick={() => handleReject(p.pairing_code)}
                        disabled={loading}
                        style={rejectBtnStyle}
                      >
                        {t('pairing.reject')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 6px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontSize: '10px',
  color: 'var(--text-muted)',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 6px',
  verticalAlign: 'middle',
};

const approveBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'var(--accent)',
  color: 'var(--bg-void)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  fontSize: '10px',
  cursor: 'pointer',
  marginRight: '4px',
};

const rejectBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  color: 'var(--red)',
  border: '1px solid var(--red)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  fontSize: '10px',
  cursor: 'pointer',
};
