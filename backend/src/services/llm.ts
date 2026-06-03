import dotenv from "dotenv";

dotenv.config();

const SYSTEM_PROMPT = `You are a helpful and friendly customer support agent for a small e-commerce store. 
Your role is to assist customers with store-related questions only.

Store Information:
- Shipping: Free shipping on orders over $50. Standard shipping (5-7 business days) is $5.99, express shipping (2-3 business days) is $12.99. We ship to all US states and select international locations (Canada, UK, Australia, and select European countries).
- Returns: 30-day return policy. Items must be unused, in original packaging, with tags attached. Free returns for orders over $50, otherwise $5.99 return shipping fee. Refunds processed within 5-7 business days.
- Support Hours: Monday-Friday, 9 AM - 6 PM EST. Email: support@store.com for urgent matters (24-hour response time).

Response Guidelines:
- For greetings (hello, hi, hey): Keep it very brief - just a friendly greeting and offer to help with store questions (1 sentence). Example: "Hi! How can I help you with your order or our store policies today?"
- For store-related questions: Provide clear, concise answers (2-3 sentences for simple questions, 3-4 for detailed ones).
- For off-topic or casual conversation: Politely redirect to store-related help. Example: "I'm here to help with store questions! Is there anything about shipping, returns, or orders I can assist with?"
- Always stay professional and focused on customer support.
- Don't engage in casual conversation unrelated to the store.`;

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";

function getApiUrl(): string {
  return process.env.OPENAI_API_URL?.trim() || DEFAULT_API_URL;
}

function buildMessages(
  conversationHistory: Array<{ sender: "user" | "ai"; text: string }>,
  userMessage: string
): ChatMessage[] {
  const maxHistory = parseInt(process.env.MAX_CONVERSATION_HISTORY || "10", 10);
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  for (const msg of conversationHistory.slice(-maxHistory)) {
    messages.push({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    });
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

export async function generateReply(
  conversationHistory: Array<{ sender: "user" | "ai"; text: string }>,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const maxTokens = parseInt(process.env.MAX_TOKENS || "500", 10);
  const maxRetries = 2;
  const retryDelayMs = 1500;
  const messages = buildMessages(conversationHistory, userMessage);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const response = await fetch(getApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

      if (!response.ok) {
        const apiMessage = data.error?.message || response.statusText;

        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your OpenAI API key.");
        }

        if (
          (response.status === 429 || response.status === 503) &&
          attempt < maxRetries
        ) {
          await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
          continue;
        }

        if (response.status === 429) {
          throw new Error(
            "Rate limit exceeded. Please wait a moment and try again."
          );
        }

        if (response.status === 503) {
          throw new Error(
            "Service temporarily unavailable. Please try again later."
          );
        }

        throw new Error(`API error: ${response.status} - ${apiMessage}`);
      }

      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        console.error("Unexpected LLM response:", JSON.stringify(data));
        throw new Error("Empty response from LLM");
      }

      return reply;
    } catch (error: unknown) {
      clearTimeout(timeout);

      if (error instanceof Error) {
        if (
          error.message.includes("Invalid API key") ||
          error.message.includes("Rate limit") ||
          error.message.includes("Service temporarily") ||
          error.message.includes("API error:")
        ) {
          throw error;
        }

        if (error.name === "AbortError") {
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
            continue;
          }
          throw new Error("Request timeout. Please try again.");
        }
      }

      if (attempt === maxRetries) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to generate reply: ${message}`);
      }

      await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
    }
  }

  throw new Error("Failed to generate reply after multiple attempts");
}
