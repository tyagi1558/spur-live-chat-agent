import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import { chatApi } from "../services/api";
import "./ChatWidget.css";

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize session ID from localStorage or create new one
    const savedSessionId = localStorage.getItem("chatSessionId");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadHistory(savedSessionId);
    } else {
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      localStorage.setItem("chatSessionId", newSessionId);
    }
  }, []);

  const loadHistory = async (sessionId: string) => {
    try {
      const history = await chatApi.getHistory(sessionId);
      const formattedMessages: Message[] = history.messages.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(formattedMessages);
    } catch (err) {
      console.error("Failed to load history:", err);
      // Don't show error for history load failure, just start fresh
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatApi.sendMessage({
        message: text.trim(),
        sessionId: sessionId || undefined,
      });

      // Update session ID if it changed
      if (response.sessionId !== sessionId) {
        setSessionId(response.sessionId);
        localStorage.setItem("chatSessionId", response.sessionId);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: response.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to send message. Please try again.";
      setError(errorMessage);

      // Show error as an AI message for better UX
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <div className="chat-widget-header">
        <h2>Chat Support</h2>
        <span className="status-indicator">Online</span>
      </div>
      <div className="chat-widget-body">
        <MessageList messages={messages} onQuestionClick={handleSendMessage} />
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      {error && (
        <div className="chat-error">
          <small>{error}</small>
        </div>
      )}
      <MessageInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
};

export default ChatWidget;
