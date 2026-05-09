import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import type { CloudProviderName, TokenSet } from './types'

export type { TokenSet }

// ─── PKCE Helpers ────────────────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── Token Storage ───────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'notepad_token_'

export async function storeTokens(provider: CloudProviderName, tokens: TokenSet): Promise<void> {
  const key = STORAGE_KEY_PREFIX + provider
  if (Capacitor.isNativePlatform()) {
    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
      await SecureStorage.set(key, JSON.stringify(tokens))
      return
    } catch {
      // Fall through to localStorage
    }
  }
  localStorage.setItem(key, JSON.stringify(tokens))
}

export async function loadTokens(provider: CloudProviderName): Promise<TokenSet | null> {
  const key = STORAGE_KEY_PREFIX + provider
  if (Capacitor.isNativePlatform()) {
    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await SecureStorage.get(key)
      const val = result?.value ?? result?.data ?? null
      if (val) return JSON.parse(val) as TokenSet
    } catch {
      // Fall through to localStorage
    }
  }
  const raw = localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as TokenSet) : null
}

export async function clearTokens(provider: CloudProviderName): Promise<void> {
  const key = STORAGE_KEY_PREFIX + provider
  if (Capacitor.isNativePlatform()) {
    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
      await SecureStorage.remove(key)
    } catch { /* ignore */ }
  }
  localStorage.removeItem(key)
}

// ─── OAuth Flow (PKCE) ────────────────────────────────────────────────────────

export interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  clientId: string
  scopes: string[]
  redirectUri: string
}

export function getRedirectUri(): string {
  if (Capacitor.isNativePlatform()) {
    return 'com.cowork.notepad://oauth/callback'
  }
  return `${window.location.origin}/oauth/callback`
}

/**
 * Launches OAuth flow in-app browser (Capacitor) or popup (web).
 * Returns { code, state } from redirect URL.
 */
export async function launchOAuthFlow(config: OAuthConfig): Promise<{ code: string; state: string }> {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = generateState()

  // Persist verifier for token exchange
  sessionStorage.setItem('oauth_verifier', verifier)
  sessionStorage.setItem('oauth_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  const authUrl = `${config.authUrl}?${params.toString()}`

  if (Capacitor.isNativePlatform()) {
    return new Promise((resolve, reject) => {
      // Listen for deep link redirect
      const listener = App.addListener('appUrlOpen', (data) => {
        listener.then((h) => h.remove())
        try {
          const url = new URL(data.url)
          const code = url.searchParams.get('code')
          const returnedState = url.searchParams.get('state')
          if (!code) { reject(new Error('OAuth: no code in redirect')); return }
          resolve({ code, state: returnedState ?? '' })
        } catch (err) {
          reject(err)
        }
      })
      Browser.open({ url: authUrl, windowName: '_self' }).catch(reject)
    })
  }

  // Web: use redirect (handled by /oauth/callback route)
  window.location.href = authUrl
  // This will never resolve in web flow — page navigates away
  return new Promise(() => {})
}

/** Exchange authorization code for tokens */
export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  email: string | null = null,
): Promise<TokenSet> {
  const verifier = sessionStorage.getItem('oauth_verifier') ?? ''
  sessionStorage.removeItem('oauth_verifier')
  sessionStorage.removeItem('oauth_state')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: verifier,
  })

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const data = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    email,
  }
}

/** Refresh access token using refresh token */
export async function refreshAccessToken(
  config: OAuthConfig,
  tokens: TokenSet,
): Promise<TokenSet> {
  if (!tokens.refreshToken) throw new Error('No refresh token available')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: config.clientId,
  })

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const data = await res.json()

  return {
    ...tokens,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
  }
}
