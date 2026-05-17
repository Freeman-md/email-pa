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
    microsoftGraphScopes: microsoftGraphScopes.split(" ")
  };
}
