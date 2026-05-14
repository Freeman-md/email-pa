import config from "./config";

const runId = crypto.randomUUID();
const startedAt = new Date();

const { lookbackHours } = config();

console.log("Email status updater started", {
  runId,
  startedAt: startedAt.toISOString(),
  lookbackHours,
});

console.log("Pretending to fetch emails", {
  runId,
  emailsFetched: 0,
});

console.log("Email status updater finished", {
  runId,
  finishedAt: new Date().toISOString(),
  emailsProcessed: 0,
});
