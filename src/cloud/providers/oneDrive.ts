import type { CloudProvider } from '../types'
import type { OAuthConfig, TokenSet } from '../oauth'
import {
  storeTokens, loadTokens, clearTokens,
  launchOAuthFlow, exchangeCodeForTokens, refreshAccessToken,
  getRedirectUri,
} from '../oauth'

// ⚠️ Replace with your Azure Portal Application (client) ID
const CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID ?? 'YOUR_AZURE_APP_CLIENT_ID'

const CONFIG: OAuthConfig = {
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  clientId: CLIENT_ID,
  scopes: ['Files.ReadWrite.AppFolder', 'offline_access', 'User.Read'],
  redirectUri: getRedirectUri(),
}

const GRAPH_API = 'https://graph.microsoft.com/v1.0'
const APP_FOLDER = 'special/approot'

export class OneDriveProvider implements CloudProvider {
  readonly name = 'onedrive' as const
  private tokens: TokenSet | null = null

  async authenticate(): Promise<void> {
    const { code } = await launchOAuthFlow(CONFIG)
    const tokens = await exchangeCodeForTokens(CONFIG, code)

    // Fetch user email
    let email: string | null = null
    try {
      const res = await fetch(`${GRAPH_API}/me?$select=mail,userPrincipalName`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      const data = await res.json()
      email = data.mail ?? data.userPrincipalName ?? null
    } catch { /* ignore */ }

    this.tokens = { ...tokens, email }
    await storeTokens('onedrive', this.tokens)
  }

  async signOut(): Promise<void> {
    this.tokens = null
    await clearTokens('onedrive')
  }

  isAuthenticated(): boolean {
    return this.tokens != null
  }

  async upload(filename: string, content: string): Promise<{ id: string; modifiedAt: number }> {
    const token = await this.getValidToken()
    const url = `${GRAPH_API}/me/${APP_FOLDER}:/${encodeURIComponent(filename)}:/content`
    const res = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: content,
    })
    const data = await res.json()
    return {
      id: data.id,
      modifiedAt: new Date(data.lastModifiedDateTime ?? Date.now()).getTime(),
    }
  }

  async download(filename: string): Promise<{ content: string; modifiedAt: number } | null> {
    const token = await this.getValidToken()
    try {
      // First get metadata to get download url
      const metaRes = await fetch(
        `${GRAPH_API}/me/${APP_FOLDER}:/${encodeURIComponent(filename)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (metaRes.status === 404) return null
      if (!metaRes.ok) throw new Error(`OneDrive metadata error: ${metaRes.status}`)
      const meta = await metaRes.json()
      const modifiedAt = new Date(meta.lastModifiedDateTime ?? Date.now()).getTime()

      const dlRes = await fetch(meta['@microsoft.graph.downloadUrl'])
      const content = await dlRes.text()
      return { content, modifiedAt }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('404')) return null
      throw err
    }
  }

  async list(): Promise<Array<{ name: string; id: string; modifiedAt: number }>> {
    const token = await this.getValidToken()
    const res = await this.fetchWithRetry(
      `${GRAPH_API}/me/${APP_FOLDER}/children?$select=id,name,lastModifiedDateTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return (data.value ?? []).map((f: { id: string; name: string; lastModifiedDateTime: string }) => ({
      id: f.id,
      name: f.name,
      modifiedAt: new Date(f.lastModifiedDateTime).getTime(),
    }))
  }

  async delete(filename: string): Promise<void> {
    const token = await this.getValidToken()
    await this.fetchWithRetry(
      `${GRAPH_API}/me/${APP_FOLDER}:/${encodeURIComponent(filename)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    )
  }

  private async getValidToken(): Promise<string> {
    if (!this.tokens) {
      this.tokens = await loadTokens('onedrive')
      if (!this.tokens) throw new Error('Not authenticated with OneDrive')
    }
    if (Date.now() >= this.tokens.expiresAt - 60_000) {
      this.tokens = await refreshAccessToken(CONFIG, this.tokens)
      await storeTokens('onedrive', this.tokens)
    }
    return this.tokens!.accessToken
  }

  private async fetchWithRetry(url: string, init: RequestInit, attempt = 0): Promise<Response> {
    const res = await fetch(url, init)
    if (res.status === 401 && attempt === 0) {
      const token = await this.getValidToken()
      const newInit = { ...init, headers: { ...init.headers as Record<string, string>, Authorization: `Bearer ${token}` } }
      return this.fetchWithRetry(url, newInit, 1)
    }
    if ((res.status === 403 || res.status === 429) && attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, delay))
      return this.fetchWithRetry(url, init, attempt + 1)
    }
    if (!res.ok && res.status !== 404) throw new Error(`OneDrive API error: ${res.status}`)
    return res
  }
}
