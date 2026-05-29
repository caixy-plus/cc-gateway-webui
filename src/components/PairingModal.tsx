import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/i18n';
import { api } from '@/api/client';
import type { PendingPairing, ApprovedChat } from '@/types';

interface Props {
  onClose: () => void;
}

export const PairingModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useI18n();
  const [pending, setPending] = useState<PendingPairing[]>([]);
  const [approved, setApproved] = useState<ApprovedChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([api.listPairings(), api.listApprovedChats()]);
      setPending(p.pending || []);
      setApproved(a.approved || []);
      setError('');
    } catch {
      setError(t('pairing.load_failed'));
    }
  }, [t]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const handleApprove = async (code: string) => {
    setLoading(true);
    try {
      const data = await api.approvePairing(code);
      if (data.status === 'approved') {
        setPending((prev) => prev.filter((p) => p.pairing_code !== code));
        fetchData();
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

  const handleToggleApproval = async (chat: ApprovedChat) => {
    const next = !chat.enabled;
    setApproved((prev) =>
      prev.map((c) => (c.platform === chat.platform && c.chat_id === chat.chat_id ? { ...c, enabled: next } : c))
    );
    try {
      const data = await api.setApprovalEnabled(chat.platform, chat.chat_id, next);
      if (data.error) throw new Error(data.error);
    } catch {
      setApproved((prev) =>
        prev.map((c) =>
          c.platform === chat.platform && c.chat_id === chat.chat_id ? { ...c, enabled: chat.enabled } : c
        )
      );
      setError(t('pairing.update_failed'));
    }
  };

  const handleRemoveApproval = async (chat: ApprovedChat) => {
    if (!window.confirm(t('pairing.confirm_remove'))) return;
    setLoading(true);
    try {
      const data = await api.removeApproval(chat.platform, chat.chat_id);
      if (data.status === 'deleted') {
        setApproved((prev) => prev.filter((c) => !(c.platform === chat.platform && c.chat_id === chat.chat_id)));
      } else {
        setError(data.error || t('pairing.remove_failed'));
      }
    } catch {
      setError(t('pairing.remove_failed'));
    } finally {
      setLoading(false);
    }
  };

  const platformColor = (platform: string) => (platform === 'feishu' ? 'var(--accent)' : 'var(--cyan)');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '560px', maxHeight: '82vh' }}>
        <div className="modal-header">
          <h3>{t('pairing.title')}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="pairing-body">
          {error && (
            <div className="pairing-error">
              {error}
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          <div className="pairing-section-label">{t('pairing.pending_section')}</div>
          {pending.length === 0 ? (
            <div className="pairing-empty">{t('pairing.empty')}</div>
          ) : (
            <table className="pairing-table">
              <thead>
                <tr>
                  <th style={thStyle}>{t('pairing.platform')}</th>
                  <th style={thStyle}>{t('pairing.code')}</th>
                  <th style={thStyle}>{t('pairing.chat_id')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('pairing.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.pairing_code}>
                    <td style={tdStyle}>
                      <span style={{ color: platformColor(p.platform) }}>{p.platform}</span>
                    </td>
                    <td style={{ ...tdStyle, letterSpacing: '0.1em', fontWeight: 600 }}>{p.pairing_code}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.chat_id}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => handleApprove(p.pairing_code)} disabled={loading} style={approveBtnStyle}>
                        {t('pairing.approve')}
                      </button>
                      <button onClick={() => handleReject(p.pairing_code)} disabled={loading} style={rejectBtnStyle}>
                        {t('pairing.reject')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="pairing-section-label" style={{ marginTop: '18px' }}>{t('pairing.approved_section')}</div>
          {approved.length === 0 ? (
            <div className="pairing-empty">{t('pairing.approved_empty')}</div>
          ) : (
            <table className="pairing-table">
              <thead>
                <tr>
                  <th style={thStyle}>{t('pairing.platform')}</th>
                  <th style={thStyle}>{t('pairing.chat_id')}</th>
                  <th style={thStyle}>{t('pairing.state')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('pairing.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((c) => (
                  <tr key={`${c.platform}:${c.chat_id}`}>
                    <td style={tdStyle}>
                      <span style={{ color: platformColor(c.platform) }}>{c.platform}</span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.chat_id}
                    </td>
                    <td style={tdStyle}>
                      <span className={`approval-state ${c.enabled ? 'on' : 'off'}`}>
                        {c.enabled ? t('pairing.enabled') : t('pairing.suspended')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleApproval(c)}
                        disabled={loading}
                        style={c.enabled ? rejectBtnStyle : approveBtnStyle}
                        title={c.enabled ? t('pairing.suspend_hint') : t('pairing.resume_hint')}
                      >
                        {c.enabled ? t('pairing.suspend') : t('pairing.resume')}
                      </button>
                      <button
                        onClick={() => handleRemoveApproval(c)}
                        disabled={loading}
                        style={deleteBtnStyle}
                        title={t('pairing.remove_hint')}
                      >
                        {t('pairing.remove')}
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
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-medium)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  fontSize: '10px',
  cursor: 'pointer',
  marginRight: '4px',
};

const deleteBtnStyle: React.CSSProperties = {
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
