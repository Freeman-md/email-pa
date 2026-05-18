import config from "#/config";
export default async function airtableRequest(path, options = {}) {
    const { airtableApiUrl, airtableBaseId, airtableToken } = config();
    const response = await fetch(`${airtableApiUrl}/${airtableBaseId}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${airtableToken}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });
    if (!response.ok) {
        throw new Error(`Airtable request failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
}
export async function listRecords(tableName, query = "") {
    return airtableRequest(`/${encodeURIComponent(tableName)}${query}`);
}
export async function getRecord(tableName, recordId) {
    return airtableRequest(`/${encodeURIComponent(tableName)}/${recordId}`);
}
export async function createRecords(tableName, fields) {
    return airtableRequest(`/${encodeURIComponent(tableName)}`, {
        method: "POST",
        body: JSON.stringify({
            records: [{ fields }]
        })
    });
}
export async function updateRecord(tableName, recordId, fields) {
    return airtableRequest(`/${encodeURIComponent(tableName)}/${recordId}`, {
        method: "PATCH",
        body: JSON.stringify({ fields })
    });
}
