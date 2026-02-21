// ─── Contact Types ────────────────────────────────────────────────────────────
// Matches FastAPI ContactRequest model
export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}

// Matches FastAPI ContactResponse model
export interface ContactResponse {
  success: boolean;
  message: string;
  ticket_id: string;
  submitted_at: string;
}

// ─── Chat Types ───────────────────────────────────────────────────────────────
// Matches FastAPI ChatRequest model
export interface ChatRequest {
  message: string;
  session_id?: string;
  language?: string;
}

// Matches FastAPI ChatResponse model
export interface ChatResponse {
  reply: string;
  session_id: string;
  model: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// Matches FastAPI ChatMessage model (for history)
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Matches /api/chat/{session_id}/history response
export interface ChatHistoryResponse {
  session_id: string;
  message_count: number;
  messages: ChatMessage[];
}

// ─── Health ───────────────────────────────────────────────────────────────────
// Matches FastAPI HealthResponse model
export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  llm_configured: boolean;
}

export interface ChatSessionsResponse {
  sessions: string[];
}

// ─── UI-only types ────────────────────────────────────────────────────────────
// Extended UI message (adds timestamp and id for local state)
export interface UIMessage extends ChatMessage {
  id: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export type Language = 'python' | 'javascript' | 'html' | 'css' | 'nextjs' | 'typescript' | 'go' | 'rust' | 'java' | 'cpp' | 'auto';
