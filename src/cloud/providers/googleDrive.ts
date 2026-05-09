import type { CloudProvider } from '../types'
import type { OAuthConfig, TokenSet } from '../oauth'
import {
  storeTokens, loadTokens, clearTokens,
  launchOAuthFlow, exchangeCodeForTokens, refreshAccessToken,
  getRedirectUri,
} from '../oauth'

// ⚠️ Replace with your Google Cloud Console OAuth 2.0 Client ID
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'

const CONFIG: OAuthConfig = {
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  clientId: CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  redirectUri: getRedirectUri(),
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export class GoogleDriveProvider implements CloudProvider {
  readonly name = 'google-drive' as const
  private tokens: TokenSet | null = null

  async authenticate(): Promise<void> {
    const { code } = await launchOAuthFlow(CONFIG)
    const tokens = await exchangeCodeForTokens(CONFIG, code)

    // Fetch user email
    let email: string | null = null
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      const data = await res.json()
      email = data.email ?? null
    } catch { /* ignore */ }

    this.tokens = { ...tokens, email }
    await storeTokens('google-drive', this.tokens)
  }

  async signOut(): Promise<void> {
    this.tokens = null
    await clearTokens('google-drive')
  }

  isAuthenticated(): boolean {
    return this.tokens != null
  }

  async upload(filename: string, content: string): Promise<{ id: string; modifiedAt: number }> {
    const token = await this.getValidToken()

    // Check if file exists to decide between create and update
    const existing = await this.findFile(filename)

    const metadata = { name: filename, parents: existing ? undefined : ['appDataFolder'] }
    const blob = new Blob([content], { type: 'application/json' })
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', blob)

    const url = existing
      ? `${UPLOAD_API}/files/${existing.id}?uploadType=multipart`
      : `${UPLOAD_API}/files?uploadType=multipart`
    const method = existing ? 'PATCH' : 'POST'

    const res = await this.fetchWithRetry(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })

    const data = await res.json()
    return { id: data.id, modifiedAt: new Date(data.modifiedTime ?? Date.now()).getTime() }
  }

  async download(filename: string): Promise<{ content: string; modifiedAt: number } | null> {
    const token = await this.getValidToken()
    const file = await this.findFile(filename)
    if (!file) return null

    const res = await this.fetchWithRetry(
      `${DRIVE_API}/files/${file.id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const content = await res.text()
    return { content, modifiedAt: file.modifiedAt }
  }

  async list(): Promise<Array<{ name: string; id: string; modifiedAt: number }>> {
    const token = await this.getValidToken()
    const res = await this.fetchWithRetry(
      `${DRIVE_API}/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return (data.files ?? []).map((f: { id: string; name: string; modifiedTime: string }) => ({
      id: f.id,
      name: f.name,
      modifiedAt: new Date(f.modifiedTime).getTime(),
    }))
  }

  async delete(filename: string): Promise<void> {
    const token = await this.getValidToken()
    const file = await this.findFile(filename)
    if (!file) return
    await this.fetchWithRetry(
      `${DRIVE_API}/files/${file.id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    )
  }

  private async findFile(filename: string): Promise<{ id: string; modifiedAt: number } | null> {
    const files = await this.list()
    const match = files.find((f) => f.name === filename)
    return match ? { id: match.id, modifiedAt: match.modifiedAt } : null
  }

  private async getValidToken(): Promise<string> {
    if (!this.tokens) {
      this.tokens = await loadTokens('google-drive')
      if (!this.tokens) throw new Error('Not authenticated with Google Drive')
    }
    if (Date.now() >= this.tokens.expiresAt - 60_000) {
      this.tokens = await refreshAccessToken(CONFIG, this.tokens)
      await storeTokens('google-drive', this.tokens)
    }
    return this.tokens!.accessToken
  }

  private async fetchWithRetry(url: string, init: RequestInit, attempt = 0): Promise<Response> {
    const res = await fetch(url, init)
    if (res.status === 401 && attempt === 0) {
      // Refresh and retry once
      const token = await this.getValidToken()
      const newInit = { ...init, headers: { ...init.headers as Record<string, string>, Authorization: `Bearer ${token}` } }
      return this.fetchWithRetry(url, newInit, 1)
    }
    if ((res.status === 403 || res.status === 429) && attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, delay))
      return this.fetchWithRetry(url, init, attempt + 1)
    }
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
    return res
  }
}
