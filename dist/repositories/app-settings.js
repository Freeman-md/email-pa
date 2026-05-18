import { createRecords, listRecords, updateRecord } from "#/services/airtable";
const APP_SETTINGS_TABLE = "App Settings";
async function findSettingByKey(key) {
    const formula = encodeURIComponent(`{Key}='${key}'`);
    const response = await listRecords(APP_SETTINGS_TABLE, `?filterByFormula=${formula}&maxRecords=1`);
    return response.records[0] ?? null;
}
export async function getSetting(key) {
    const record = await findSettingByKey(key);
    if (!record) {
        return null;
    }
    return record.fields.Value ?? null;
}
export async function setSetting(key, value) {
    const existingRecord = await findSettingByKey(key);
    const fields = {
        Key: key,
        Value: value,
    };
    if (existingRecord) {
        return updateRecord(APP_SETTINGS_TABLE, existingRecord.id, fields);
    }
    return createRecords(APP_SETTINGS_TABLE, fields);
}
