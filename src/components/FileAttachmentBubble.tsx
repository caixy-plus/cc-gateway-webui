import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import type { FileAttachment } from '@/utils/fileAttachment';
import { formatFileSize, isImageAttachment, mediaUrl } from '@/utils/fileAttachment';

interface Props {
  attachment: FileAttachment;
  caption?: string;
}

export const FileAttachmentBubble: React.FC<Props> = ({ attachment, caption }) => {
  const { t } = useI18n();
  const url = mediaUrl(attachment.media);
  const isImage = isImageAttachment(attachment);
  const [imgFailed, setImgFailed] = useState(false);

  if (isImage && !imgFailed) {
    return (
      <div className="file-attachment file-attachment--image">
        {caption ? <p className="file-attachment-caption">{caption}</p> : null}
        <a href={url} target="_blank" rel="noopener noreferrer" className="file-attachment-image-link">
          <img
            src={url}
            alt={attachment.name}
            className="file-attachment-image"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        </a>
        <a href={url} target="_blank" rel="noopener noreferrer" className="file-attachment-image-open">
          {attachment.name} · {formatFileSize(attachment.size)}
        </a>
      </div>
    );
  }

  return (
    <div className="file-attachment">
      {caption ? <p className="file-attachment-caption">{caption}</p> : null}
      <a href={url} download={attachment.name} className="file-attachment-download">
        <span className="file-attachment-icon">📎</span>
        <span className="file-attachment-name">{attachment.name}</span>
        <span className="file-attachment-size">{formatFileSize(attachment.size)}</span>
      </a>
      <div className="file-attachment-meta">{t('chat.file_download_hint')}</div>
    </div>
  );
};
