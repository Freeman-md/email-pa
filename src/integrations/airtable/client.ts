import { getAirtableConfig } from "@/config/airtable";
import {
    AirtableMultiRecordsResponse,
    AirtableSingleRecordResponse,
} from "@/shared/types";

export default async function airtableRequest(path: string, options: RequestInit = {}) {
    const { apiUrl, baseId, token } = getAirtableConfig()

    const response = await fetch(`${apiUrl}/${baseId}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
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

export async function createRecord<T extends Record<string, unknown>>(
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


export async function deleteRecord<T extends Record<string, unknown>>(
    tableName: string, 
    recordId: string
): Promise<AirtableSingleRecordResponse<T>> {
  return airtableRequest(
    `/${encodeURIComponent(tableName)}/${recordId}`,
    {
      method: "DELETE",
    }
  );
}