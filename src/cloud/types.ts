import type { AppSetting } from '../db/types'
import type { Note } from '../db/types'

export type CloudProviderName = 'google-drive' | 'onedrive'

export interface CloudProvider {
  name: CloudProviderName
  authenticate(): Promise<void>
  signOut(): Promise<void>
  isAuthenticated(): boolean
  upload(filename: string, content: string): Promise<{ id: string; modifiedAt: number }>
  download(filename: string): Promise<{ content: string; modifiedAt: number } | null>
  list(): Promise<Array<{ name: string; id: string; modifiedAt: number }>>
  delete(filename: string): Promise<void>
}

export interface CloudSnapshot {
  schemaVersion: number
  contentHash: string
  exportedAt: number
  notes: Note[]
  settings: AppSetting[]
  tombstones: Tombstone[]
}

export interface Tombstone {
  id: number
  deletedAt: number
}

export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'success'
  lastSyncAt: number | null
  error: string | null
  conflictCount: number
}

export interface TokenSet {
  accessToken: string
  refreshToken: string | null
  expiresAt: number   // epoch ms
  email: string | null
}
