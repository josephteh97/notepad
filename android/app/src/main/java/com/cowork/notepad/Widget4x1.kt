package com.cowork.notepad

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONArray

/**
 * 4×1 home-screen widget — shows the most recent pinned note (or newest note).
 * Reads from SharedPreferences written by WidgetPlugin.kt.
 * Tap opens the app.
 */
class Widget4x1 : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, manager, id)
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_4x1)

        val note = getTopNote(context)
        views.setTextViewText(R.id.widget_title, note.first.ifEmpty { "Notepad" })
        views.setTextViewText(R.id.widget_body, note.second.ifEmpty { "点击打开笔记" })

        // Tap to open app
        val intent = Intent(context, MainActivity::class.java)
        val pending = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pending)

        manager.updateAppWidget(widgetId, views)
    }

    private fun getTopNote(context: Context): Pair<String, String> {
        val prefs = context.getSharedPreferences(WidgetPlugin.PREFS_WIDGET, Context.MODE_PRIVATE)
        val json = prefs.getString(WidgetPlugin.KEY_NOTES_JSON, "[]") ?: "[]"
        return try {
            val arr = JSONArray(json)
            if (arr.length() == 0) return Pair("", "")
            val obj = arr.getJSONObject(0)
            Pair(obj.optString("title", ""), obj.optString("body", "").take(80))
        } catch (e: Exception) {
            Pair("", "")
        }
    }
}
