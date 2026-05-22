import React from 'react';

interface Props {
  currentDir: string;
  items: string[];
  onClose: () => void;
  onEnter: (name: string) => void;
  onGoUp: () => void;
  onSelect: (dir: string) => void;
}

export const DirModal: React.FC<Props> = ({
  currentDir,
  items,
  onClose,
  onEnter,
  onGoUp,
  onSelect,
}) => {
  const isRoot = currentDir === '~' || currentDir === '/';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{currentDir}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="dir-list">
          {!isRoot && (
            <div className="dir-item" onClick={onGoUp}>
              <span className="icon">←</span>
              ..
            </div>
          )}
          {items.map((item, i) => (
            <div
              key={i}
              className="dir-item"
              onClick={() => item.endsWith('/') && onEnter(item.slice(0, -1))}
              style={{
                cursor: item.endsWith('/') ? 'pointer' : 'default',
                opacity: item.endsWith('/') ? 1 : 0.5,
              }}
            >
              <span className="icon">{item.endsWith('/') ? '+' : '-'}</span>
              {item}
            </div>
          ))}
        </div>
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {items.length} items
          </span>
          <button
            onClick={() => onSelect(currentDir)}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: 'var(--bg-void)',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            Select Directory
          </button>
        </div>
      </div>
    </div>
  );
};
