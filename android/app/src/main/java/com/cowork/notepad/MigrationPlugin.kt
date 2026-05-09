package com.cowork.notepad

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin that bridges v2 native app data (SharedPreferences) to the JS layer.
 *
 * The v2 native app stored notes as JSON in SharedPreferences:
 *   File: "cowork_notepad_v2"   Key: "notes_json"
 *
 * This plugin is called once on first launch; after migration it writes
 * "migration_done" = true to the same prefs file so subsequent launches are no-ops.
 */
@CapacitorPlugin(name = "MigrationPlugin")
class MigrationPlugin : Plugin() {

    private val PREFS_V2 = "cowork_notepad_v2"
    private val KEY_NOTES = "notes_json"
    private val KEY_DONE = "migration_done"

    @PluginMethod
    fun isDone(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_V2, android.content.Context.MODE_PRIVATE)
        call.resolve(com.getcapacitor.JSObject().put("value", prefs.getBoolean(KEY_DONE, false)))
    }

    @PluginMethod
    fun readV2Notes(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_V2, android.content.Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_NOTES, null)
        call.resolve(com.getcapacitor.JSObject().put("value", json))
    }

    @PluginMethod
    fun markDone(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_V2, android.content.Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_DONE, true).apply()
        call.resolve()
    }
}
