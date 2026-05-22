import { optional, required } from "@/config/helpers";

export function getMicrosoftGraphConfig() {
  return {
    clientId: required("MICROSOFT_CLIENT_ID"),
    tenantId: optional("MICROSOFT_TENANT_ID", "common")!,
    scopes: optional(
      "MICROSOFT_GRAPH_SCOPES",
      "User.Read Mail.Read offline_access"
    )!.split(" "),
    tokenCacheKey: optional(
      "MICROSOFT_TOKEN_CACHE_KEY",
      "microsoft_msal_token_cache"
    )!,
  };
}