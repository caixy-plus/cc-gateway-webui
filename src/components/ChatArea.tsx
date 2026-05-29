import React, { useRef, useEffect, useState } from 'react';
import { useI18n, type Locale } from '@/i18n';
import type { Session, Message } from '@/types';
import { api } from '@/api/client';

interface Props {
  session: Session | undefined;
  messages: Message[];
  input: string;
  sending: boolean;
  readOnly: boolean;
  starting?: boolean;
  workDir: string;
  locale: Locale;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStart: () => void;
  onStop: () => void;
  onOpenDir: () => void;
  onLocaleChange: (locale: Locale) => void;
  onToggleSidebar: () => void;
}

export const ChatArea: React.FC<Props> = ({
  session,
  messages,
  input,
  sending,
  readOnly,
  starting,
  workDir,
  locale,
  onInputChange,
  onSend,
  onStart,
  onStop,
  onOpenDir,
  onLocaleChange,
  onToggleSidebar,
}) => {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isWebUIInactive = session && session.source === 'WebUI' && !session.active;
  const canChangeDir = session && session.source === 'WebUI' && !session.provider_session_id;

  return (
    <div className="main">
      <div className="chat-header">
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          title={t('chat.menu')}
          aria-label={t('chat.menu')}
        >
          ☰
        </button>
        <div className={`status ${session?.active ? '' : 'inactive'}`} />
        <h2>{session?.title || t('chat.select_session')}</h2>
        <div className="session-info">
          {session && (
            <span className="info-pill">
              {session.source} / {session.platform} / {session.active ? t('chat.active') : t('chat.stopped')}
            </span>
          )}
        </div>
        {session && session.source === 'WebUI' && session.active && (
          <div className="actions">
            <button onClick={onStop}>{t('chat.stop')}</button>
          </div>
        )}
        <div className="lang-pill" data-testid="chat-lang-pill">
          <button className={locale === 'en' ? 'active' : ''} onClick={() => onLocaleChange('en')}>
            EN
          </button>
          <button className={locale === 'zh' ? 'active' : ''} onClick={() => onLocaleChange('zh')}>
            中文
          </button>
        </div>
      </div>
      <div className="toolbar">
        <div className={`work-dir ${session?.active ? 'active' : ''}`}>
          {workDir}
        </div>
        <button onClick={onOpenDir} disabled={!canChangeDir}>
          {t('chat.change_dir')}
        </button>
      </div>
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">//</div>
            {isWebUIInactive ? (
              <>
                <div>{t('chat.session_created_hint')}</div>
                <button
                  className="restart-btn"
                  onClick={onStart}
                  disabled={starting}
                  style={{ marginTop: '16px' }}
                >
                  {starting ? t('chat.starting') : t('chat.start_session')}
                </button>
              </>
            ) : (
              <div>{session ? t('chat.awaiting_input') : t('chat.select_a_session')}</div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.content}
            {m.role === 'permission_request' && m.requestId && (
              <PermissionActions
                sessionId={session?.id || ''}
                requestId={m.requestId}
              />
            )}
          </div>
        ))}
        {sending && (
          <div className="message assistant typing-indicator" data-testid="typing-indicator">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        {isWebUIInactive && messages.length > 0 ? (
          <div className="restart-area">
            <span className="restart-hint">{t('chat.session_stopped_hint')}</span>
            <button className="restart-btn" onClick={onStart} disabled={starting}>
              {starting ? t('chat.restarting') : t('chat.restart_session')}
            </button>
          </div>
        ) : isWebUIInactive && messages.length === 0 ? (
          <>
            <div className="input-wrapper">
              <input
                data-testid="message-input"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  // IME: Enter may be used to confirm candidate selection; don't send while composing.
                  // keyCode 229 is a common "IME processing" signal on some browsers.
                  const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
                  const composing = isComposing || native.isComposing || native.keyCode === 229;
                  if (e.key === 'Enter' && !e.shiftKey && !composing) onSend();
                }}
                placeholder={t('chat.input_placeholder')}
                disabled
              />
            </div>
            <button disabled data-testid="send-btn">
              {t('chat.exec')}
            </button>
          </>
        ) : (
          <>
            <div className="input-wrapper">
              <input
                data-testid="message-input"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
                  const composing = isComposing || native.isComposing || native.keyCode === 229;
                  if (e.key === 'Enter' && !e.shiftKey && !composing) onSend();
                }}
                placeholder={
                  readOnly
                    ? t('chat.readonly_placeholder')
                    : sending
                    ? t('chat.sending_placeholder')
                    : t('chat.input_placeholder')
                }
                disabled={readOnly || sending || !session}
              />
            </div>
            <button onClick={onSend} disabled={readOnly || sending || !session} data-testid="send-btn">
              {t('chat.exec')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Inline permission allow/deny buttons
// ---------------------------------------------------------------------------

const PermissionActions: React.FC<{ sessionId: string; requestId: string }> = ({
  sessionId,
  requestId,
}) => {
  const { t } = useI18n();
  const [status, setStatus] = useState<'pending' | 'loading' | 'done'>('pending');

  const respond = async (action: 'allow' | 'deny') => {
    setStatus('loading');
    try {
      await api.respondPermission(sessionId, requestId, action);
      setStatus('done');
    } catch {
      setStatus('pending');
    }
  };

  if (status === 'done') {
    return <div className="perm-done">✓</div>;
  }

  return (
    <div className="perm-actions">
      <button
        className="perm-allow"
        disabled={status === 'loading'}
        onClick={() => respond('allow')}
      >
        {t('chat.allow')}
      </button>
      <button
        className="perm-deny"
        disabled={status === 'loading'}
        onClick={() => respond('deny')}
      >
        {t('chat.deny')}
      </button>
    </div>
  );
};
