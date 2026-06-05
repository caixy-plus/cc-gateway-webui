import { useMemo } from 'react';
import { Streamdown } from 'streamdown';
import { createCodePlugin } from '@streamdown/code';
import type { BundledTheme } from 'shiki';

import { useI18n } from '@/i18n';
import { WEBUI_FILE_PREFIX } from '@/utils/fileAttachmentConstants';
import { WEBUI_MODEL_PICKER_PREFIX } from '@/utils/modelPickerConstants';
import { streamdownIcons } from '@/components/StreamdownIcons';
import { streamdownTranslations } from '@/utils/streamdownTranslations';

/** Shiki light + dark themes (must match between Streamdown and @streamdown/code). */
export const STREAMDOWN_SHIKI_THEMES: [BundledTheme, BundledTheme] = [
  'github-light',
  'github-dark',
];

/** Syntax highlighting requires @streamdown/code — see https://streamdown.ai/docs/code-blocks */
const codePlugin = createCodePlugin({ themes: STREAMDOWN_SHIKI_THEMES });

/** Structured SSE payloads use custom bubbles, not markdown. */
export function shouldRenderMarkdown(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }
  return !trimmed.startsWith(WEBUI_FILE_PREFIX) && !trimmed.startsWith(WEBUI_MODEL_PICKER_PREFIX);
}

interface Props {
  content: string;
  className?: string;
  /** True while the assistant message is still streaming (disables code copy). */
  isAnimating?: boolean;
}

export const MessageMarkdown: React.FC<Props> = ({
  content,
  className,
  isAnimating = false,
}) => {
  const { locale } = useI18n();
  const translations = useMemo(() => streamdownTranslations(locale), [locale]);

  // Plugin must be passed for Shiki highlighting; plain `code` export is the same defaults.
  const plugins = useMemo(() => ({ code: codePlugin }), []);

  return (
    <Streamdown
      className={className ?? 'message-markdown'}
      mode={isAnimating ? 'streaming' : 'static'}
      parseIncompleteMarkdown={isAnimating}
      plugins={plugins}
      controls={{
        code: { copy: true, download: false },
        table: false,
        mermaid: false,
      }}
      isAnimating={isAnimating}
      translations={translations}
      shikiTheme={STREAMDOWN_SHIKI_THEMES}
      lineNumbers
      icons={streamdownIcons}
    >
      {content}
    </Streamdown>
  );
};
