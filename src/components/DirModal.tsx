import React, { useEffect } from 'react';
import { useI18n } from '@/i18n';

interface Props {
  currentDir: string;
  items: string[];
  showHidden: boolean;
  error: string;
  onErrorChange: (error: string) => void;
  onClose: () => void;
  onEnter: (name: string) => void;
  onGoUp: () => void;
  onSelect: (dir: string) => void;
  onToggleHidden: () => void;
}

export const DirModal: React.FC<Props> = ({
  currentDir,
  items,
  showHidden,
  error,
  onErrorChange,
  onClose,
  onEnter,
  onGoUp,
  onSelect,
  onToggleHidden,
}) => {
  const { t } = useI18n();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => onErrorChange(''), 3000);
    return () => clearTimeout(timer);
  }, [error, onErrorChange]);
  // Also hide .. when at a Windows drive root (e.g. C:\)
  const isRoot =
    currentDir === '~' ||
    currentDir === '/' ||
    /^[a-zA-Z]:\\$/.test(currentDir);

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="dir-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{currentDir}</h3>
          <button onClick={onClose}>×</button>
        </div>
        {error && (
          <div
            style={{
              position: 'absolute',
              bottom: 52,
              left: 0,
              right: 0,
              padding: '8px 20px',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--danger, #ef4444)',
              color: 'var(--danger, #ef4444)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              zIndex: 1,
              animation: 'toast-enter 0.2s ease-out',
            }}
          >
            {error}
          </div>
        )}
        <div className="dir-list">
          {!isRoot && (
            <div className="dir-item" onClick={onGoUp}>
              <span className="icon">←</span>
              ..
            </div>
          )}
          {items.map((item, i) => (
            <div
              key={`${item}-${i}`}
              className="dir-item"
              onClick={() => onEnter(item.slice(0, -1))}
            >
              <span className="icon">+</span>
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
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showHidden}
              onChange={onToggleHidden}
            />
            {t('dir.show_hidden')}
          </label>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {t('dir.items', { count: items.length })}
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
            {t('dir.select')}
          </button>
        </div>
      </div>
    </div>
  );
};
