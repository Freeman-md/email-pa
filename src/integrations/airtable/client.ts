import config from "@/env";
import {
    AirtableMultiRecordsResponse,
    AirtableSingleRecordResponse,
} from "@/integrations/airtable/types";

export default async function airtableRequest(path: string, options: RequestInit = {}) {
    const { airtableApiUrl, airtableBaseId, airtableToken } = config()

    const response = await fetch(`${airtableApiUrl}/${airtableBaseId}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${airtableToken}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    })

    if (!response.ok) {
        throw new Error(
            `Airtable request failed: ${response.status} ${await response.text()}`
        )
    }

    return response.json()
}

export async function listRecords<T extends Record<string, unknown>>(tableName: string, query = "")
    : Promise<AirtableMultiRecordsResponse<T>> {
    return airtableRequest(`/${encodeURIComponent(tableName)}${query}`)
}

export async function getRecord<T extends Record<string, unknown>>(
    tableName: string,
    recordId: string,
): Promise<AirtableSingleRecordResponse<T>> {
    return airtableRequest(`/${encodeURIComponent(tableName)}/${recordId}`)
}

export async function createRecords<T extends Record<string, unknown>>(
    tableName: string,
    fields: T
): Promise<AirtableMultiRecordsResponse<T>> {
    return airtableRequest(`/${encodeURIComponent(tableName)}`, {
        method: "POST",
        body: JSON.stringify({
            records: [{ fields }]
        })
    })
}

export async function updateRecord<T extends Record<string, unknown>>(
    tableName: string,
    recordId: string,
    fields: Partial<T>
): Promise<AirtableSingleRecordResponse<T>> {
    return airtableRequest(`/${encodeURIComponent(tableName)}/${recordId}`, {
        method: "PATCH",
        body: JSON.stringify({ fields })
    })
}
