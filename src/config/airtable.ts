import { optional, required } from "@/config/helpers";

export function getAirtableConfig() {
  return {
    token: required("AIRTABLE_TOKEN"),
    baseId: required("AIRTABLE_BASE_ID"),
    apiUrl: optional("AIRTABLE_API_URL", "https://api.airtable.com/v0")!,
  };
}