import { defaultTranslations, type StreamdownTranslations } from 'streamdown';
import type { Locale } from '@/i18n';

const en: Partial<StreamdownTranslations> = {
  copyCode: 'Copy',
  copied: 'Copied',
};

const zh: Partial<StreamdownTranslations> = {
  copied: '已复制',
  copyCode: '复制',
  copyLink: '复制链接',
  close: '关闭',
  openLink: '打开链接',
  openExternalLink: '打开外部链接',
  externalLinkWarning: '你即将打开外部链接，请确认是否继续。',
};

/** Streamdown UI strings (code copy, links, etc.). */
export function streamdownTranslations(locale: Locale): StreamdownTranslations {
  if (locale === 'zh') {
    return { ...defaultTranslations, ...zh };
  }
  return { ...defaultTranslations, ...en };
}
