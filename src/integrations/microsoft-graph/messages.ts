import { graphRequest } from "@/integrations/microsoft-graph/client";
import {
  GraphMessage,
} from "@/integrations/microsoft-graph/types";

const MESSAGE_SELECT_FIELDS = [
    "id",
    "subject",
    "sender",
    "receivedDateTime",
    "webLink",
    "bodyPreview",
].join(",")

export async function fetchMessages(
    receivedSince: Date,
    pageSize = 50
): Promise<GraphMessage[]> {
    const messages: GraphMessage[] = []

    const params = new URLSearchParams({
        "$top": String(pageSize),
        "$select": MESSAGE_SELECT_FIELDS,
        "$orderby": "receivedDateTime desc",
        "$filter": `receivedDateTime ge ${receivedSince.toISOString()}`
    })

    let response = await graphRequest(
        `/me/messages?${params.toString()}`
    )

    messages.push(...response.value)

    while (response["@odata.nextLink"]) {
        response = await graphRequest(response["@odata.nextLink"])
        messages.push(...response.value)
    }

    return messages
}
