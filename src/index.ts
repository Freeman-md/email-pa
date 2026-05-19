import { runEmailStatusUpdater } from "@/jobs/email-status-updater";

try {
  await runEmailStatusUpdater();
} catch (error) {
  console.error("Email status updater failed", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}
