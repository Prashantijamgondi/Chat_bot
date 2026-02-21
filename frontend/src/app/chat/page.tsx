'use client';

import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatMessageBubble } from '@/components/ChatMessageBubble';
import type { Language } from '@/types';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'auto', label: '🌐 Auto' },
  { value: 'python', label: '🐍 Python' },
  { value: 'typescript', label: '💙 TypeScript' },
  { value: 'javascript', label: '🟡 JavaScript' },
  { value: 'go', label: '🐹 Go' },
  { value: 'rust', label: '🦀 Rust' },
  { value: 'java', label: '☕ Java' },
  { value: 'cpp', label: '⚡ C++' },
  { value: 'html', label: '📄 HTML' },
  { value: 'css', label: '🎨 CSS' },
  { value: 'nextjs', label: '▲ Next.js' },
];

const STARTERS = [
  'How do I reverse a linked list?',
  'Explain async/await vs promises',
  'Write a binary search function',
  'What is the difference between REST and GraphQL?',
];

export default function ChatPage() {
  const {
    messages,
    sessionId,
    sessions,
    isLoading,
    error,
    language,
    setLanguage,
    sendMessage,
    clearSession,
    loadHistory,
    startNewChat,
    refreshSessions,
  } = useChat();

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarter = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="chat-page">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span>CodeBot</span>
        </div>

        <div className="sidebar-section">
          <button className="new-chat-btn" onClick={startNewChat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="sidebar-section">
          <label className="sidebar-label">Language Hint</label>
          <select
            className="lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {sessions.length > 0 && (
          <div className="sidebar-section">
            <label className="sidebar-label">Recent Chats</label>
            <div className="sessions-list">
              {sessions.map((s) => (
                <button
                  key={s}
                  className={`session-item ${sessionId === s ? 'active' : ''}`}
                  onClick={() => loadHistory(s)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  {s.slice(0, 12)}...
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <label className="sidebar-label">Quick Start</label>
          <div className="starters">
            {STARTERS.map((s) => (
              <button key={s} className="starter-btn" onClick={() => handleStarter(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          {sessionId && (
            <div className="session-badge">
              <span className="session-dot" />
              <span className="session-text">Session active</span>
            </div>
          )}
          <button
            className="clear-btn"
            onClick={clearSession}
            disabled={messages.length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            Clear session
          </button>
        </div>
      </aside>

      {/* ── Chat area ───────────────────────── */}
      <main className="chat-main">
        <div className="messages-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h2>Coding Assistant</h2>
              <p>Ask me anything about code — I'll help you write, debug, and understand it.</p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="message-row assistant-row">
              <div className="avatar bot-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div className="bubble bot-bubble">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ─────────────────────── */}
        <div className="input-bar">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a coding question… (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={isLoading}
            />
            <button
              className={`send-btn ${isLoading || !input.trim() ? 'disabled' : ''}`}
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="input-hint">Powered by Llama 3.3 · OpenRouter. Conversations are saved automatically.</p>
        </div>
      </main>
    </div>
  );
}
