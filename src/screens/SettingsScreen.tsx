import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Sun, Moon, Monitor, CloudOff } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../db/types'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: '浅色', icon: <Sun size={16} /> },
    { id: 'dark', label: '深色', icon: <Moon size={16} /> },
    { id: 'system', label: '跟随系统', icon: <Monitor size={16} /> },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">设置</span>
      </div>

      <div className="px-4 space-y-6">
        {/* Theme */}
        <Section title="外观">
          <div className="flex gap-2">
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

        {/* Cloud sync (Phase 3 — placeholder for now) */}
        <Section title="云同步">
          <div className="flex items-center gap-3 py-3 text-slate-500 dark:text-slate-400">
            <CloudOff size={20} />
            <div>
              <p className="text-sm font-medium">尚未连接</p>
              <p className="text-xs text-slate-400">连接 Google Drive 或 OneDrive 以同步笔记</p>
            </div>
          </div>
          <button
            disabled
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
          >
            连接云账户（即将推出）
          </button>
        </Section>

        {/* About */}
        <Section title="关于">
          <div className="flex items-center justify-between py-2 text-sm text-slate-700 dark:text-slate-300">
            <span>版本</span>
            <span className="text-slate-400">3.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm text-slate-700 dark:text-slate-300 border-t border-slate-50 dark:border-slate-800">
            <span>包名</span>
            <span className="text-slate-400 text-xs">com.cowork.notepad</span>
          </div>
        </Section>
      </div>
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
