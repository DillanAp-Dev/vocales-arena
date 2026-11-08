// Protocolo BLE entre la app y el ESP32.
// Debe coincidir con docs/protocolo-ble.md y con el firmware.

export const NOMBRE_PLACA = 'Vocales-ESP32';

export const UUID_SERVICIO = '76fd6821-a92f-42ae-aea2-89ee978c4520';
// Escritura con respuesta: A, E, I, O, U, PARA o "APP <versión>".
export const UUID_ORDEN = '91b9efc5-483a-46c0-9fc1-f8f245bef7b3';
// Notificación: LISTO <firmware>, ACTIVA <vocal>, FIN <vocal> o ERROR <motivo>.
export const UUID_ESTADO = 'a0ac98c4-827b-4067-b51b-f39fd1bc4280';

export const VOCALES = ['A', 'E', 'I', 'O', 'U'] as const;
export type Vocal = (typeof VOCALES)[number];

export type MensajeEstado =
  | { tipo: 'LISTO'; firmware: string }
  | { tipo: 'ACTIVA'; vocal: string }
  | { tipo: 'FIN'; vocal: string }
  | { tipo: 'ERROR'; motivo: string }
  | { tipo: 'DESCONOCIDO'; texto: string };

// El ESP32 solo envía texto ASCII; cada mensaje cabe en 20 bytes o menos.
export function aBytes(texto: string): number[] {
  return Array.from(texto, (c) => c.charCodeAt(0) & 0x7f);
}

export function deBytes(bytes: number[]): string {
  return String.fromCharCode(...bytes).trim();
}

export function interpretarEstado(texto: string): MensajeEstado {
  const [tipo, ...resto] = texto.split(' ');
  const valor = resto.join(' ');
  switch (tipo) {
    case 'LISTO':
      return { tipo: 'LISTO', firmware: valor };
    case 'ACTIVA':
      return { tipo: 'ACTIVA', vocal: valor };
    case 'FIN':
      return { tipo: 'FIN', vocal: valor };
    case 'ERROR':
      return { tipo: 'ERROR', motivo: valor };
    default:
      return { tipo: 'DESCONOCIDO', texto };
  }
}

export function mismoUuid(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
