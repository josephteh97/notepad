package com.cowork.notepad

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONArray

/**
 * 4×2 home-screen widget — shows a list of up to 3 notes.
 * Reads from SharedPreferences written by WidgetPlugin.kt.
 * Tap on each row deep-links to that note in the app.
 */
class Widget4x2 : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, manager, id)
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_4x2)
        val notes = getNotes(context)

        // Row 1
        bindRow(context, views, R.id.widget_row1_title, R.id.widget_row1_body, R.id.widget_row1, notes.getOrNull(0))
        // Row 2
        bindRow(context, views, R.id.widget_row2_title, R.id.widget_row2_body, R.id.widget_row2, notes.getOrNull(1))
        // Row 3
        bindRow(context, views, R.id.widget_row3_title, R.id.widget_row3_body, R.id.widget_row3, notes.getOrNull(2))

        // Header tap → open app home
        val homeIntent = Intent(context, MainActivity::class.java)
        val homePending = PendingIntent.getActivity(
            context, 0, homeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_header, homePending)

        manager.updateAppWidget(widgetId, views)
    }

    private fun bindRow(
        context: Context,
        views: RemoteViews,
        titleId: Int,
        bodyId: Int,
        rowId: Int,
        note: Triple<Int, String, String>?
    ) {
        if (note == null) {
            views.setTextViewText(titleId, "")
            views.setTextViewText(bodyId, "")
            return
        }
        views.setTextViewText(titleId, note.second.ifEmpty { "(无标题)" })
        views.setTextViewText(bodyId, note.third.take(50))

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("notepad://note/${note.first}"))
        intent.setClass(context, MainActivity::class.java)
        val pending = PendingIntent.getActivity(
            context, note.first, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(rowId, pending)
    }

    /** Returns list of (id, title, body) for top 3 notes */
    private fun getNotes(context: Context): List<Triple<Int, String, String>> {
        val prefs = context.getSharedPreferences(WidgetPlugin.PREFS_WIDGET, Context.MODE_PRIVATE)
        val json = prefs.getString(WidgetPlugin.KEY_NOTES_JSON, "[]") ?: "[]"
        val result = mutableListOf<Triple<Int, String, String>>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until minOf(arr.length(), 3)) {
                val obj = arr.getJSONObject(i)
                result.add(Triple(
                    obj.optInt("id", 0),
                    obj.optString("title", ""),
                    obj.optString("body", "")
                ))
            }
        } catch (_: Exception) {}
        return result
    }
}
