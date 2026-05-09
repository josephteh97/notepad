import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cowork.notepad',
  appName: 'Notepad',
  webDir: 'dist',
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#f59e0b',
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
