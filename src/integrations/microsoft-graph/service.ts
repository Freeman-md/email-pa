import { graphRequest } from "@/integrations/microsoft-graph/client";
import { GraphEmail } from "@/shared/types";

const MESSAGE_SELECT_FIELDS = [
    "id",
    "subject",
    "sender",
    "receivedDateTime",
    "webLink",
    "bodyPreview",
]

const FULL_MESSAGE_SELECT_FIELDS = [
    ...MESSAGE_SELECT_FIELDS,
    "body",
]

export async function fetchEmails(
    receivedSince: Date,
    pageSize = 50
): Promise<GraphEmail[]> {
    const emails: GraphEmail[] = []

    const params = new URLSearchParams({
        "$top": String(pageSize),
        "$select": MESSAGE_SELECT_FIELDS.join(','),
        "$orderby": "receivedDateTime desc",
        "$filter": `receivedDateTime ge ${receivedSince.toISOString()}`
    })

    let response = await graphRequest(
        `/me/messages?${params.toString()}`
    )

    emails.push(...response.value)

    while (response["@odata.nextLink"]) {
        response = await graphRequest(response["@odata.nextLink"])
        emails.push(...response.value)
    }

    return emails
}

export async function fetchEmailWithBody(
    messageId: string
): Promise<GraphEmail> {
    const params = new URLSearchParams({
        "$select": FULL_MESSAGE_SELECT_FIELDS.join(','),
    })

    return graphRequest(
        `/me/messages/${encodeURIComponent(messageId)}?${params.toString()}`
    )
}

export async function markEmailAsRead(messageId: string) {
    return graphRequest(`/me/messages/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
            isRead: true
        })
    })
}

export async function markEmailAsUnread(messageId: string) {
    return graphRequest(`/me/messages/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
            isRead: false
        })
    })
}