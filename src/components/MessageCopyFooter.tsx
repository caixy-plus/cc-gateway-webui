import { CopyButton } from '@/components/CopyButton';

interface Props {
  content: string;
}

export const MessageCopyFooter: React.FC<Props> = ({ content }) => {
  if (!content.trim()) {
    return null;
  }
  return (
    <div className="message-copy-footer">
      <CopyButton text={content} />
    </div>
  );
};
