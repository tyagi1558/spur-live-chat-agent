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

export async function generateReply(
  conversationHistory: Array<{ sender: "user" | "ai"; text: string }>,
  userMessage: string
): Promise<string> {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Build context from conversation history
      const maxHistory = parseInt(process.env.MAX_CONVERSATION_HISTORY || "10");
      const recentHistory = conversationHistory.slice(-maxHistory);

      // Create context string from history
      let contextText = SYSTEM_PROMPT + "\n\n";
      for (const msg of recentHistory) {
        contextText += `${msg.sender === "user" ? "Customer" : "Support"}: ${
          msg.text
        }\n`;
      }
      contextText += `Customer: ${userMessage}`;

      // Prepare input with context
      const inputText = contextText;

      // Make direct HTTP request to OpenAI API (same as Postman)
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5-nano",
          input: inputText,
          store: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your OpenAI API key.");
        } else if (response.status === 429) {
          // Rate limit - retry with exponential backoff
          if (attempt < maxRetries) {
            const delay = retryDelay * attempt;
            console.log(
              `Rate limit hit, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue; // Retry
          }
          throw new Error(
            "Rate limit exceeded. Please wait a moment and try again."
          );
        } else if (response.status === 503) {
          // Service unavailable - retry
          if (attempt < maxRetries) {
            const delay = retryDelay * attempt;
            console.log(
              `Service unavailable, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue; // Retry
          }
          throw new Error(
            "Service temporarily unavailable. Please try again later."
          );
        }
        throw new Error(
          `API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();

      // Extract text from response (based on actual API response format)
      // Response structure: data.output[] -> find type: "message" -> content[0].text
      let reply: string | null = null;

      if (data.output && Array.isArray(data.output)) {
        // Find the message type output
        const messageOutput = data.output.find(
          (item: any) => item.type === "message" && item.status === "completed"
        );

        if (messageOutput?.content && Array.isArray(messageOutput.content)) {
          // Find output_text type content
          const textContent = messageOutput.content.find(
            (item: any) => item.type === "output_text"
          );
          if (textContent?.text) {
            reply = textContent.text.trim();
          }
        }
      }

      // Fallback: try direct text field (if it's a string)
      if (!reply && typeof data.text === "string") {
        reply = data.text.trim();
      }

      if (!reply) {
        console.error("Response structure:", JSON.stringify(data, null, 2));
        throw new Error("Empty response from LLM - could not extract text");
      }

      return reply;
    } catch (error: any) {
      // Handle network/timeout errors
      if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("timeout") ||
        error.name === "AbortError"
      ) {
        if (attempt < maxRetries) {
          const delay = retryDelay * attempt;
          console.log(
            `Request timeout, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue; // Retry
        }
        throw new Error("Request timeout. Please try again.");
      }

      // If it's already a handled error, re-throw it
      if (
        error.message?.includes("Rate limit") ||
        error.message?.includes("Invalid API key") ||
        error.message?.includes("Service temporarily")
      ) {
        throw error;
      }

      // For other errors, don't retry on last attempt
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to generate reply: ${error.message || "Unknown error"}`
        );
      }

      // Retry for other errors
      const delay = retryDelay * attempt;
      console.log(
        `Error occurred, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to generate reply after multiple attempts");
}
