import { AccountInfo, Configuration, PublicClientApplication } from "@azure/msal-node";
import config from "@/config";
import { getSetting, setSetting } from "@/repositories/app-settings";


export async function getMicrosoftAccessToken() {
    const { microsoftClientId, microsoftTenantId, microsoftGraphScopes, microsoftTokenCacheKey } = config()

    const msalConfig: Configuration = {
        auth: {
            clientId: microsoftClientId,
            authority: `https://login.microsoftonline.com/${microsoftTenantId}`,
        }
    }

    const app = new PublicClientApplication(msalConfig)
    const tokenCache = app.getTokenCache();
    const cachedTokenCache = await getSetting(microsoftTokenCacheKey)

    if (cachedTokenCache) {
        tokenCache.deserialize(cachedTokenCache)
    }

    const accounts: AccountInfo[] = await tokenCache.getAllAccounts()
    const account = accounts[0]

    if (account) {
        try {
            const silentResult = await app.acquireTokenSilent({
                account,
                scopes: microsoftGraphScopes
            })

            await setSetting(microsoftTokenCacheKey, tokenCache.serialize())

            return silentResult.accessToken
        } catch (error) {
            console.warn("Silent Microsoft auth failed; falling back to device-code login", {
                error: error instanceof Error ? error.message : String(error)
            })
        }
    }

    const result = await app.acquireTokenByDeviceCode({
        scopes: microsoftGraphScopes,
        deviceCodeCallback: (response) => {
            console.log(response.message)
        }
    })

    if (!result?.accessToken) {
        throw new Error('Failed to get Microsoft Graph access token')
    }

    await setSetting(microsoftTokenCacheKey, tokenCache.serialize());

    return result.accessToken
}
