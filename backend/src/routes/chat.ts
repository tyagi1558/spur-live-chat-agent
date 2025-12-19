import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { generateReply } from '../services/llm';
import {
  getOrCreateConversation,
  saveMessage,
  getConversationHistory,
  updateConversationTimestamp,
} from '../services/conversation';
import { getCached, setCached } from '../services/redis';

export const chatRouter = Router();

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  sessionId: z.string().uuid().optional(),
});

const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '2000');

chatRouter.post('/message', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = messageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { message, sessionId } = validation.data;

    // Truncate if too long
    const truncatedMessage = message.slice(0, MAX_MESSAGE_LENGTH);
    if (message.length > MAX_MESSAGE_LENGTH) {
      console.warn(`Message truncated from ${message.length} to ${MAX_MESSAGE_LENGTH} characters`);
    }

    // Generate or use session ID
    const currentSessionId = sessionId || uuidv4();

    // Get or create conversation
    const conversation = await getOrCreateConversation(currentSessionId);

    // Check cache for similar messages (optional optimization)
    const cacheKey = `chat:${conversation.id}:${truncatedMessage.substring(0, 50)}`;
    const cachedReply = await getCached(cacheKey);
    
    let aiReply: string;
    if (cachedReply) {
      aiReply = cachedReply;
    } else {
      // Get conversation history
      const history = await getConversationHistory(conversation.id);

      // Format history for LLM
      const formattedHistory = history.map((msg) => ({
        sender: msg.sender,
        text: msg.text,
      }));

      // Generate AI reply
      aiReply = await generateReply(formattedHistory, truncatedMessage);

      // Cache the reply (1 hour TTL)
      await setCached(cacheKey, aiReply, 3600);
    }

    // Save user message
    await saveMessage(conversation.id, 'user', truncatedMessage);

    // Save AI reply
    await saveMessage(conversation.id, 'ai', aiReply);

    // Update conversation timestamp
    await updateConversationTimestamp(conversation.id);

    res.json({
      reply: aiReply,
      sessionId: currentSessionId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return user-friendly error
    res.status(500).json({
      error: 'Failed to process message',
      message: errorMessage,
    });
  }
});

chatRouter.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const conversation = await getOrCreateConversation(sessionId);
    const history = await getConversationHistory(conversation.id);

    res.json({
      sessionId,
      messages: history.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp,
      })),
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


