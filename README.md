# Spur AI Live Chat Agent

A full-stack AI-powered customer support chat application built with React, Node.js, TypeScript, MySQL, and Redis.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MySQL 5.7+ (or PostgreSQL 12+)
- Redis 6+ (optional, but recommended)
- OpenAI API key

### Installation & Setup

1. **Clone and install dependencies:**

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

2. **Set up MySQL database:**

```bash
# Using MySQL command line
mysql -u root -p
CREATE DATABASE spur_chat;

# Or using Clever Cloud / any MySQL provider
# Just create the database and note the connection details
```

3. **Configure environment variables:**

```bash
# Copy example env file
cp backend/.env.example backend/.env

# Edit backend/.env and add your configuration:
# - DB_HOST, DB_PORT (3306 for MySQL), DB_NAME, DB_USER, DB_PASSWORD
# - REDIS_HOST, REDIS_PORT (optional)
# - OPENAI_API_KEY (required)
```

4. **Run database migrations:**

```bash
cd backend
npm run migrate
```

5. **Start Redis (optional but recommended):**

```bash
# On macOS with Homebrew
brew services start redis

# On Linux
sudo systemctl start redis

# On Windows, download and run Redis from:
# https://github.com/microsoftarchive/redis/releases
```

6. **Start the backend server:**

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:3001`

7. **Start the frontend (in a new terminal):**

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## 📁 Project Structure

```
spurAssig/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.ts      # MySQL connection pool
│   │   │   ├── migrate.ts         # Database migrations
│   │   │   └── seed.ts            # Seed data (if needed)
│   │   ├── routes/
│   │   │   ├── chat.ts            # Chat API endpoints
│   │   │   └── health.ts          # Health check endpoint
│   │   ├── services/
│   │   │   ├── llm.ts             # OpenAI integration
│   │   │   ├── conversation.ts    # Conversation & message persistence
│   │   │   └── redis.ts           # Redis caching layer
│   │   └── index.ts               # Express server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx     # Main chat container
│   │   │   ├── MessageList.tsx    # Message list display
│   │   │   ├── Message.tsx        # Individual message component
│   │   │   ├── MessageInput.tsx   # Input field with send button
│   │   │   └── TypingIndicator.tsx # "Agent is typing..." indicator
│   │   ├── services/
│   │   │   └── api.ts             # API client (axios)
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## 🏗️ Architecture Overview

### Backend Architecture

**Layered Structure:**

- **Routes Layer** (`routes/`): HTTP request handlers, input validation
- **Services Layer** (`services/`): Business logic (LLM, conversation management, caching)
- **Data Layer** (`db/`): Database connection and migrations

**Key Design Decisions:**

1. **Session-based Conversations**: Each chat session gets a unique UUID stored in localStorage. Conversations persist across page reloads.

2. **LLM Integration**: Encapsulated in `services/llm.ts` with:

   - System prompt containing store FAQ knowledge
   - Conversation history context (last 10 messages)
   - Comprehensive error handling for API failures

3. **Caching Strategy**: Redis caches AI responses for identical messages within the same conversation (1-hour TTL) to reduce API costs and improve response time.

4. **Error Handling**:

   - Input validation using Zod schemas
   - Graceful degradation (works without Redis)
   - User-friendly error messages
   - Message length truncation (2000 chars max)

5. **Database Schema**:
   - `conversations`: Session management
   - `messages`: All user and AI messages with timestamps
   - Indexed for fast queries

### Frontend Architecture

**Component Structure:**

- **ChatWidget**: Main container managing state and API calls
- **MessageList**: Displays all messages with empty state
- **Message**: Reusable message bubble component
- **MessageInput**: Controlled input with Enter-to-send
- **TypingIndicator**: Loading state indicator

**State Management:**

- React hooks (useState, useEffect) for local state
- Session ID persisted in localStorage
- Automatic history loading on mount

**UX Features:**

- Auto-scroll to latest message
- Disabled send button while loading
- Typing indicator during AI response
- Suggested questions on empty state
- Responsive design for mobile

## 🤖 LLM Integration

**Provider**: OpenAI GPT-5-nano (via `/v1/responses` endpoint)

**Prompting Strategy:**

- System prompt includes store policies (shipping, returns, support hours)
- Conversation history (last 10 messages) for context
- Direct HTTP API calls (not using OpenAI SDK)
- Response parsing from `output[].content[].text` structure

**Error Handling:**

- Invalid API key → Clear error message
- Rate limits → User-friendly retry message
- Timeouts → Graceful timeout handling
- Service unavailable → Fallback message

