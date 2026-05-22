import React from 'react';
import type { PlatformInfo } from '@/types';

interface Props {
  platforms: PlatformInfo[];
  onClose: () => void;
}

export const PlatformsModal: React.FC<Props> = ({ platforms, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Connected Platforms</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="platforms-list">
          {platforms.length === 0 && <div className="platform-empty">// no platforms enabled</div>}
          {platforms.map((p, i) => (
            <div key={i} className="platform-card">
              <div>
                <div className="platform-name">{p.name}</div>
                {p.mode && <div className="platform-detail">mode: {p.mode}</div>}
                <div className="platform-detail">allow: {p.allow_from}</div>
              </div>
              <div className="platform-status">connected</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
