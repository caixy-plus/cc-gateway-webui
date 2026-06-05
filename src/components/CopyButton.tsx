import { useCallback, useState } from 'react';
import { useI18n } from '@/i18n';
import { copyTextToClipboard } from '@/utils/copyText';

interface Props {
  text: string;
  className?: string;
}

export const CopyButton: React.FC<Props> = ({ text, className = '' }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    const ok = await copyTextToClipboard(text);
    if (!ok) {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [text]);

  const label = copied ? t('chat.copied') : t('chat.copy');

  return (
    <button
      type="button"
      className={`copy-btn${copied ? ' is-copied' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      title={t('chat.copy_message')}
      aria-label={t('chat.copy_message')}
      data-testid="copy-message-btn"
    >
      {label}
    </button>
  );
};
