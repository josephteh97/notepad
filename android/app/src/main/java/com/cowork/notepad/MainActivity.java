package com.cowork.notepad;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom Capacitor plugins before super.onCreate
        registerPlugin(MigrationPlugin.class);
        registerPlugin(WidgetPlugin.class);
        registerPlugin(SyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
