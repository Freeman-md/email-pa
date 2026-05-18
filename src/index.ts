import config from "#/config";
import { getLatestMessages } from "#/services/microsoft-graph/messages";
import {
  getLastSuccessfulRunAt,
  setLastSuccessfulRunAt,
} from "#/services/run-state";
import { GraphMessage } from "#/types";

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

const messages = await getLatestMessages(5);

console.log("Fetched latest emails", {
  runId,
  count: messages.value.length,
  emails: messages.value.map((message: GraphMessage) => ({
    subject: message.subject,
    from: message.sender?.emailAddress?.address,
    receivedDateTime: message.receivedDateTime,
    webLink: message.webLink,
    bodyPreview: message.bodyPreview
  })),
});


await setLastSuccessfulRunAt(new Date());

console.log("Email status updater finished", {
  runId,
  finishedAt: new Date().toISOString(),
  emailsProcessed: 0,
});
