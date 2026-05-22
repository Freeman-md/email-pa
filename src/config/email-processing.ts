import { optional } from "@/config/helpers";

export function getEmailProcessingConfig() {
  return {
    lookbackHours: optional("LOOKBACK_HOURS", "24")!,
    lastSuccessfulRunKey: optional(
      "LAST_SUCCESSFUL_RUN_KEY",
      "last_successful_run_at"
    )!,
  };
}