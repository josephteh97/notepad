const RTF = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

export function formatDate(ms: number): string {
  const date = new Date(ms)
  const now = new Date()
  // Compare by calendar day, not elapsed milliseconds — so a note edited
  // yesterday evening reads "昨天" this morning, not "今天".
  const dayDiff = Math.round((startOfDay(now.getTime()) - startOfDay(ms)) / 86_400_000)

  if (dayDiff === 0) return `今天 ${padTime(date)}`
  if (dayDiff === 1) return `昨天 ${padTime(date)}`
  if (dayDiff > 1 && dayDiff < 7) return RTF.format(-dayDiff, 'day')
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: Math.abs(dayDiff) > 300 ? 'numeric' : undefined })
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

/** Compact countdown shown next to bell on note cards. Returns null if past. */
export function reminderCountdown(ms: number): string | null {
  const diff = ms - Date.now()
  if (diff <= 0) return null
  const min = Math.round(diff / 60_000)
  if (min < 60) return `${min}分钟后`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}小时后`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}天后`
  return new Date(ms).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
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
