// Secuencia oculta del modo actividad: cada vocal una vez por bloque de cinco,
// en orden aleatorio y sin repetir la misma vocal dos veces seguidas.

import { VOCALES, type Vocal } from '../placa/protocolo';

function barajar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function generarSecuencia(rondas: number): Vocal[] {
  const bloques = Math.ceil(rondas / VOCALES.length);
  const secuencia: Vocal[] = [];
  for (let b = 0; b < bloques; b++) {
    let bloque = barajar(VOCALES);
    while (secuencia.length > 0 && bloque[0] === secuencia[secuencia.length - 1]) {
      bloque = barajar(VOCALES);
    }
    secuencia.push(...bloque);
  }
  return secuencia.slice(0, rondas);
}
