import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartdisc.at',
  appName: 'SmartDisc',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
