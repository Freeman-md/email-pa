import { numberFromEnv, optional } from "@/config/helpers";

export function getAiConfig() {
    const model = optional("AI_MODEL", "openai/gpt-5.4-mini")!;
    const classificationModel = optional(
        "AI_CLASSIFICATION_MODEL",
        model
    )!;

    return {
        defaultModel: model,
        classification: {
            model: classificationModel,
            temperature: 0,
            maxOutputTokens: numberFromEnv(
                "AI_CLASSIFICATION_MAX_OUTPUT_TOKENS",
                300
            ),
            concurrency: numberFromEnv("AI_CLASSIFICATION_CONCURRENCY", 2),
            retry: {
                maxRetries: numberFromEnv("AI_RETRY_MAX_RETRIES", 4),
                baseDelayMs: numberFromEnv("AI_RETRY_BASE_DELAY_MS", 1500),
            },
        },
    };
}