// Registro de las rondas del modo actividad y exportación a CSV, sin internet.

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Vocal } from '../placa/protocolo';

export type Ronda = {
  participante: string;
  ronda: number;
  objetivo: Vocal;
  respuesta: Vocal;
  correcta: boolean;
  tiempoRespuestaS: number;
  hora: string; // ISO 8601
  app: string;
  firmware: string;
  voz: boolean;
};

const COLUMNAS = [
  'participante',
  'ronda',
  'objetivo',
  'respuesta',
  'correcta',
  'tiempo_respuesta_s',
  'hora',
  'app',
  'firmware',
  'voz',
] as const;

function celda(valor: string | number | boolean): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(rondas: Ronda[]): string {
  const filas = rondas.map((r) =>
    [
      r.participante,
      r.ronda,
      r.objetivo,
      r.respuesta,
      r.correcta ? 1 : 0,
      r.tiempoRespuestaS.toFixed(1),
      r.hora,
      r.app,
      r.firmware,
      r.voz ? 1 : 0,
    ]
      .map(celda)
      .join(','),
  );
  return [COLUMNAS.join(','), ...filas].join('\n') + '\n';
}

/** Guarda el CSV en el iPhone y abre la hoja para compartirlo (AirDrop, Archivos, correo…). */
export async function compartirCsv(rondas: Ronda[]): Promise<'compartido' | 'no-disponible'> {
  if (!(await Sharing.isAvailableAsync())) return 'no-disponible';
  const participante = rondas[0]?.participante ?? 'sin-codigo';
  const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const archivo = new File(Paths.document, `actividad-${participante}-${sello}.csv`);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(aCsv(rondas));
  await Sharing.shareAsync(archivo.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Compartir resultados',
  });
  return 'compartido';
}
