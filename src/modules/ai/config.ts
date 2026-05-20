import config from "@/env"


export function getAiConfig() {
    const {
        aiModel,
        aiClassificationModel,
        aiClassificationConcurrency,
        aiClassificationMaxOutputTokens,
        aiRetryMaxRetries,
        aiRetryBaseDelayMs,
    } = config()

    return {
        defaultModel: aiModel,
        classification: {
            model: aiClassificationModel,
            temperature: 0,
            maxOutputTokens: aiClassificationMaxOutputTokens,
            concurrency: aiClassificationConcurrency,
            retry: {
                maxRetries: aiRetryMaxRetries,
                baseDelayMs: aiRetryBaseDelayMs,
            },
        }
    }
}