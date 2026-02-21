import type {
    ContactRequest,
    ContactResponse,
    ChatRequest,
    ChatResponse,
    ChatHistoryResponse,
    HealthResponse,
    ChatSessionsResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API request failed with status ${response.status}`);
        }

        return await response.json() as T;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>('/api/health');
}

/**
 * Submit contact form
 */
export async function submitContact(payload: ContactRequest): Promise<ContactResponse> {
    return apiFetch<ContactResponse>('/api/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Send chat message
 */
export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
    return apiFetch<ChatResponse>('/api/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<ChatHistoryResponse> {
    return apiFetch<ChatHistoryResponse>(`/api/chat/${sessionId}/history`);
}

/**
 * Clear a chat session
 */
export async function clearChatSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/chat/${sessionId}`, {
        method: 'DELETE',
    });
}

/**
 * List all chat sessions
 */
export async function listChatSessions(): Promise<ChatSessionsResponse> {
    return apiFetch<ChatSessionsResponse>('/api/chat/sessions');
}

