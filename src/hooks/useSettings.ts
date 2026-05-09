import { useLiveQuery } from 'dexie-react-hooks'
import { getSetting, setSetting, db } from '../db'

export function useSetting<T>(key: string, defaultValue: T): T {
  const value = useLiveQuery(
    () => getSetting<T>(key),
    [key]
  )
  return value !== undefined ? value : defaultValue
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  await setSetting(key, value)
}

export function useAllSettings() {
  return useLiveQuery(() => db.settings.toArray())
}
