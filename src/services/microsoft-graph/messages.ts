import { graphRequest } from "#/services/microsoft-graph/client"

export async function getLatestMessages(limit = 5) {
    const select = [
        "id", 
        "subject",
        "sender",
        "receivedDateTime",
        "webLink",
        "bodyPreview",
    ].join(",")

    return graphRequest(
        `/me/messages?$top=${limit}&$select=${select}&$orderby=receivedDateTime desc`
    )
}
