/**
 * JS bridge to the native MigrationPlugin Kotlin plugin.
 * On web this always returns safe no-op values.
 */
import { registerPlugin } from '@capacitor/core'

export interface MigrationPluginInterface {
  isDone(): Promise<{ value: boolean }>
  readV2Notes(): Promise<{ value: string | null }>
  markDone(): Promise<void>
}

export const MigrationPlugin = registerPlugin<MigrationPluginInterface>('MigrationPlugin', {
  web: {
    isDone: async () => ({ value: true }),
    readV2Notes: async () => ({ value: null }),
    markDone: async () => {},
  },
})
