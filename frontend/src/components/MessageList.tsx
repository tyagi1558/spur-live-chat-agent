import React from 'react';
import Message from './Message';
import { Message as MessageType } from './ChatWidget';
import './MessageList.css';

interface MessageListProps {
  messages: MessageType[];
  onQuestionClick?: (question: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onQuestionClick }) => {
  const suggestedQuestions = [
    "What's your return policy?",
    "Do you ship to USA?",
    "What are your support hours?",
  ];

  const handleQuestionClick = (question: string) => {
    if (onQuestionClick) {
      onQuestionClick(question);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <p>👋 Hi! How can I help you today?</p>
        <div className="suggested-questions">
          <p className="suggested-label">Try asking:</p>
          <ul>
            {suggestedQuestions.map((question, index) => (
              <li
                key={index}
                onClick={() => handleQuestionClick(question)}
                style={{ cursor: 'pointer' }}
              >
                {question}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  );
};

export default MessageList;


