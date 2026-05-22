import { getSetting, setSetting } from "../integrations/airtable/app-settings.repository";
import { getEmailProcessingConfig } from "@/config/email-processing";

const OVERLAP_MINUTES = 10;

export async function setLastSuccessfulRunAt(date: Date) {
    const { lastSuccessfulRunKey } = getEmailProcessingConfig();
    return setSetting(lastSuccessfulRunKey, date.toISOString());
}

export async function initializeRun() {
    const runId = crypto.randomUUID();
    const startedAt = new Date();

    const { lookbackHours, lastSuccessfulRunKey } = getEmailProcessingConfig();
    const lastSuccessfulRunAt = await getSetting(lastSuccessfulRunKey)

    const defaultLookbackMs = Number(lookbackHours) * 60 * 60 * 1000;

    const windowStart = lastSuccessfulRunAt
        ? new Date(
            new Date(lastSuccessfulRunAt).getTime() - OVERLAP_MINUTES * 60 * 1000
        )
        : new Date(startedAt.getTime() - defaultLookbackMs);

    return {
        runId,
        startedAt,
        lookbackHours,
        lastSuccessfulRunAt,
        windowStart
    }
}