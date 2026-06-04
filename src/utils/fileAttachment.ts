import { getApiToken } from '@/api/client';
import { WEBUI_FILE_PREFIX } from '@/utils/fileAttachmentConstants';

export type FileAttachment = {
  v: number;
  kind: 'file';
  media: string;
  name: string;
  size: number;
  /** Set by gateway when saving; falls back to extension heuristics. */
  is_image?: boolean;
};

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'avif',
  'heic',
  'heif',
]);

export function mediaUrl(media: string): string {
  const base = `/api/media/${encodeURIComponent(media)}`;
  const token = getApiToken();
  if (token) {
    return `${base}?token=${encodeURIComponent(token)}`;
  }
  return base;
}

export function parseFileAttachment(content: string): FileAttachment | null {
  if (!content.startsWith(WEBUI_FILE_PREFIX)) {
    return null;
  }
  try {
    const raw = JSON.parse(content.slice(WEBUI_FILE_PREFIX.length)) as FileAttachment;
    if (raw?.kind === 'file' && typeof raw.media === 'string') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isImageAttachment(attachment: FileAttachment): boolean {
  if (attachment.is_image === true) {
    return true;
  }
  const ext = (
    attachment.name.split('.').pop() ||
    attachment.media.split('.').pop() ||
    ''
  ).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
