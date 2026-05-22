import React from 'react';
import type { Session } from '@/types';

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onCreate: () => void;
  onOpenSettings: () => void;
  onOpenPlatforms: () => void;
}

export const SessionList: React.FC<Props> = ({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onCreate,
  onOpenSettings,
  onOpenPlatforms,
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">C</div>
          <h1>cc-gateway</h1>
        </div>
        <div className="version">WebUI v1.0.0</div>
      </div>
      <div className="sidebar-actions">
        <button onClick={onOpenSettings}>Settings</button>
        <button onClick={onOpenPlatforms}>Platforms</button>
      </div>
      <div className="new-session-btn" onClick={onCreate}>
        new_session()
      </div>
      <div className="session-list">
        {sessions.length === 0 && (
          <div className="no-sessions">// no active sessions</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-item ${s.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(s.id)}
          >
            <div className="session-info">
              <div className="title">{s.title}</div>
              <div className="meta">
                <span className="platform-tag">{s.platform}</span>
                <span
                  className="platform-tag"
                  style={{ color: s.active ? 'var(--success)' : 'var(--text-muted)' }}
                >
                  {s.active ? 'ON' : 'OFF'}
                </span>
                {s.work_dir}
              </div>
            </div>
            <button className="delete-btn" onClick={(e) => onDelete(s.id, e)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
