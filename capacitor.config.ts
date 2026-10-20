import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nadistributors.spicerp',
  appName: 'NA Distributors Spice ERP',
  webDir: 'dist',
  server: {
    // Live Cloud Backend & Web App URL for shared real-time database and REST APIs
    url: 'https://ais-pre-zytzhpqjsifz3trjxpvlcz-536828219465.asia-northeast1.run.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#78350f',
      showSpinner: true,
      spinnerColor: '#fbbf24',
    },
  },
};

export default config;
