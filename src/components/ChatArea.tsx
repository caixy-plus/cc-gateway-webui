import React, { useRef, useEffect, useState } from 'react';
import { useI18n, type Locale } from '@/i18n';
import type { Session, Message } from '@/types';
import { api } from '@/api/client';

type SlashCommandDef = {
  id: string;
  command: string;
  titleKey: Parameters<ReturnType<typeof useI18n>['t']>[0];
  descKey: Parameters<ReturnType<typeof useI18n>['t']>[0];
};

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
  const inputRef = useRef<HTMLInputElement>(null);

  const slashCommands: SlashCommandDef[] = [
    { id: 'help', command: '/help', titleKey: 'cmd.help', descKey: 'cmd.help_desc' },
    { id: 'agent', command: '/agent', titleKey: 'cmd.agent', descKey: 'cmd.agent_desc' },
    { id: 'agents', command: '/agents', titleKey: 'cmd.agents', descKey: 'cmd.agents_desc' },
    { id: 'models', command: '/models', titleKey: 'cmd.models', descKey: 'cmd.models_desc' },
    { id: 'cd', command: '/cd', titleKey: 'cmd.cd', descKey: 'cmd.cd_desc' },
    { id: 'll', command: '/ll', titleKey: 'cmd.ll', descKey: 'cmd.ll_desc' },
    { id: 'pwd', command: '/pwd', titleKey: 'cmd.pwd', descKey: 'cmd.pwd_desc' },
    { id: 'mkdir', command: '/mkdir', titleKey: 'cmd.mkdir', descKey: 'cmd.mkdir_desc' },
    { id: 'esc', command: '/esc', titleKey: 'cmd.esc', descKey: 'cmd.esc_desc' },
    { id: 'stop', command: '/stop', titleKey: 'cmd.stop', descKey: 'cmd.stop_desc' },
    { id: 'clear', command: '/clear', titleKey: 'cmd.clear', descKey: 'cmd.clear_desc' },
    { id: 'status', command: '/status', titleKey: 'cmd.status', descKey: 'cmd.status_desc' },
    { id: 'agent_history', command: '/agent-history', titleKey: 'cmd.agent_history', descKey: 'cmd.agent_history_desc' },
    { id: 'show_thinking', command: '/show-thinking', titleKey: 'cmd.show_thinking', descKey: 'cmd.show_thinking_desc' },
    { id: 'hide_thinking', command: '/hide-thinking', titleKey: 'cmd.hide_thinking', descKey: 'cmd.hide_thinking_desc' },
    { id: 'quit', command: '/quit', titleKey: 'cmd.quit', descKey: 'cmd.quit_desc' },
  ];

  const isSessionMode = !!(session && session.source === 'WebUI' && session.active);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdIndex, setCmdIndex] = useState(0);

  const cmdQuery = (() => {
    const v = input.trim();
    // Only open palette for "/xxx" without spaces so it doesn't fight with args.
    if (!v.startsWith('/')) return null;
    if (v.includes(' ')) return null;
    // Always allow opening with just "/".
    return v.slice(1).toLowerCase();
  })();

  const cmdMatches = (() => {
    if (cmdQuery === null) return [];
    const filtered = slashCommands.filter((c) => c.command.slice(1).toLowerCase().startsWith(cmdQuery));
    return filtered;
  })();

  useEffect(() => {
    // Open command palette when typing "/..." and we have matches.
    const shouldOpen = !!cmdQuery && cmdMatches.length > 0;
    setCmdOpen(shouldOpen);
    setCmdIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdQuery, cmdMatches.length]);

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
                ref={inputRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
                  const composing = isComposing || native.isComposing || native.keyCode === 229;
                  if (composing) return;

                  if (cmdOpen && cmdMatches.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const next = Math.min(cmdIndex + 1, cmdMatches.length - 1);
                      setCmdIndex(next);
                      onInputChange(cmdMatches[next].command);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const next = Math.max(cmdIndex - 1, 0);
                      setCmdIndex(next);
                      onInputChange(cmdMatches[next].command);
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setCmdOpen(false);
                      return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      // If palette is open, Enter sends the currently filled command.
                      e.preventDefault();
                      onSend();
                      setCmdOpen(false);
                      return;
                    }
                  }

                  if (e.key === 'Enter' && !e.shiftKey) onSend();
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

              {cmdOpen && cmdMatches.length > 0 && (
                <div className="cmd-palette" role="listbox" aria-label={t('cmd.palette')}>
                  <div className="cmd-palette-header">
                    <span className="cmd-pill">{isSessionMode ? t('cmd.session_mode') : t('cmd.no_session_mode')}</span>
                    <span className="cmd-hint">{t('cmd.palette_hint')}</span>
                  </div>
                  {cmdMatches.map((c, i) => (
                    <div
                      key={c.id}
                      className={`cmd-item ${i === cmdIndex ? 'active' : ''}`}
                      role="option"
                      aria-selected={i === cmdIndex}
                      onMouseEnter={() => {
                        setCmdIndex(i);
                        onInputChange(c.command);
                      }}
                      onMouseDown={(evt) => {
                        // Prevent input blur before click finishes.
                        evt.preventDefault();
                        onInputChange(c.command);
                        setCmdOpen(false);
                        // Keep focus on input for Enter-to-send.
                        requestAnimationFrame(() => inputRef.current?.focus());
                      }}
                    >
                      <div className="cmd-row">
                        <code className="cmd-code">{c.command}</code>
                        <span className="cmd-title">{t(c.titleKey)}</span>
                      </div>
                      <div className="cmd-desc">{t(c.descKey)}</div>
                    </div>
                  ))}
                </div>
              )}
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
