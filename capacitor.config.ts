import type { CapacitorConfig } from '@capacitor/cli'

const isDev = process.env.NODE_ENV === 'development'

const config: CapacitorConfig = {
  appId: 'com.genfinds.app',
  appName: 'GenFinds',
  webDir: 'dist',
  ...(isDev && {
    server: {
      url: 'http://localhost:5173',
      cleartext: true
    }
  }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0A0A14'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'dark'
    }
  }
}

export default config
