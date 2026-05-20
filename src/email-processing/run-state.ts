import config from "@/app/env";
import {
  getSetting,
  setSetting,
} from "@/integrations/airtable/tables/app-settings";

export async function getLastSuccessfulRunAt() {
  const { lastSuccessfulRunKey } = config();
  return getSetting(lastSuccessfulRunKey);
}

export async function setLastSuccessfulRunAt(date: Date) {
  const { lastSuccessfulRunKey } = config();
  return setSetting(lastSuccessfulRunKey, date.toISOString());
}
