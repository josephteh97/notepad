import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

let idCounter = Math.floor(Math.random() * 100_000)

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

export async function scheduleNotification(
  noteId: number,
  title: string,
  body: string,
  atMs: number,
): Promise<number | null> {
  if (!Capacitor.isNativePlatform()) return null
  if (atMs <= Date.now()) return null

  const notifId = ++idCounter
  const preview = body.length > 60 ? body.slice(0, 60) + '…' : body

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notifId,
        title: title || '笔记提醒',
        body: preview,
        schedule: { at: new Date(atMs) },
        extra: { noteId },
        actionTypeId: 'NOTE_REMINDER',
      },
    ],
  })
  return notifId
}

export async function cancelNotification(notificationId: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.cancel({ notifications: [{ id: notificationId }] })
}
