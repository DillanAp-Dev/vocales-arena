# Vocales en Arena

Prototipo educativo de reconocimiento de vocales mediante sonido, vibraciones y patrones visuales. Servicio social en la FES Cuautitlán, UNAM (clave SS-2026-12/147-6647).

Una app de iPhone envía la vocal elegida por Bluetooth a un ESP32. El ESP32 genera un tono calibrado que, a través de un DAC, un amplificador y un woofer, hace vibrar una placa de aluminio con sal. En la frecuencia de resonancia de cada vocal, la sal forma un patrón distinto.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `app/` | App de iOS (Expo SDK 54, Expo Router, TypeScript): inicio, explorar, actividad y diagnóstico |
| `.github/workflows/ios-ipa.yml` | Compila el IPA sin firmar en una Mac de GitHub |
| `docs/` | Protocolo BLE y documentación |
| `firmware/` | Firmware del ESP32 (por crear) |
| `tools/` | Registro, calibración y fotos con Python (por crear) |

## Instalar la app en el iPhone (sin Mac)

1. En GitHub, abre **Actions › Compilar IPA** y descarga el artefacto de la última ejecución exitosa. Descomprime el `.zip` para obtener el `.ipa`.
2. En Windows, con iTunes (descargado de apple.com) y Sideloadly instalados, conecta el iPhone por USB.
3. En Sideloadly, elige el `.ipa`, escribe tu cuenta de Apple y toca **Start**.
4. La primera vez, en el iPhone: activa **Ajustes › Privacidad y seguridad › Modo de desarrollador** y reinicia; luego confía en tu certificado en **Ajustes › General › VPN y gestión de dispositivos** (requiere internet).
5. Con una cuenta gratuita, la instalación vence a los 7 días: se renueva repitiendo el paso 3 con el mismo `.ipa`.

Para compilar la variante de desarrollo, en **Actions › Compilar IPA › Run workflow** elige `dev`.

## Vista previa sin iPhone ni placa

En `app/`, `npm install` y luego `npx expo start --web`. En el navegador la app usa una placa simulada (`src/placa/transporte.ts`) que responde `LISTO`, `ACTIVA` y `FIN`; en el iPhone se usa Bluetooth real (`src/placa/transporte.native.ts`). Cuando la placa es simulada, el estado lo indica con «(simulada)».
