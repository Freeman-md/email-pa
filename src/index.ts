import config from "./config.js";
import {
  getLastSuccessfulRunAt,
  setLastSuccessfulRunAt,
} from "./services/run-state.js";

const runId = crypto.randomUUID();
const startedAt = new Date();

const { lookbackHours } = config();
const lastSuccessfulRunAt = await getLastSuccessfulRunAt();

console.log("Email status updater started", {
  runId,
  startedAt: startedAt.toISOString(),
  lookbackHours,
  lastSuccessfulRunAt,
});

console.log("Pretending to fetch emails", {
  runId,
  emailsFetched: 0,
});

await setLastSuccessfulRunAt(new Date());

console.log("Email status updater finished", {
  runId,
  finishedAt: new Date().toISOString(),
  emailsProcessed: 0,
});
