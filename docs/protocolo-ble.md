# Protocolo BLE entre la app y el ESP32

La app y el firmware deben usar exactamente estos valores. En la app viven en `app/src/ble/protocolo.ts`; en el firmware, en `firmware/` (por crear).

## Identificadores

| Elemento | Valor | Propiedades |
| --- | --- | --- |
| Nombre anunciado | `Vocales-ESP32` | — |
| Servicio | `76fd6821-a92f-42ae-aea2-89ee978c4520` | Se anuncia en el paquete de publicidad para que la app lo filtre al buscar |
| `orden` | `91b9efc5-483a-46c0-9fc1-f8f245bef7b3` | Escritura con respuesta (WRITE) |
| `estado` | `a0ac98c4-827b-4067-b51b-f39fd1bc4280` | Lectura y notificación (READ, NOTIFY) |

## Mensajes

Texto ASCII, sin salto de línea, de 20 bytes o menos.

**De la app al ESP32 (`orden`):**

| Mensaje | Qué hace el ESP32 |
| --- | --- |
| `A`, `E`, `I`, `O`, `U` | Busca la vocal en la tabla de calibración y genera su tono durante 15 s como máximo. Si ya sonaba otro tono, lo detiene con rampa y empieza el nuevo |
| `PARA` | Detiene el tono con rampa en 1 s o menos |
| `APP <versión>` | Solo lo registra por el puerto serie (por ejemplo, `APP 0.1.0`) |

**Del ESP32 a la app (`estado`):**

| Mensaje | Cuándo |
| --- | --- |
| `LISTO <firmware>` | Al conectarse la app y al terminar de arrancar. `<firmware>` es la salida de `git describe --always --dirty` |
| `ACTIVA <vocal>` | Cuando empieza el tono |
| `FIN <vocal>` | Cuando termina el tono, por tiempo o por `PARA` |
| `ERROR <motivo>` | Orden desconocida o vocal sin calibrar, por ejemplo `ERROR SIN_TABLA A` |

## Reglas

- El ESP32 limita cada tono a 15 s aunque se pierda la conexión.
- Al desconectarse la app, el ESP32 vuelve a anunciarse de inmediato.
- Cada orden recibida se imprime por el puerto serie como `[BLE] recibido: <orden>`, y cada tono como `[TONO] <vocal> <Hz> nivel <0–1>`, para que `registro.py` los capture.
- Si cambias un UUID o un mensaje, cámbialo aquí, en `app/src/ble/protocolo.ts` y en el firmware en el mismo *commit*.
