import { useState, useCallback, useRef, useEffect } from 'react';
import { sendChatMessage, clearChatSession, getChatHistory, listChatSessions } from '@/lib/api';
import type { UIMessage, Language } from '@/types';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

const SESSION_STORAGE_KEY = 'chat_bot_last_session_id';

export function useChat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('auto');
  const abortRef = useRef(false);

  const refreshSessions = useCallback(async () => {
    try {
      const resp = await listChatSessions();
      setSessions(resp.sessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, []);

  const loadHistory = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const history = await getChatHistory(id);
      const uiMsgs: UIMessage[] = history.messages.map((m, idx) => ({
        ...m,
        id: `hist-${idx}`,
        timestamp: new Date(),
      }));
      setMessages(uiMsgs);
      setSessionId(id);
      localStorage.setItem(SESSION_STORAGE_KEY, id);
    } catch (err) {
      setError('Failed to load chat history.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On mount: try to restore last session or load sessions list
  useEffect(() => {
    refreshSessions();
    const savedId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedId) {
      loadHistory(savedId);
    }
  }, [refreshSessions, loadHistory]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      abortRef.current = false;

      // Optimistically add user message to UI
      const userMsg: UIMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const payload = {
          message: content.trim(),
          ...(sessionId ? { session_id: sessionId } : {}),
          ...(language !== 'auto' ? { language } : {}),
        };

        const response = await sendChatMessage(payload);

        if (abortRef.current) return;

        // Save session
        setSessionId(response.session_id);
        localStorage.setItem(SESSION_STORAGE_KEY, response.session_id);

        // Refresh session list if it's new
        if (!sessionId) {
          refreshSessions();
        }

        const assistantMsg: UIMessage = {
          id: generateId(),
          role: 'assistant',
          content: response.reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        if (abortRef.current) return;
        const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        if (!abortRef.current) setIsLoading(false);
      }
    },
    [isLoading, sessionId, language, refreshSessions]
  );

  const clearSession = useCallback(async () => {
    abortRef.current = true;
    setIsLoading(false);

    if (sessionId) {
      try {
        await clearChatSession(sessionId);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        refreshSessions();
      } catch {
        // Ignore
      }
    }

    setMessages([]);
    setSessionId(undefined);
    setError(null);
    abortRef.current = false;
  }, [sessionId, refreshSessions]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setError(null);
  }, []);

  return {
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
  };
}
