import { numberFromEnv, optional, required } from "@/config/helpers";

export function getAiConfig() {
    const defaultModel = optional("DEFAULT_AI_MODEL", "gpt-4.1-mini")!;

    return {
        apiKey: required("OPENAI_API_KEY"),
        defaultModel,
        classification: {
            model: defaultModel,
            temperature: 0,
            retry: {
                maxRetries: numberFromEnv("AI_RETRY_MAX_RETRIES", 4),
                baseDelayMs: numberFromEnv("AI_RETRY_BASE_DELAY_MS", 1500),
            },
        },
    };
}
