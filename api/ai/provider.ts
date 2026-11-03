import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createTranslationProvider() {
  const baseURL = process.env.KIMI_AGENTGW_BASE_URL;
  const apiKey = process.env.KIMI_AGENTGW_API_KEY;
  if (!baseURL || !apiKey) return null;

  return createOpenAICompatible({
    name: "kimi-gw",
    baseURL,
    apiKey,
    includeUsage: true,
    supportsStructuredOutputs: true,
  });
}
