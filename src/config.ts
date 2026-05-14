export default function config() {
  const lookbackHours = process.env.LOOKBACK_HOURS ?? "24";

  const airtableToken = process.env.AIRTABLE_TOKEN;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableApiUrl =
    process.env.AIRTABLE_API_URL ?? "https://api.airtable.com/v0";

  if (!airtableToken) {
    throw new Error("Missing AIRTABLE_TOKEN");
  }

  if (!airtableBaseId) {
    throw new Error("Missing AIRTABLE_BASE_ID");
  }

  return {
    lookbackHours,
    airtableApiUrl,
    airtableToken,
    airtableBaseId,
  };
}
