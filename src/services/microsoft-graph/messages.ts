import { graphRequest } from "#/services/microsoft-graph/client"
import { GraphMessage, GraphMessagesResponse } from "#/types.js"

const MESSAGE_SELECT_FIELDS = [
    "id",
    "subject",
    "sender",
    "receivedDateTime",
    "webLink",
    "bodyPreview",
].join(",")

export async function getLatestMessages(limit = 5): Promise<GraphMessagesResponse> {
    const params = new URLSearchParams({
        "$top": String(limit),
        "$select": MESSAGE_SELECT_FIELDS,
        "$orderby": "receivedDateTime desc"
    })

    return graphRequest(
        `/me/messages?${params.toString()}`
    )
}

export async function getMessagesReceivedSince(receivedSince: Date, limit = 50): Promise<GraphMessagesResponse> {
    const params = new URLSearchParams({
        "$top": String(limit),
        "$select": MESSAGE_SELECT_FIELDS,
        "$orderby": "receivedDateTime desc",
        "$filter": `receivedDateTime ge ${receivedSince.toISOString()}`
    })

    return graphRequest(
        `/me/messages?${params.toString()}`
    )
}

export async function getAllMessagesReceivedSince(
    receivedSince: Date,
    pageSize = 50
): Promise<GraphMessage[]> {
    const messages: GraphMessage[] = []
    let response = await getMessagesReceivedSince(receivedSince, pageSize)

    messages.push(...response.value)

    while (response["@odata.nextLink"]) {
        response = await graphRequest(response["@odata.nextLink"])
        messages.push(...response.value)
    }

    return messages
}
