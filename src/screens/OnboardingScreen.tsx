import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Cloud, Plus } from 'lucide-react'
import { GoogleDriveProvider, OneDriveProvider, setActiveProvider } from '../cloud'
import { restoreFromCloud } from '../cloud/syncEngine'
import { setSetting } from '../db'
import { showToast } from '../utils/toast'
import type { CloudProviderName } from '../cloud/types'

interface OnboardingScreenProps {
  onDone: () => void
}

type Step = 'welcome' | 'choose' | 'restoring'

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [restoring, setRestoring] = useState(false)

  async function startFresh() {
    await setSetting('onboardingDone', true)
    onDone()
  }

  async function restore(providerName: CloudProviderName) {
    setStep('restoring')
    setRestoring(true)
    try {
      const provider = providerName === 'google-drive' ? new GoogleDriveProvider() : new OneDriveProvider()
      await provider.authenticate()
      setActiveProvider(provider)
      await setSetting('cloudProvider', providerName)
      await restoreFromCloud(provider)
      await setSetting('onboardingDone', true)
      showToast('笔记已恢复', 'success')
      onDone()
    } catch (err) {
      showToast(`恢复失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error')
      setStep('choose')
    } finally {
      setRestoring(false)
    }
  }

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-900 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center mb-6">
          <BookOpen size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">欢迎使用 Notepad</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-10">
          快速记录想法、创建待办清单、设置提醒。支持云备份，永不丢失。
        </p>

        <div className="w-full space-y-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-left flex gap-3">
            <span className="text-2xl">📌</span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">置顶重要笔记</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">将最重要的笔记固定在顶部，一目了然</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-left flex gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">智能提醒</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">为笔记设置提醒，到时准时通知</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-left flex gap-3">
            <span className="text-2xl">☁️</span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">云端同步</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">通过 Google Drive 或 OneDrive 在多设备同步</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setStep('choose')}
          className="w-full py-3.5 rounded-2xl bg-amber-400 text-white font-semibold text-base mt-8"
        >
          开始使用
        </button>
      </div>
    )
  }

  if (step === 'restoring') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-900 gap-4">
        <Cloud size={40} className="text-amber-400 animate-pulse" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">正在从云端恢复笔记…</p>
      </div>
    )
  }

  // choose step
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-900 px-8 text-center">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">如何开始？</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">如果你之前使用过云同步，可以恢复你的笔记</p>

      <div className="w-full space-y-3">
        <button
          onClick={() => restore('google-drive')}
          disabled={restoring}
          className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 text-left"
        >
          <Cloud size={22} className="text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">从 Google Drive 恢复</p>
            <p className="text-xs text-slate-400">登录 Google 账户并恢复备份</p>
          </div>
        </button>

        <button
          onClick={() => restore('onedrive')}
          disabled={restoring}
          className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 text-left"
        >
          <Cloud size={22} className="text-blue-700 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">从 OneDrive 恢复</p>
            <p className="text-xs text-slate-400">登录 Microsoft 账户并恢复备份</p>
          </div>
        </button>

        <button
          onClick={startFresh}
          className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl bg-amber-400 text-white text-left"
        >
          <Plus size={22} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">全新开始</p>
            <p className="text-xs opacity-80">从空白笔记本开始</p>
          </div>
        </button>
      </div>

      <button onClick={() => navigate('/settings')} className="mt-4 text-xs text-slate-400">
        稍后在设置中连接云账户
      </button>
    </div>
  )
}
