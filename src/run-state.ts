import config from "@/config";
import { getSetting, setSetting } from "@/repositories/app-settings";

export async function getLastSuccessfulRunAt() {
  const { lastSuccessfulRunKey } = config();

  return getSetting(lastSuccessfulRunKey);
}

export async function setLastSuccessfulRunAt(date: Date) {
  const { lastSuccessfulRunKey } = config();

  return setSetting(lastSuccessfulRunKey, date.toISOString());
}

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
    ? new Date(new Date(lastSuccessfulRunAt).getTime() - overlapMinutes * 60 * 1000)
    : new Date(startedAt.getTime() - defaultLookbackMs);
}
