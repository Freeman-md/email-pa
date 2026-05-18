import { getMicrosoftAccessToken } from "#/services/microsoft-graph/auth"

const GRAPH_API_URL = "https://graph.microsoft.com/v1.0"

export async function graphRequest(path: string) {
    const accessToken = await getMicrosoftAccessToken()

    const url = path.startsWith("https://")
        ? path
        : `${GRAPH_API_URL}${path}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })

    if (!response.ok) {
        throw new Error(`Graph request failed: ${response.status} ${await response.text()}`)
    }

    return response.json()
}
