import axios from 'axios';

// Backend URL: Set REACT_APP_API_URL in Vercel environment variables
// For production: Your Render backend URL (e.g., https://spur-backend.onrender.com)
// For development: http://localhost:3001
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface ChatMessage {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export interface MessageHistory {
  sessionId: string;
  messages: Array<{
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
  }>;
}

export const chatApi = {
  sendMessage: async (data: ChatMessage): Promise<ChatResponse> => {
    const response = await axios.post<ChatResponse>(
      `${API_BASE_URL}/chat/message`,
      data
    );
    return response.data;
  },

  getHistory: async (sessionId: string): Promise<MessageHistory> => {
    const response = await axios.get<MessageHistory>(
      `${API_BASE_URL}/chat/history/${sessionId}`
    );
    return response.data;
  },
};


