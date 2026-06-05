import { MessageMarkdown, shouldRenderMarkdown } from '@/components/MessageMarkdown';

interface Props {
  content: string;
  isAnimating?: boolean;
}

/** Plain text or Streamdown markdown for chat bubbles. */
export const MessageBody: React.FC<Props> = ({ content, isAnimating }) => {
  if (shouldRenderMarkdown(content)) {
    return <MessageMarkdown content={content} isAnimating={isAnimating} />;
  }
  return <span className="message-plain">{content}</span>;
};
