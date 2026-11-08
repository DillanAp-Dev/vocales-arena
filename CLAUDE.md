# Vocales en Arena — guía para Claude Code

Prototipo de servicio social (FES Cuautitlán, UNAM): una app de iPhone envía una vocal por Bluetooth (BLE) a un ESP32, que genera un tono calibrado; un DAC PCM5102A y un amplificador TPA3116 mueven un woofer que hace vibrar una placa de aluminio con sal, y la sal forma un patrón distinto para cada vocal. Público: niñas y niños sordos. Entrega: 20 de noviembre de 2026.

## Quién trabaja dónde

| Carpeta | Se edita desde | Contenido |
| --- | --- | --- |
| `app/`, `.github/` | Conversación de Claude en claude.ai (nube) | App Expo SDK 54 y flujo que compila el IPA en GitHub Actions |
| `firmware/`, `tools/`, `calibracion/`, `evidencia/` | Claude Code en la PC con Windows | Firmware del ESP32, scripts de Python, tabla de calibración y registros |
| `docs/` | Ambos, con cuidado | Documentación; `docs/protocolo-ble.md` es el contrato entre app y firmware |

Haz `git pull` antes de empezar. No edites `app/` ni `.github/` desde la PC salvo que el usuario lo pida.

## Versiones fijas

- Arduino CLI 1.5.1, núcleo `esp32:esp32` 3.3.12, NimBLE-Arduino 2.5.2 y `ESP_I2S` del núcleo. Fíjalas en `firmware/sketch.yaml`.
- Python 3 con `pyserial`.
- App: Expo SDK 54, React Native 0.81.5, `react-native-ble-manager` 12.6.1.

## Firmware (pendiente)

- BLE según `docs/protocolo-ble.md`; nombre `Vocales-ESP32`; vuelve a anunciarse al desconectarse.
- Tono: senoide a 44.1 kHz por I2S, tabla precalculada, búferes completos, rampas de entrada y salida, 15 s como máximo.
- PCM5102A: BCK, LCK y DIN a pines libres del ESP32; FMT a tierra; XMT a 3.3 V.
- Tabla de calibración en la memoria no volátil (Preferences/NVS); se imprime al arrancar; copia en `calibracion/calibracion.json`.
- Comandos por USB (115200 baudios): `TONO <Hz>`, `NIVEL <0–1>`, `GUARDA <vocal> <Hz> <nivel>`, `TABLA`, `PARA`.
- `tools/version.py` escribe `version.h` con `git describe --always --dirty` antes de compilar; el ESP32 la imprime al arrancar y la envía en `LISTO`.
- Registros por serie: `[BLE] recibido: <orden>`, `[TONO] <vocal> <Hz> nivel <x>`, y `huecos=<n>` al terminar cada tono.

## Herramientas de Python (pendientes)

- `tools/registro.py`: único programa que abre el puerto serie; muestra todo y agrega una fila por ensayo a `evidencia/ensayos.csv` (número, hora, vocal, Hz, nivel, duración, huecos, firmware, app, condiciones).
- `tools/calibra.py`: barrido de 100 a 3,000 Hz con `TONO`; una tecla marca la frecuencia candidata.
- `tools/fotos.py`: empareja fotos con ensayos por hora (±60 s) y las renombra, p. ej. `E-0031_A_523.0Hz.jpg`.

## Reglas

- El repositorio es público: nunca subas contraseñas, certificados, perfiles ni datos personales de participantes.
- Un ensayo con firmware `-dirty` no cuenta como formal.
- Seguridad eléctrica: las salidas del TPA3116 son en puente; nunca a tierra. No alimentes el ESP32 por USB y por el convertidor de 5 V a la vez sin confirmarlo.
- El plan completo está en el documento «Plan final de trabajo — prototipo de vocales en arena» del usuario.
