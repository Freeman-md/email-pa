import { optional, parseStringArrayEnv, required } from "@/config/helpers";

export function getAirtableConfig() {
  return {
    token: required("AIRTABLE_TOKEN"),
    baseId: required("AIRTABLE_BASE_ID"),
    apiUrl: optional("AIRTABLE_API_URL", "https://api.airtable.com/v0")!,
  };
}

export function getAirtableMcpConfig() {
  const serverUrl = required("AIRTABLE_MCP_SERVER_URL");
  const rawAllowedTools = optional("AIRTABLE_MCP_ALLOWED_TOOLS");
  const requireApproval = optional("AIRTABLE_MCP_REQUIRE_APPROVAL", "never");
  const authorization = required("AIRTABLE_MCP_AUTHORIZATION")

  return {
    serverUrl,
    allowedTools: parseStringArrayEnv(
      rawAllowedTools,
      "AIRTABLE_MCP_ALLOWED_TOOLS"
    ),
    requireApproval,
    authorization
  };
}
