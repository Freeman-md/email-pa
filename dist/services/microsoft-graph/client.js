import { getMicrosoftAccessToken } from "./auth.js";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";
export async function graphRequest(path) {
    const accessToken = await getMicrosoftAccessToken();
    const response = await fetch(`${GRAPH_API_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    if (!response.ok) {
        throw new Error(`Graph request failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
}
