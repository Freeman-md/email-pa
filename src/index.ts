import config from "#/config";
import { getAllMessagesReceivedSince, getMessagesReceivedSince } from "#/services/microsoft-graph/messages";
import {
  getLastSuccessfulRunAt,
  setLastSuccessfulRunAt,
} from "#/services/run-state";
import { GraphMessage } from "#/types";

const runId = crypto.randomUUID();
const startedAt = new Date();

const { lookbackHours } = config();
const lastSuccessfulRunAt = await getLastSuccessfulRunAt();

const overlapMinutes = 10;
const defaultLookbackMs = Number(lookbackHours) * 60 * 60 * 1000;
const windowStart = lastSuccessfulRunAt
  ? new Date(new Date(lastSuccessfulRunAt).getTime() - overlapMinutes * 60 * 1000)
  : new Date(startedAt.getTime() - defaultLookbackMs);


console.log("Email status updater started", {
  runId,
  startedAt: startedAt.toISOString(),
  lookbackHours,
  lastSuccessfulRunAt,
  windowStart: windowStart.toISOString(),
});

const messages = await getAllMessagesReceivedSince(windowStart);

console.log("Fetched windowed emails", {
  runId,
  count: messages.length,
  emails: messages.map((message: GraphMessage) => ({
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
