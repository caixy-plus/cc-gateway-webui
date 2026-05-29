import React from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  icon?: string;
  variant?: 'default' | 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  detail,
  confirmLabel,
  cancelLabel,
  loading,
  icon,
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onCancel}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onCancel} disabled={loading}>×</button>
        </div>
        <div className="confirm-modal-body">
          <div className={`confirm-icon ${variant}`}>
            {icon || (variant === 'danger' ? '!' : '↻')}
          </div>
          <div className="confirm-copy">
            <div className="confirm-title">{message}</div>
            {detail && <div className="confirm-subtitle">{detail}</div>}
          </div>
        </div>
        <div className="confirm-modal-actions">
          <button className="secondary-btn" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={variant === 'danger' ? 'danger-btn' : 'primary-btn'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
