import React from 'react';

interface Props {
  currentDir: string;
  items: string[];
  onClose: () => void;
  onCd: (name: string) => void;
}

export const DirModal: React.FC<Props> = ({ currentDir, items, onClose, onCd }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{currentDir}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="dir-list">
          {items.map((item, i) => (
            <div
              key={i}
              className="dir-item"
              onClick={() => item.endsWith('/') && onCd(item.slice(0, -1))}
            >
              <span className="icon">{item.endsWith('/') ? '+' : '-'}</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
