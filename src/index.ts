import { runEmailProcessing } from "@/modules/email-processing/main";

try {
  await runEmailProcessing();
} catch (error) {
  console.error("Email status updater failed", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}
