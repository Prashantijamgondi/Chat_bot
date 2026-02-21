'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import type { UIMessage } from '@/types';

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
      <div className={`avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`}>
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        )}
      </div>

      <div className={`bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
        {isUser ? (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Render fenced code blocks with syntax highlighting
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className ?? '');
                const isBlock = !!(node?.position && String(children).includes('\n'));

                if (isBlock || match) {
                  return (
                    <CodeBlock language={match ? match[1] : ''}>
                      {String(children).replace(/\n$/, '')}
                    </CodeBlock>
                  );
                }

                // Inline code
                return (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                );
              },
              // Tables
              table({ children }) {
                return (
                  <div className="table-wrapper">
                    <table>{children}</table>
                  </div>
                );
              },
              // Links open in new tab
              a({ href, children }) {
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        <span className="msg-time">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
