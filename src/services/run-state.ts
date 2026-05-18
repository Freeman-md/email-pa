import config from "#/config.js";
import { getSetting, setSetting } from "#/repositories/app-settings";

export async function getLastSuccessfulRunAt() {
    const { lastSuccessfulRunKey } = config();

  return getSetting(lastSuccessfulRunKey);
}

export async function setLastSuccessfulRunAt(date: Date) {
  const { lastSuccessfulRunKey } = config();

  return setSetting(lastSuccessfulRunKey, date.toISOString());
}
