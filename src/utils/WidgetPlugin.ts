/**
 * JS bridge to the native WidgetPlugin Kotlin plugin.
 * Writes top notes to SharedPreferences so home-screen widgets can read them.
 */
import { registerPlugin } from '@capacitor/core'

export interface WidgetPluginInterface {
  updateWidget(options: { notesJson: string }): Promise<void>
}

export const WidgetPlugin = registerPlugin<WidgetPluginInterface>('WidgetPlugin', {
  web: {
    updateWidget: async () => {},
  },
})
