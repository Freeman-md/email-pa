import { createRecord, listRecords, updateRecord } from "@/integrations/airtable/client";
import { AppSetting } from "@/shared/types";

const APP_SETTINGS_TABLE = "App Settings";

async function findSettingByKey(key: string) {
  const formula = encodeURIComponent(`{Key}='${key}'`);

  const response = await listRecords<AppSetting>(
    APP_SETTINGS_TABLE,
    `?filterByFormula=${formula}&maxRecords=1`
  );

  return response.records[0] ?? null;
}

export async function getSetting(key: string) {
  const record = await findSettingByKey(key);

  if (!record) {
    return null;
  }

  return record.fields.Value ?? null;
}

export async function setSetting(key: string, value: string) {
  const existingRecord = await findSettingByKey(key);

  const fields = {
    Key: key,
    Value: value,
  };

  if (existingRecord) {
    return updateRecord<AppSetting>(
      APP_SETTINGS_TABLE,
      existingRecord.id,
      fields
    );
  }

  return createRecord<AppSetting>(APP_SETTINGS_TABLE, fields);
}
