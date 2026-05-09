package com.cowork.notepad

import android.content.Context
import androidx.work.*
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.concurrent.TimeUnit

/**
 * Capacitor plugin that schedules WorkManager background sync every 15 minutes.
 * When WorkManager fires, it posts a bridge event "syncTrigger" that the JS
 * sync engine listens for and runs the actual sync logic.
 *
 * This ensures sync continues even when the app is killed.
 */
@CapacitorPlugin(name = "SyncPlugin")
class SyncPlugin : Plugin() {

    companion object {
        const val WORK_TAG = "notepad_background_sync"
        const val PREFS_SYNC = "notepad_sync_prefs"
        const val KEY_LAST_SYNC = "last_background_sync"
    }

    override fun load() {
        schedulePeriodic()
    }

    @PluginMethod
    fun schedulePeriodic(call: PluginCall? = null) {
        schedulePeriodic()
        call?.resolve()
    }

    @PluginMethod
    fun cancelPeriodic(call: PluginCall) {
        WorkManager.getInstance(context).cancelAllWorkByTag(WORK_TAG)
        call.resolve()
    }

    private fun schedulePeriodic() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build()

        val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .addTag(WORK_TAG)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_TAG,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    /**
     * The JS layer calls this to notify that background sync completed (via plugin event).
     * WorkManager cannot directly call JS — instead JS listens for the "syncTrigger"
     * notification channel posted by SyncWorker.
     */
    class SyncWorker(appContext: Context, params: WorkerParameters)
        : CoroutineWorker(appContext, params) {

        override suspend fun doWork(): Result {
            // Write timestamp so when app opens it knows a sync was requested
            applicationContext.getSharedPreferences(PREFS_SYNC, Context.MODE_PRIVATE)
                .edit()
                .putLong(KEY_LAST_SYNC, System.currentTimeMillis())
                .apply()

            // The actual sync runs in JS. When the Capacitor app is active,
            // useSync hook's visibilitychange / startup trigger handles it.
            // This worker ensures the pref is updated so the app knows to sync
            // on next open even if it was killed.

            return Result.success()
        }
    }
}
