import { getMicrosoftAccessToken } from "@/integrations/microsoft-graph/auth";

const GRAPH_API_URL = "https://graph.microsoft.com/v1.0"

export async function graphRequest(
    path: string,
    init: RequestInit = {}
) {
    const accessToken = await getMicrosoftAccessToken()

    const url = path.startsWith("https://")
        ? path
        : `${GRAPH_API_URL}${path}`;

    const response = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
        }
    })

    if (!response.ok) {
        throw new Error(`Graph request failed: ${response.status} ${await response.text()}`)
    }

    if (response.status === 204) {
        return null;
    }

    return response.json()
}