## 🔒 Robustness Features

1. **Input Validation**:

   - Empty messages rejected
   - Message length capped at 2000 chars (truncated with warning)
   - Session ID UUID validation

2. **Error Resilience**:

   - Database connection failures handled gracefully
   - Redis failures don't break the app (continues without cache)
   - LLM API errors return user-friendly messages
   - Network errors handled with retry guidance

3. **Security**:
   - No secrets in code (all via environment variables)
   - SQL injection prevention (parameterized queries)
   - CORS configured for frontend origin
   - Request size limits (10MB max)

## 📊 API Endpoints

### `POST /chat/message`

Send a chat message and get AI response.

**Request:**

```json
{
  "message": "What's your return policy?",
  "sessionId": "optional-uuid"
}
```

**Response:**

```json
{
  "reply": "We offer a 30-day return policy...",
  "sessionId": "uuid-here"
}
```

### `GET /chat/history/:sessionId`

Get conversation history for a session.

**Response:**

```json
{
  "sessionId": "uuid-here",
  "messages": [
    {
      "id": "msg-id",
      "sender": "user",
      "text": "Hello",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### `GET /health`

Health check endpoint (database and Redis status).

## 🧪 Testing the Application

1. **Test basic chat flow:**

   - Open `http://localhost:3000`
   - Send a message like "What's your return policy?"
   - Verify AI response appears

2. **Test session persistence:**

   - Send a few messages
   - Reload the page
   - Verify conversation history loads

3. **Test error handling:**

   - Stop the backend server
   - Try sending a message
   - Verify error message appears

4. **Test input validation:**
   - Try sending empty message (should be blocked)
   - Try sending very long message (should be truncated)

## 🛠️ Trade-offs & Future Improvements

**If I had more time, I would:**

1. **Testing**: Add unit tests (Jest) and integration tests for API endpoints
2. **Rate Limiting**: Implement per-session rate limiting to prevent abuse
3. **Streaming Responses**: Use OpenAI streaming API for real-time token-by-token responses
4. **Message Reactions**: Allow users to rate AI responses (thumbs up/down)
5. **Admin Dashboard**: View all conversations, analytics, and manage FAQ knowledge base
6. **Multi-language Support**: Detect and respond in user's language
7. **File Attachments**: Support image/file uploads in chat
8. **WebSocket**: Real-time bidirectional communication instead of polling
9. **Better Caching**: Cache FAQ responses more intelligently (semantic similarity)
10. **Monitoring**: Add logging (Winston) and error tracking (Sentry)

**Current Trade-offs:**

- Using SQLite would be simpler for setup but MySQL/PostgreSQL is more production-ready
- No authentication (acceptable for assignment scope)
- Simple in-memory session management (localStorage) - could use JWT tokens
- Basic error messages - could be more detailed with error codes

## 📝 Environment Variables Reference

### Backend (.env)

```bash
# Server
PORT=3001
NODE_ENV=development

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=spur_chat
DB_USER=root
DB_PASSWORD=your_password

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenAI (required)
OPENAI_API_KEY=sk-...

# Settings
MAX_MESSAGE_LENGTH=2000
MAX_TOKENS=500
MAX_CONVERSATION_HISTORY=10
```

### Frontend

Set `REACT_APP_API_URL` if backend runs on different port:

```bash
REACT_APP_API_URL=http://localhost:3001
```

## 🐛 Troubleshooting

**Backend won't start:**

- Check MySQL is running: `mysql -u root -p -e "SELECT 1"`
- Verify database exists: `mysql -u root -p -e "SHOW DATABASES LIKE 'spur_chat'"`
- Check `.env` file has correct credentials

**Frontend can't connect to backend:**

- Verify backend is running on port 3001
- Check CORS settings in backend
- Verify `REACT_APP_API_URL` if set

**Redis connection fails:**

- App will continue without Redis (caching disabled)
- Check Redis is running: `redis-cli ping`

**LLM errors:**

- Verify `OPENAI_API_KEY` is set correctly
- Check API key has credits/quota
- Review error message in browser console

## 📦 Dependencies

**Backend:**

- `express`: Web framework
- `mysql2`: MySQL client
- `redis`: Redis client
- `openai`: OpenAI SDK (using direct API calls)
- `zod`: Schema validation
- `uuid`: UUID generation

**Frontend:**

- `react`: UI library
- `axios`: HTTP client
- `uuid`: Session ID generation

All dependencies are production-ready and well-maintained.

---

**Built with ❤️ for Spur Assignment**
