import { getSetting, setSetting } from "../repositories/app-settings.js";
const LAST_SUCCESSFUL_RUN_KEY = "last_successful_run_at";
export async function getLastSuccessfulRunAt() {
    return getSetting(LAST_SUCCESSFUL_RUN_KEY);
}
export async function setLastSuccessfulRunAt(date) {
    return setSetting(LAST_SUCCESSFUL_RUN_KEY, date.toISOString());
}
