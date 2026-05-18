import config from "#/config";
import {
  logFetchedEmails,
  logRunFinished,
  logRunStarted,
} from "#/logging";
import { getAllMessagesReceivedSince } from "#/services/microsoft-graph/messages";
import {
  calculateRunWindow,
  getLastSuccessfulRunAt,
  setLastSuccessfulRunAt,
} from "#/run-state";

const OVERLAP_MINUTES = 10;

export async function runEmailStatusUpdater() {
  const runId = crypto.randomUUID();
  const startedAt = new Date();

  const { lookbackHours } = config();
  const lastSuccessfulRunAt = await getLastSuccessfulRunAt();
  const windowStart = calculateRunWindow({
    startedAt,
    lastSuccessfulRunAt,
    lookbackHours,
    overlapMinutes: OVERLAP_MINUTES,
  });

  logRunStarted({
    runId,
    startedAt,
    lookbackHours,
    lastSuccessfulRunAt,
    windowStart,
  });

  const messages = await getAllMessagesReceivedSince(windowStart);

  logFetchedEmails(runId, messages);

  await setLastSuccessfulRunAt(new Date());

  logRunFinished(runId);
}
