// Sistema visual: el aluminio de la placa, la sal que forma el patrón y la pizarra del salón.
// Contraste mínimo de 4.5:1 en todo el texto; los estados combinan color, ícono y texto.

export const color = {
  aluminio: '#E8ECEF', // fondo general
  placa: '#F8FAFB', // superficies
  linea: '#C9D1D8', // bordes finos
  tinta: '#14202A', // texto principal
  grafito: '#4A5763', // texto secundario
  arena: '#D8A23F', // acento: acciones principales
  arenaSuave: '#F3E3BF',
  pizarra: '#0F1820', // pantalla de observación
  sal: '#F2EEE4', // texto sobre pizarra
  lista: '#23734A',
  activa: '#1D5FA6',
  desconectada: '#B42318',
  aviso: '#8A5300',
  buscando: '#56616B',
} as const;

export const fuente = {
  regular: 'AtkinsonHyperlegible_400Regular',
  negrita: 'AtkinsonHyperlegible_700Bold',
} as const;

// Escala tipográfica (puntos): letra gigante para la vocal, el resto contenido.
export const tamano = {
  vocalGigante: 220,
  vocal: 84,
  titulo: 34,
  encabezado: 24,
  cuerpo: 18,
  pequeno: 15,
} as const;

export const espacio = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;

export const radio = { boton: 14, panel: 22, pastilla: 999 } as const;
