import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold, useFonts } from '@expo-google-fonts/atkinson-hyperlegible';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { PlacaProvider } from '../placa/PlacaProvider';
import { color, fuente } from '../ui/tema';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function Diseno() {
  const [fuentesListas] = useFonts({ AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });

  useEffect(() => {
    if (fuentesListas) SplashScreen.hideAsync().catch(() => undefined);
  }, [fuentesListas]);

  if (!fuentesListas) return null;

  return (
    <PlacaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: color.aluminio },
          headerShadowVisible: false,
          headerTintColor: color.tinta,
          headerTitleStyle: { fontFamily: fuente.negrita, fontSize: 18 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: color.aluminio },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="explorar" options={{ title: 'Explorar' }} />
        <Stack.Screen name="actividad" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="diagnostico" options={{ title: 'Diagnóstico' }} />
      </Stack>
    </PlacaProvider>
  );
}
