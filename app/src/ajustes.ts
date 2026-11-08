// Preferencias guardadas en el iPhone (sin internet). Si el almacenamiento falla, se usan valores por omisión.

import { File, Paths } from 'expo-file-system';

export type Ajustes = {
  /** Ya se mostró la explicación del Bluetooth y se dio el permiso una vez. */
  bluetoothExplicado: boolean;
  /** Reproducir la voz grabada (solo si existen grabaciones). */
  voz: boolean;
};

const PREDETERMINADOS: Ajustes = { bluetoothExplicado: false, voz: false };

function archivo(): File | null {
  try {
    return new File(Paths.document, 'ajustes.json');
  } catch {
    return null;
  }
}

export function leerAjustes(): Ajustes {
  try {
    const f = archivo();
    if (!f || !f.exists) return { ...PREDETERMINADOS };
    return { ...PREDETERMINADOS, ...(JSON.parse(f.textSync()) as Partial<Ajustes>) };
  } catch {
    return { ...PREDETERMINADOS };
  }
}

export function guardarAjustes(cambios: Partial<Ajustes>): Ajustes {
  const nuevos = { ...leerAjustes(), ...cambios };
  try {
    const f = archivo();
    if (f) {
      if (!f.exists) f.create();
      f.write(JSON.stringify(nuevos));
    }
  } catch {
    // Sin almacenamiento disponible: los ajustes duran solo esta sesión.
  }
  return nuevos;
}
