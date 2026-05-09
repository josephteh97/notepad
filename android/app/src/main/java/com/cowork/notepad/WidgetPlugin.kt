package com.cowork.notepad

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin called by JS after every note save.
 * Writes top notes JSON to SharedPreferences so home-screen widgets can read it.
 * Also triggers widget update so the OS refreshes displayed content.
 */
@CapacitorPlugin(name = "WidgetPlugin")
class WidgetPlugin : Plugin() {

    companion object {
        const val PREFS_WIDGET = "notepad_widget_prefs"
        const val KEY_NOTES_JSON = "widget_notes_json"
    }

    @PluginMethod
    fun updateWidget(call: PluginCall) {
        val notesJson = call.getString("notesJson") ?: "[]"

        // Persist to SharedPreferences
        context.getSharedPreferences(PREFS_WIDGET, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_NOTES_JSON, notesJson)
            .apply()

        // Request widget refresh for both widget sizes
        val manager = AppWidgetManager.getInstance(context)
        listOf(Widget4x1::class.java, Widget4x2::class.java).forEach { cls ->
            val ids = manager.getAppWidgetIds(ComponentName(context, cls))
            if (ids.isNotEmpty()) {
                val intent = Intent(context, cls).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                }
                context.sendBroadcast(intent)
            }
        }

        call.resolve()
    }
}
