import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkIns from 'remark-ins';
import { cn } from '@/utils/ui';

interface MarkdownViewerProps {
  content?: string;
  className?: string;
  variant?: 'default' | 'condensed';
}

export function MarkdownViewer({
  content,
  className,
  variant = 'default',
}: MarkdownViewerProps) {
  if (!content) return null;

  return (
    <div
      className={cn(
        'markdown-content',
        variant === 'condensed' ? 'markdown-condensed' : 'px-2',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkIns]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
