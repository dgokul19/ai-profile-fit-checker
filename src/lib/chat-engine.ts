import { getGroqClient, getAvailableModels, markModelCooldown, formatGroqError } from "./groq";
import { CHAT_SYSTEM_PROMPT, buildChatContext } from "@/prompts/chat-system";
import type { Session } from "@/types/session";

export async function* streamChat(
  session: Session,
  userMessage: string
): AsyncGenerator<{ type: "token" | "done"; text?: string }> {
  const client = getGroqClient();
  const context = buildChatContext(session);

  const systemMessage = `${CHAT_SYSTEM_PROMPT}\n\n## Available Session Data for Candidate & Roles\n${context}`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemMessage },
    ...session.chatHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const modelsQueue = getAvailableModels();
  let stream: any = null;
  let lastError: unknown = null;

  for (const model of modelsQueue) {
    try {
      console.log(`[Groq Failover] Starting chat stream with model: ${model}`);
      stream = await client.chat.completions.create({
        model,
        messages,
        stream: true,
        temperature: 0.3,
      });
      break;
    } catch (error: any) {
      lastError = error;
      const errMsg = error?.message || String(error);
      const isRateLimit =
        error?.status === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("rate_limit") ||
        errMsg.includes("TPM") ||
        errMsg.includes("tokens per minute");

      if (isRateLimit) {
        console.warn(`[Groq Failover] Rate limit on ${model} for chat. Falling back to next alternate model...`);
        markModelCooldown(model, 60000);
      } else {
        console.warn(`[Groq Failover] Chat stream error on ${model}: ${errMsg}. Attempting next model...`);
      }
    }
  }

  if (!stream) {
    throw new Error(formatGroqError(lastError));
  }

  try {
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        yield { type: "token", text: token };
      }
    }

    yield { type: "done" };
  } catch (streamError) {
    throw new Error(formatGroqError(streamError));
  }
}
