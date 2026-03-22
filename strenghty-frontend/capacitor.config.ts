import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { tsSplashScreen?: any } = {
  appId: 'com.strengthy.app',
  appName: 'Strengthy',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    cleartext: true,
  },
  overrideUserAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#0f0f0f',
      style: 'LIGHT',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId:
        '682920475586-donl8vohortm58eqb2ulbcg48tf2uhnp.apps.googleusercontent.com',
      serverClientId:
        '682920475586-h98muldc2oqab094un02au2k8c5cj9i1.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'launch_background',
      showSpinner: false,
    },
  },
  tsSplashScreen: {
    launchShowDuration: 2000,
    launchAutoHide: true,
    backgroundColor: '#000000',
    androidSplashResourceName: 'launch_background',
    showSpinner: false,
  },
};

export default config;
