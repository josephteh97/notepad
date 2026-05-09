import { useNavigate, useLocation } from 'react-router-dom'
import { X, BookOpen, Bell, Calendar, Settings } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { path: '/', icon: <BookOpen size={18} />, label: '我的笔记' },
  { path: '/reminders', icon: <Bell size={18} />, label: '提醒' },
  { path: '/calendar', icon: <Calendar size={18} />, label: '日历' },
  { path: '/settings', icon: <Settings size={18} />, label: '设置' },
]

export function Drawer({ open, onClose }: DrawerProps) {
  const navigate = useNavigate()
  const location = useLocation()

  function go(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div
        className={`
          fixed left-0 top-0 bottom-0 z-50 w-72
          bg-white dark:bg-slate-900
          shadow-2xl flex flex-col
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-safe pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">Notepad</span>
          <button onClick={onClose} className="p-1">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3">
          {NAV_ITEMS.map((item) => {
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={`
                  w-full flex items-center gap-4 px-5 py-3 text-sm
                  ${active
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <span className={active ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Version */}
        <div className="px-5 pb-safe pb-4 text-xs text-slate-400">v3.0.0</div>
      </div>
    </>
  )
}
