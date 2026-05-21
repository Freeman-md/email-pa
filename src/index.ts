import { runEmailProcessing } from "@/email-processing/workflow";

try {
  await runEmailProcessing();
} catch (error) {
  console.error("Email status updater failed", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}
