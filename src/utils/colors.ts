import type { NoteColor } from '../db/types'

export const NOTE_COLORS: { id: NoteColor; label: string; bg: string; darkBg: string; dot: string }[] = [
  { id: 'default', label: '默认',  bg: 'bg-white',       darkBg: 'dark:bg-slate-800',   dot: 'bg-slate-300' },
  { id: 'red',     label: '红',    bg: 'bg-red-100',     darkBg: 'dark:bg-red-900/50',  dot: 'bg-red-400' },
  { id: 'orange',  label: '橙',    bg: 'bg-orange-100',  darkBg: 'dark:bg-orange-900/50', dot: 'bg-orange-400' },
  { id: 'yellow',  label: '黄',    bg: 'bg-yellow-100',  darkBg: 'dark:bg-yellow-900/50', dot: 'bg-yellow-400' },
  { id: 'green',   label: '绿',    bg: 'bg-green-100',   darkBg: 'dark:bg-green-900/50', dot: 'bg-green-400' },
  { id: 'blue',    label: '蓝',    bg: 'bg-blue-100',    darkBg: 'dark:bg-blue-900/50', dot: 'bg-blue-400' },
  { id: 'purple',  label: '紫',    bg: 'bg-purple-100',  darkBg: 'dark:bg-purple-900/50', dot: 'bg-purple-400' },
  { id: 'pink',    label: '粉',    bg: 'bg-pink-100',    darkBg: 'dark:bg-pink-900/50', dot: 'bg-pink-400' },
]

export function getColorClasses(color: NoteColor): string {
  const c = NOTE_COLORS.find((x) => x.id === color) ?? NOTE_COLORS[0]
  return `${c.bg} ${c.darkBg}`
}

export function getDotClass(color: NoteColor): string {
  return NOTE_COLORS.find((x) => x.id === color)?.dot ?? 'bg-slate-300'
}
