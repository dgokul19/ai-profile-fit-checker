import Groq from "groq-sdk";

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set. Please get a free API key at https://console.groq.com/keys and add GROQ_API_KEY=gsk_... to your .env.local file."
      );
    }
    client = new Groq({ apiKey: apiKey.trim() });
  }
  return client;
}

/**
 * 5-tier candidate models in priority order.
 * Primary: llama-3.3-70b-versatile
 * Followed by 120B, 27B, and 20B fallbacks.
 */
export const CANDIDATE_MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "llama-3.1-70b-versatile",
];

// Map of modelId -> cooldown expiration timestamp (ms)
const modelCooldowns = new Map<string, number>();

/**
 * Mark a model in temporary cooldown (e.g., when encountering HTTP 429 rate limit).
 */
export function markModelCooldown(modelId: string, durationMs: number = 60000) {
  modelCooldowns.set(modelId, Date.now() + durationMs);
  console.warn(
    `[Groq Failover] Model '${modelId}' marked on cooldown for ${Math.round(durationMs / 1000)}s`
  );
}

/**
 * Check if a model is currently available or cooled down.
 */
export function isModelAvailable(modelId: string): boolean {
  const cooldownUntil = modelCooldowns.get(modelId);
  if (!cooldownUntil) return true;
  if (Date.now() > cooldownUntil) {
    modelCooldowns.delete(modelId);
    return true;
  }
  return false;
}

/**
 * Returns available models sorted by priority, with cooled-down models deferred.
 */
export function getAvailableModels(): string[] {
  if (process.env.GROQ_MODEL) {
    return [process.env.GROQ_MODEL.trim(), ...CANDIDATE_MODELS.filter((m) => m !== process.env.GROQ_MODEL?.trim())];
  }

  const available = CANDIDATE_MODELS.filter(isModelAvailable);
  const coolingDown = CANDIDATE_MODELS.filter((m) => !isModelAvailable(m));

  return available.length > 0 ? [...available, ...coolingDown] : CANDIDATE_MODELS;
}

/**
 * Executes an operation with automatic model failover.
 * If a 429 rate limit or service error occurs, automatically retries
 * with the next alternate model in the chain.
 */
export async function runWithModelFailover<T>(
  operation: (model: string) => Promise<T>,
  contextDescription: string = "Groq operation"
): Promise<{ result: T; modelUsed: string }> {
  const queue = getAvailableModels();
  let lastError: unknown = null;

  for (let i = 0; i < queue.length; i++) {
    const model = queue[i];
    try {
      console.log(`[Groq Failover] Executing ${contextDescription} with model: ${model}`);
      const result = await operation(model);
      return { result, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isRateLimit =
        err?.status === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("rate_limit") ||
        errMsg.includes("TPM") ||
        errMsg.includes("RPM") ||
        errMsg.includes("tokens per minute");
      const isNotFound =
        err?.status === 404 ||
        errMsg.includes("model_not_found") ||
        errMsg.includes("does not exist") ||
        errMsg.includes("do not have access");
      const isOverloaded = err?.status === 503 || err?.status === 500;

      if (isRateLimit) {
        console.warn(
          `[Groq Failover] Rate limit hit on ${model}. Switching to alternate model...`
        );
        markModelCooldown(model, 60000); // 60s cooldown
      } else if (isNotFound) {
        console.warn(
          `[Groq Failover] Model ${model} not enabled on this API key. Deprioritizing...`
        );
        markModelCooldown(model, 24 * 3600 * 1000); // 24h cooldown
      } else if (isOverloaded) {
        console.warn(
          `[Groq Failover] Service unavailable on ${model}. Trying next alternate model...`
        );
        markModelCooldown(model, 30000);
      } else {
        console.warn(
          `[Groq Failover] Error on ${model}: ${errMsg}. Attempting failover to alternate model...`
        );
      }
    }
  }

  throw new Error(formatGroqError(lastError));
}

export function formatGroqError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("Invalid API Key")) {
      return (
        "Groq API Authentication Error: Invalid API key. " +
        "Please get a free API key from https://console.groq.com/keys and add GROQ_API_KEY=gsk_... in .env.local."
      );
    }
    if (msg.includes("429") || msg.includes("rate_limit")) {
      return "All Groq model rate limits reached. Please wait a few seconds and try again.";
    }
    return msg;
  }
  return "Unknown error contacting Groq API";
}
