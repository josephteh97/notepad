const RTF = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

export function formatDate(ms: number): string {
  const date = new Date(ms)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - ms) / 86_400_000)

  if (diffDays === 0) return `今天 ${padTime(date)}`
  if (diffDays === 1) return `昨天 ${padTime(date)}`
  if (diffDays < 7) return RTF.format(-diffDays, 'day')
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

export function formatReminderDate(ms: number): string {
  const date = new Date(ms)
  const now = new Date()
  const diffMs = ms - now.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays < 0) return `已过期 ${date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} ${padTime(date)}`
  if (diffDays === 0) return `今天 ${padTime(date)}`
  if (diffDays === 1) return `明天 ${padTime(date)}`
  return `${date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} ${padTime(date)}`
}

export function dayLabel(ms: number): string {
  const date = new Date(ms)
  const now = new Date()
  const diffDays = Math.floor((ms - now.getTime()) / 86_400_000)

  if (diffDays === 1) return '明天'
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${weekdays[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`
}

function padTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}
