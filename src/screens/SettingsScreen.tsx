import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Sun, Moon, Monitor, Cloud, CloudOff, RefreshCw, LogOut } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useSetting, saveSetting } from '../hooks/useSettings'
import { useSync } from '../hooks/useSync'
import { getSetting, setSetting } from '../db'
import { GoogleDriveProvider, OneDriveProvider, setActiveProvider } from '../cloud'
import { clearTokens } from '../cloud/oauth'
import { restoreFromCloud } from '../cloud/syncEngine'
import { getProvider } from '../cloud'
import { showToast } from '../utils/toast'
import { formatDate } from '../utils/date'
import type { Theme } from '../db/types'
import type { CloudProviderName } from '../cloud/types'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { state, syncNow } = useSync()
  const cloudProvider = useSetting<CloudProviderName | null>('cloudProvider', null)
  const autoSync = useSetting<boolean>('autoSync', true)
  const [connecting, setConnecting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [showProviderPicker, setShowProviderPicker] = useState(false)

  const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: '浅色', icon: <Sun size={16} /> },
    { id: 'dark', label: '深色', icon: <Moon size={16} /> },
    { id: 'system', label: '跟随系统', icon: <Monitor size={16} /> },
  ]

  async function connectProvider(name: CloudProviderName) {
    setConnecting(true)
    setShowProviderPicker(false)
    try {
      const provider = name === 'google-drive' ? new GoogleDriveProvider() : new OneDriveProvider()
      await provider.authenticate()
      setActiveProvider(provider)
      await setSetting('cloudProvider', name)
      await syncNow()
      showToast('云账户连接成功', 'success')
    } catch (err) {
      showToast(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error')
    } finally {
      setConnecting(false)
    }
  }

  async function signOut() {
    const name = await getSetting<CloudProviderName>('cloudProvider')
    if (name) await clearTokens(name)
    setActiveProvider(null)
    await setSetting('cloudProvider', null)
    showToast('已退出云账户')
  }

  async function handleRestore() {
    const confirmed = window.confirm('恢复后将用云端数据替换所有本地笔记，确认继续？')
    if (!confirmed) return
    setRestoring(true)
    try {
      const provider = await getProvider()
      if (!provider) { showToast('请先连接云账户', 'error'); return }
      await restoreFromCloud(provider)
      showToast('恢复成功', 'success')
    } catch (err) {
      showToast(`恢复失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error')
    } finally {
      setRestoring(false)
    }
  }

  const providerLabel = cloudProvider === 'google-drive' ? 'Google Drive' : cloudProvider === 'onedrive' ? 'OneDrive' : null

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">设置</span>
      </div>

      <div className="px-4 space-y-6 pb-8">
        {/* Theme */}
        <Section title="外观">
          <div className="flex gap-2 py-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`
                  flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs
                  ${theme === t.id
                    ? 'border-amber-400 text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'}
                `}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Cloud sync */}
        <Section title="云同步">
          {cloudProvider ? (
            <>
              {/* Connected state */}
              <div className="flex items-center gap-3 py-3">
                <Cloud size={20} className="text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{providerLabel}</p>
                  <p className="text-xs text-slate-400">
                    {state.lastSyncAt ? `上次同步: ${formatDate(state.lastSyncAt)}` : '尚未同步'}
                  </p>
                </div>
                {state.status === 'syncing' && (
                  <RefreshCw size={16} className="text-amber-400 animate-spin" />
                )}
              </div>

              <Row label="自动同步" border>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => saveSetting('autoSync', e.target.checked)}
                  className="accent-amber-400"
                />
              </Row>

              <button
                onClick={syncNow}
                disabled={state.status === 'syncing'}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-amber-400 text-white mt-2 disabled:opacity-50"
              >
                {state.status === 'syncing' ? '同步中…' : '立即同步'}
              </button>

              <button
                onClick={handleRestore}
                disabled={restoring}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-500 mt-2"
              >
                {restoring ? '恢复中…' : '从云端恢复（替换本地数据）'}
              </button>

              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-400 mt-1"
              >
                <LogOut size={14} />
                退出云账户
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 py-3 text-slate-500 dark:text-slate-400">
                <CloudOff size={20} />
                <div>
                  <p className="text-sm font-medium">尚未连接</p>
                  <p className="text-xs text-slate-400">连接后可在多设备同步，防止数据丢失</p>
                </div>
              </div>
              <button
                onClick={() => setShowProviderPicker(true)}
                disabled={connecting}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-amber-400 text-white mt-1 disabled:opacity-50"
              >
                {connecting ? '连接中…' : '连接云账户'}
              </button>
            </>
          )}
        </Section>

        {/* About */}
        <Section title="关于">
          <Row label="版本">
            <span className="text-slate-400 text-sm">3.0.0</span>
          </Row>
          <Row label="包名" border>
            <span className="text-slate-400 text-xs">com.cowork.notepad</span>
          </Row>
        </Section>
      </div>

      {/* Provider picker bottom sheet */}
      {showProviderPicker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowProviderPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 text-center mb-4">选择云服务</h3>
            <button
              onClick={() => connectProvider('google-drive')}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <Cloud size={18} className="text-blue-500" />
              Google Drive
              <span className="ml-auto text-xs text-slate-400">推荐</span>
            </button>
            <button
              onClick={() => connectProvider('onedrive')}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <Cloud size={18} className="text-blue-700" />
              Microsoft OneDrive
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-1 border border-slate-100 dark:border-slate-700">
        {children}
      </div>
    </div>
  )
}

function Row({ label, children, border }: { label: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 text-sm text-slate-700 dark:text-slate-300 ${border ? 'border-t border-slate-50 dark:border-slate-800' : ''}`}>
      <span>{label}</span>
      {children}
    </div>
  )
}
