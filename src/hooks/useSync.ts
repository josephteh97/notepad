import { useState, useEffect, useRef, useCallback } from 'react'
import { Network } from '@capacitor/network'
import { getSetting, setSetting } from '../db'
import { getProvider } from '../cloud'
import { runSync } from '../cloud/syncEngine'
import { showToast } from '../utils/toast'
import type { SyncState } from '../cloud/types'

const DEBOUNCE_MS = 2 * 60 * 1000  // 2 minutes

export function useSync() {
  const [state, setState] = useState<SyncState>({
    status: 'idle',
    lastSyncAt: null,
    error: null,
    conflictCount: 0,
  })
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sync = useCallback(async () => {
    const provider = await getProvider()
    if (!provider) return

    setState((s) => ({ ...s, status: 'syncing' }))
    const result = await runSync(provider)
    const lastSyncAt = Date.now()

    if (result.success) {
      await setSetting('lastSyncAt', lastSyncAt)
      setState({
        status: 'success',
        lastSyncAt,
        error: null,
        conflictCount: result.conflictCount,
      })
      if (result.conflictCount > 0) {
        showToast(`已同步 — ${result.conflictCount} 处冲突，保留最新版本`, 'info')
      }
    } else {
      setState((s) => ({ ...s, status: 'error', error: result.error }))
      showToast(`同步失败: ${result.error}`, 'error')
    }
  }, [])

  // Load last sync time from settings
  useEffect(() => {
    getSetting<number>('lastSyncAt').then((t) => {
      if (t) setState((s) => ({ ...s, lastSyncAt: t }))
    })
  }, [])

  // Sync on mount (app start)
  useEffect(() => {
    sync()
  }, [sync])

  // Sync on network reconnect
  useEffect(() => {
    let handle: { remove: () => void } | null = null
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        sync()
      }
    }).then((h) => { handle = h })
    return () => { handle?.remove() }
  }, [sync])

  // Sync on page visibility restore (e.g., user switches back to app)
  useEffect(() => {
    function onVisible() {
      if (!document.hidden) sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [sync])

  /** Call this after local changes to schedule a debounced sync */
  function scheduleSync() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(sync, DEBOUNCE_MS)
  }

  return { state, syncNow: sync, scheduleSync }
}
