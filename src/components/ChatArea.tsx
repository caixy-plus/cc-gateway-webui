import React, { useRef, useEffect } from 'react';
import type { Session, Message } from '@/types';

interface Props {
  session: Session | undefined;
  messages: Message[];
  input: string;
  sending: boolean;
  readOnly: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStart: () => void;
  onStop: () => void;
  onOpenDir: () => void;
  onPwd: () => void;
  onResetDir: () => void;
}

export const ChatArea: React.FC<Props> = ({
  session,
  messages,
  input,
  sending,
  readOnly,
  onInputChange,
  onSend,
  onStart,
  onStop,
  onOpenDir,
  onPwd,
  onResetDir,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="main">
      <div className="chat-header">
        <div className={`status ${session?.active ? '' : 'inactive'}`} />
        <h2>{session?.title || 'Select a session'}</h2>
        <div className="session-info">
          {session && (
            <span className="info-pill">
              {session.source} / {session.platform} / {session.active ? 'ACTIVE' : 'STOPPED'}
            </span>
          )}
        </div>
        {session && session.source === 'WebUI' && session.active && (
          <div className="actions">
            <button onClick={onStop}>STOP</button>
          </div>
        )}
      </div>
      <div className="toolbar">
        <button onClick={onOpenDir}>ls</button>
        <button onClick={onPwd}>pwd</button>
        <button onClick={onResetDir}>cd ~</button>
      </div>
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">//</div>
            {session && !session.active && session.source === 'WebUI' ? (
              <>
                <div>Session created. Confirm work directory, then start.</div>
                <button
                  onClick={onStart}
                  style={{
                    marginTop: '16px',
                    padding: '10px 24px',
                    background: 'var(--accent)',
                    color: 'var(--bg-void)',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  Start Session
                </button>
              </>
            ) : (
              <div>{session ? 'awaiting input...' : 'select a session'}</div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <div className="input-wrapper">
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder={
              readOnly
                ? 'read-only: platform session'
                : sending
                ? 'transmitting...'
                : 'enter command...'
            }
            disabled={readOnly || sending || !session}
          />
        </div>
        <button onClick={onSend} disabled={readOnly || sending || !session}>
          EXEC
        </button>
      </div>
    </div>
  );
};
