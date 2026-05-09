import type { CloudProvider } from './types'
import { GoogleDriveProvider } from './providers/googleDrive'
import { OneDriveProvider } from './providers/oneDrive'
import { getSetting } from '../db'

let activeProvider: CloudProvider | null = null

/** Returns the active provider instance, loading tokens from storage */
export async function getProvider(): Promise<CloudProvider | null> {
  const name = await getSetting<string>('cloudProvider')
  if (!name) return null

  if (!activeProvider || activeProvider.name !== name) {
    if (name === 'google-drive') {
      activeProvider = new GoogleDriveProvider()
    } else if (name === 'onedrive') {
      activeProvider = new OneDriveProvider()
    } else {
      return null
    }
  }

  // Ensure tokens are loaded (isAuthenticated checks in-memory state)
  // Providers load tokens lazily in getValidToken()
  return activeProvider
}

export function setActiveProvider(provider: CloudProvider | null) {
  activeProvider = provider
}

export { GoogleDriveProvider, OneDriveProvider }
