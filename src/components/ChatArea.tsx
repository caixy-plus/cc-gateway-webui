import React, { useRef, useEffect, useState } from 'react';
import { useI18n, type Locale } from '@/i18n';
import type { Session, Message, AgentCatalogEntry } from '@/types';
import { api } from '@/api/client';
import { FileAttachmentBubble } from '@/components/FileAttachmentBubble';
import { MessageBody } from '@/components/MessageBody';
import { MessageCopyFooter } from '@/components/MessageCopyFooter';
import { ModelPickerBubble } from '@/components/ModelPickerBubble';
import { StartSessionControls } from '@/components/StartSessionControls';
import { filesFromClipboard } from '@/utils/clipboardFiles';
import { parseFileAttachment, type FileAttachment } from '@/utils/fileAttachment';
import { parseModelPicker } from '@/utils/modelPicker';
import { wasWebuiSessionStarted } from '@/utils/webuiSession';

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
  onSelectModel?: (modelId: string) => void;
  onAnalyzeAttachment?: (attachment: FileAttachment) => void;
  onUploadFile?: (file: File) => void | Promise<void>;
  uploading?: boolean;
  /** First start — user picks provider in empty state */
  onStartSession: () => void;
  /** After stop — resume stored provider only */
  onResumeSession: () => void;
  startProviders: AgentCatalogEntry[];
  startProviderId: string;
  onStartProviderChange: (id: string) => void;
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
  onSelectModel,
  onAnalyzeAttachment,
  onUploadFile,
  uploading = false,
  onStartSession,
  onResumeSession,
  startProviders,
  startProviderId,
  onStartProviderChange,
  onStop,
  onOpenDir,
  onLocaleChange,
  onToggleSidebar,
}) => {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebUI navigation (/cd, /ll, /pwd, /mkdir) and session management (/agent,
  // /agents, /agent_history) are handled via toolbar/sidebar UI — not chat input.
  // The palette only exposes the 8 in-session control commands.
  const slashCommands: SlashCommandDef[] = [
    { id: 'quit',         command: '/quit',          titleKey: 'cmd.quit',          descKey: 'cmd.quit_desc' },
    { id: 'stop',         command: '/stop',          titleKey: 'cmd.stop',          descKey: 'cmd.stop_desc' },
    { id: 'clear',        command: '/clear',         titleKey: 'cmd.clear',         descKey: 'cmd.clear_desc' },
    { id: 'models',       command: '/models',        titleKey: 'cmd.models',        descKey: 'cmd.models_desc' },
    { id: 'status',       command: '/status',        titleKey: 'cmd.status',        descKey: 'cmd.status_desc' },
    { id: 'show_thinking',command: '/show_thinking', titleKey: 'cmd.show_thinking', descKey: 'cmd.show_thinking_desc' },
    { id: 'hide_thinking',command: '/hide_thinking', titleKey: 'cmd.hide_thinking', descKey: 'cmd.hide_thinking_desc' },
  ];

  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdIndex, setCmdIndex] = useState(0);
  const [paletteMatches, setPaletteMatches] = useState<SlashCommandDef[]>([]);
  // Ref flag: arrow-key fills change `input` but must NOT re-filter the list.
  const arrowNavRef = useRef(false);

  useEffect(() => {
    if (arrowNavRef.current) {
      arrowNavRef.current = false;
      return;
    }
    const v = input.trim();
    const isSlash = v.startsWith('/') && !v.includes(' ');
    if (isSlash) {
      const q = v.slice(1).toLowerCase();
      const matches = slashCommands.filter((c) => c.command.slice(1).toLowerCase().startsWith(q));
      setPaletteMatches(matches);
      setCmdOpen(matches.length > 0);
    } else {
      setPaletteMatches([]);
      setCmdOpen(false);
    }
    setCmdIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isWebUIInactive = session && session.source === 'WebUI' && !session.active;
  const isWebUIFirstStart = isWebUIInactive && !wasWebuiSessionStarted(session);
  const isWebUIResume = isWebUIInactive && wasWebuiSessionStarted(session);
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
            {isWebUIFirstStart ? (
              <>
                <div>{t('chat.session_created_hint')}</div>
                <StartSessionControls
                  variant="empty"
                  providers={startProviders}
                  selectedProviderId={startProviderId}
                  onProviderChange={onStartProviderChange}
                  onStart={onStartSession}
                  starting={!!starting}
                />
              </>
            ) : isWebUIResume ? (
              <>
                <div>{t('chat.session_stopped_hint')}</div>
                <StartSessionControls
                  variant="restart"
                  providerId={session?.provider}
                  onStart={onResumeSession}
                  starting={!!starting}
                />
              </>
            ) : (
              <div>{session ? t('chat.awaiting_input') : t('chat.select_a_session')}</div>
            )}
          </div>
        )}
        {messages.map((m, i) => {
          const attachment = parseFileAttachment(m.content);
          const modelPicker = parseModelPicker(m.content);
          const showMessageCopy =
            m.role === 'assistant' && !attachment && !(modelPicker && onSelectModel);
          return (
          <div
            key={i}
            className={`message ${m.role}${showMessageCopy ? ' message--copyable' : ''}`}
          >
            {modelPicker && onSelectModel ? (
              <ModelPickerBubble
                picker={modelPicker}
                disabled={readOnly || sending}
                onSelect={onSelectModel}
              />
            ) : attachment ? (
              <FileAttachmentBubble
                attachment={attachment}
                onAnalyze={onAnalyzeAttachment}
                analyzeDisabled={readOnly || sending || uploading}
              />
            ) : (
              <MessageBody
                content={m.content}
                isAnimating={
                  sending &&
                  m.role === 'assistant' &&
                  i === messages.length - 1
                }
              />
            )}
            {showMessageCopy ? <MessageCopyFooter content={m.content} /> : null}
            {m.role === 'permission_request' && m.requestId && (
              <PermissionActions
                sessionId={session?.id || ''}
                requestId={m.requestId}
              />
            )}
          </div>
          );
        })}
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
        {isWebUIResume ? (
          <div className="restart-area">
            <span className="restart-hint">{t('chat.session_stopped_hint')}</span>
            <StartSessionControls
              variant="restart"
              providerId={session?.provider}
              onStart={onResumeSession}
              starting={!!starting}
            />
          </div>
        ) : isWebUIFirstStart ? (
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
            <input
              ref={fileInputRef}
              type="file"
              className="file-input-hidden"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onUploadFile) {
                  onUploadFile(file);
                }
                e.target.value = '';
              }}
            />
            <div className="input-wrapper">
              <input
                data-testid="message-input"
                ref={inputRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onPaste={(e) => {
                  if (!onUploadFile || readOnly || uploading || sending || !session) {
                    return;
                  }
                  const files = filesFromClipboard(e.clipboardData);
                  if (files.length === 0) {
                    return;
                  }
                  e.preventDefault();
                  void (async () => {
                    for (const file of files) {
                      await onUploadFile(file);
                    }
                  })();
                }}
                onKeyDown={(e) => {
                  const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
                  const composing = isComposing || native.isComposing || native.keyCode === 229;
                  if (composing) return;

                  if (cmdOpen && paletteMatches.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const next = Math.min(cmdIndex + 1, paletteMatches.length - 1);
                      setCmdIndex(next);
                      arrowNavRef.current = true;
                      onInputChange(paletteMatches[next].command);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const next = Math.max(cmdIndex - 1, 0);
                      setCmdIndex(next);
                      arrowNavRef.current = true;
                      onInputChange(paletteMatches[next].command);
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setCmdOpen(false);
                      return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                      setCmdOpen(false);
                      return;
                    }
                  }

                  if (e.key === 'Enter' && !e.shiftKey) onSend();
                }}
                title={onUploadFile && !readOnly ? t('chat.paste_file_hint') : undefined}
                placeholder={
                  readOnly
                    ? t('chat.readonly_placeholder')
                    : sending
                    ? t('chat.sending_placeholder')
                    : onUploadFile
                    ? t('chat.input_placeholder_paste')
                    : t('chat.input_placeholder')
                }
                disabled={readOnly || sending || uploading || !session}
              />

              {cmdOpen && paletteMatches.length > 0 && (
                <div className="cmd-palette" role="listbox" aria-label={t('cmd.palette')}>
                  {paletteMatches.map((c, i) => (
                    <div
                      key={c.id}
                      className={`cmd-item ${i === cmdIndex ? 'active' : ''}`}
                      role="option"
                      aria-selected={i === cmdIndex}
                      onMouseEnter={() => setCmdIndex(i)}
                      onMouseDown={(evt) => {
                        evt.preventDefault();
                        onInputChange(c.command);
                        setCmdOpen(false);
                        requestAnimationFrame(() => inputRef.current?.focus());
                      }}
                    >
                      <code className="cmd-code">{c.command}</code>
                      <span className="cmd-title">{t(c.titleKey)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {onUploadFile && (
              <button
                type="button"
                className="attach-btn"
                title={t('chat.attach_file')}
                disabled={readOnly || sending || uploading || !session}
                onClick={() => fileInputRef.current?.click()}
                data-testid="attach-file-btn"
              >
                📎
              </button>
            )}
            <button onClick={onSend} disabled={readOnly || sending || uploading || !session} data-testid="send-btn">
              {uploading ? '...' : t('chat.exec')}
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
