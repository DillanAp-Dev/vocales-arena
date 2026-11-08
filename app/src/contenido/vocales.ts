// Contenido de cada vocal. Las señas y los patrones se agregan cuando existan:
// - sena: foto de la seña en LSM, tomada con una persona competente que autorice su uso (docs/terceros.md).
// - senaValidada: true solo cuando esa persona confirmó la configuración.
// - patron: foto cenital de referencia del patrón calibrado (evidencia/ y calibracion.json).

import type { ImageSourcePropType } from 'react-native';

import type { Vocal } from '../placa/protocolo';

export type ContenidoVocal = {
  vocal: Vocal;
  minuscula: string;
  sena?: ImageSourcePropType;
  senaValidada: boolean;
  patron?: ImageSourcePropType;
};

export const CONTENIDO: Record<Vocal, ContenidoVocal> = {
  A: { vocal: 'A', minuscula: 'a', senaValidada: false },
  E: { vocal: 'E', minuscula: 'e', senaValidada: false },
  I: { vocal: 'I', minuscula: 'i', senaValidada: false },
  O: { vocal: 'O', minuscula: 'o', senaValidada: false },
  U: { vocal: 'U', minuscula: 'u', senaValidada: false },
};
