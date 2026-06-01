import { AccountInfo, Configuration, PublicClientApplication } from "@azure/msal-node";
import { getSetting, setSetting } from "@/integrations/airtable/repositories/app-settings";
import { getMicrosoftGraphConfig } from "@/config/microsoft-graph";


export async function getMicrosoftAccessToken() {
    const { clientId, tenantId, scopes, tokenCacheKey } = getMicrosoftGraphConfig()

    const msalConfig: Configuration = {
        auth: {
            clientId: clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
        }
    }

    const app = new PublicClientApplication(msalConfig)
    const tokenCache = app.getTokenCache();
    const cachedTokenCache = await getSetting(tokenCacheKey)

    if (cachedTokenCache) {
        tokenCache.deserialize(cachedTokenCache)
    }

    const accounts: AccountInfo[] = await tokenCache.getAllAccounts()
    const account = accounts[0]

    if (account) {
        try {
            const silentResult = await app.acquireTokenSilent({
                account,
                scopes: scopes
            })

            await setSetting(tokenCacheKey, tokenCache.serialize())

            return silentResult.accessToken
        } catch (error) {
            console.warn("Silent Microsoft auth failed; falling back to device-code login", {
                error: error instanceof Error ? error.message : String(error)
            })
        }
    }

    const result = await app.acquireTokenByDeviceCode({
        scopes: scopes,
        deviceCodeCallback: (response) => {
            console.log(response.message)
        }
    })

    if (!result?.accessToken) {
        throw new Error('Failed to get Microsoft Graph access token')
    }

    await setSetting(tokenCacheKey, tokenCache.serialize());

    return result.accessToken
}
