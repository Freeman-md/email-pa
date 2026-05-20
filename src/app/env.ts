import "dotenv/config";

export default function config() {
  const lookbackHours = process.env.LOOKBACK_HOURS ?? "24";

  const airtableToken = process.env.AIRTABLE_TOKEN;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableApiUrl =
    process.env.AIRTABLE_API_URL ?? "https://api.airtable.com/v0";

  const microsoftClientId = process.env.MICROSOFT_CLIENT_ID;
  const microsoftTenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';
  const microsoftGraphScopes = process.env.MICROSOFT_GRAPH_SCOPES ?? "User.Read Mail.Read offline_access"

  const lastSuccessfulRunKey =
    process.env.LAST_SUCCESSFUL_RUN_KEY ?? "last_successful_run_at";

  const microsoftTokenCacheKey =
    process.env.MICROSOFT_TOKEN_CACHE_KEY ?? "microsoft_msal_token_cache";

  const aiModel = process.env.AI_MODEL ?? "openai/gpt-5.4-mini";
  const aiClassificationModel = process.env.AI_CLASSIFICATION_MODEL ?? "openai/gpt-5.4-mini";
  const aiClassificationConcurrency = Number(process.env.AI_CLASSIFICATION_CONCURRENCY ?? "2");
  const aiClassificationMaxOutputTokens = Number(
    process.env.AI_CLASSIFICATION_MAX_OUTPUT_TOKENS ?? "300"
  );
  const aiRetryMaxRetries = Number(
  process.env.AI_RETRY_MAX_RETRIES ?? "4"
);

const aiRetryBaseDelayMs = Number(
  process.env.AI_RETRY_BASE_DELAY_MS ?? "1500"
);

  if (!airtableToken) {
    throw new Error("Missing AIRTABLE_TOKEN");
  }

  if (!airtableBaseId) {
    throw new Error("Missing AIRTABLE_BASE_ID");
  }

  if (!microsoftClientId) {
    throw new Error("Missing MICROSOFT_CLIENT_ID");
  }

  return {
    lookbackHours,
    airtableApiUrl,
    airtableToken,
    airtableBaseId,
    microsoftClientId,
    microsoftTenantId,
    microsoftGraphScopes: microsoftGraphScopes.split(" "),
    lastSuccessfulRunKey,
    microsoftTokenCacheKey,
    aiModel,
    aiClassificationModel,
    aiClassificationConcurrency,
    aiClassificationMaxOutputTokens,
    aiRetryMaxRetries,
aiRetryBaseDelayMs,
  };
}
