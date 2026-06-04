import React from 'react';
import { useI18n } from '@/i18n';
import type { ModelPickerPayload } from '@/utils/modelPicker';

interface Props {
  picker: ModelPickerPayload;
  disabled?: boolean;
  onSelect: (modelId: string) => void;
}

export const ModelPickerBubble: React.FC<Props> = ({ picker, disabled, onSelect }) => {
  const { t } = useI18n();
  const current = picker.current?.trim() || null;

  return (
    <div className="ui-interactive model-picker" data-testid="model-picker">
      <div className="ui-interactive-header">
        <span className="ui-interactive-title">
          {t('chat.model_picker_title', { name: picker.provider_name })}
        </span>
      </div>
      <p className="model-picker-current">
        {current
          ? t('chat.model_current_active', { model: current })
          : t('chat.model_current_default')}
      </p>
      <div className="model-picker-grid" role="listbox" aria-label={t('chat.model_picker_title', { name: picker.provider_name })}>
        {picker.options.map((modelId) => {
          const isActive = current === modelId;
          return (
            <button
              key={modelId}
              type="button"
              role="option"
              aria-selected={isActive}
              className={`model-picker-btn${isActive ? ' active' : ''}`}
              disabled={disabled}
              onClick={() => onSelect(modelId)}
              data-testid={`model-option-${modelId}`}
            >
              {isActive ? `${modelId} ✓` : modelId}
            </button>
          );
        })}
      </div>
      <p className="model-picker-hint">{t('chat.model_picker_hint')}</p>
    </div>
  );
};
