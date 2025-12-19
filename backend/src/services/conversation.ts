import { pool } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Conversation {
  id: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export async function getOrCreateConversation(sessionId: string): Promise<Conversation> {
  const [rows] = await pool.query(
    'SELECT * FROM conversations WHERE session_id = ?',
    [sessionId]
  ) as any[];

  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0];
  }

  const conversationId = uuidv4();
  await pool.query(
    'INSERT INTO conversations (id, session_id) VALUES (?, ?)',
    [conversationId, sessionId]
  );

  const [newRows] = await pool.query(
    'SELECT * FROM conversations WHERE id = ?',
    [conversationId]
  ) as any[];

  return newRows[0];
}

export async function saveMessage(
  conversationId: string,
  sender: 'user' | 'ai',
  text: string
): Promise<Message> {
  const messageId = uuidv4();
  await pool.query(
    `INSERT INTO messages (id, conversation_id, sender, text) 
     VALUES (?, ?, ?, ?)`,
    [messageId, conversationId, sender, text]
  );

  const [rows] = await pool.query(
    'SELECT * FROM messages WHERE id = ?',
    [messageId]
  ) as any[];

  return rows[0];
}

export async function getConversationHistory(conversationId: string): Promise<Message[]> {
  const [rows] = await pool.query(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
    [conversationId]
  ) as any[];

  return Array.isArray(rows) ? rows : [];
}

export async function updateConversationTimestamp(conversationId: string): Promise<void> {
  await pool.query(
    'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [conversationId]
  );
}


