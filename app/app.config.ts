import type { ExpoConfig } from 'expo/config';

// APP_VARIANT=entrega (por omisión): "Vocales en Arena", la que se usa en la demostración.
// APP_VARIANT=dev: "Vocales DEV", para desarrollo; se instala junto a la de entrega.
const variante = process.env.APP_VARIANT === 'dev' ? 'dev' : 'entrega';
const esDev = variante === 'dev';

const config: ExpoConfig = {
  name: esDev ? 'Vocales DEV' : 'Vocales en Arena',
  slug: 'vocales-arena',
  version: '0.2.0',
  scheme: 'vocalesarena',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#22313F',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: esDev ? 'com.dillanap.vocalesarena.dev' : 'com.dillanap.vocalesarena',
    buildNumber: '2',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    'expo-router',
    [
      'react-native-ble-manager',
      {
        bluetoothAlwaysPermission:
          'Vocales en Arena usa Bluetooth para enviar la vocal elegida a la placa y mostrar su estado.',
      },
    ],
  ],
  web: { output: 'single' },
  experiments: { typedRoutes: false },
  extra: {
    variante,
  },
};

export default config;
