import config from "@/env";
import { getSetting, setSetting } from "../integrations/airtable/app-settings.repository";

export function calculateRunWindow({
    startedAt,
    lastSuccessfulRunAt,
    lookbackHours,
    overlapMinutes,
}: {
    startedAt: Date;
    lastSuccessfulRunAt: string | null;
    lookbackHours: string;
    overlapMinutes: number;
}) {
    const defaultLookbackMs = Number(lookbackHours) * 60 * 60 * 1000;

    return lastSuccessfulRunAt
        ? new Date(
            new Date(lastSuccessfulRunAt).getTime() - overlapMinutes * 60 * 1000
        )
        : new Date(startedAt.getTime() - defaultLookbackMs);
}

export async function getLastSuccessfulRunAt() {
    const { lastSuccessfulRunKey } = config();
    return getSetting(lastSuccessfulRunKey);
}

export async function setLastSuccessfulRunAt(date: Date) {
    const { lastSuccessfulRunKey } = config();
    return setSetting(lastSuccessfulRunKey, date.toISOString());
}