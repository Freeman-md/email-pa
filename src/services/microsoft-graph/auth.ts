import { Configuration, PublicClientApplication } from "@azure/msal-node";
import config from "../../config.js";


export async function getMicrosoftAccessToken() {
    const { microsoftClientId, microsoftTenantId, microsoftGraphScopes } = config()

    const msalConfig: Configuration = {
        auth: {
            clientId: microsoftClientId,
            authority: `https://login.microsoftonline.com/${microsoftTenantId}`,
        }
    }

    const app = new PublicClientApplication(msalConfig)

    const result = await app.acquireTokenByDeviceCode({
        scopes: microsoftGraphScopes,
        deviceCodeCallback: (response) => {
            console.log(response.message)
        }
    })

    if (!result?.accessToken) {
        throw new Error('Failed to get Microsoft Graph access token')
    }

    return result.accessToken
}