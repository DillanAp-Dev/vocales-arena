import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import type { ContenidoVocal } from '../contenido/vocales';
import type { Conexion } from '../placa/PlacaProvider';
import { color, espacio, fuente, radio, tamano } from './tema';

type NombreIcono = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Texto({
  children,
  variante = 'cuerpo',
  colorTexto = color.tinta,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variante?: 'titulo' | 'encabezado' | 'cuerpo' | 'cuerpoNegrita' | 'pequeno';
  colorTexto?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[estilosTexto[variante], { color: colorTexto }, style]}>
      {children}
    </Text>
  );
}

const estilosTexto = StyleSheet.create({
  titulo: { fontFamily: fuente.negrita, fontSize: tamano.titulo, lineHeight: tamano.titulo * 1.15 },
  encabezado: { fontFamily: fuente.negrita, fontSize: tamano.encabezado, lineHeight: tamano.encabezado * 1.25 },
  cuerpo: { fontFamily: fuente.regular, fontSize: tamano.cuerpo, lineHeight: tamano.cuerpo * 1.45 },
  cuerpoNegrita: { fontFamily: fuente.negrita, fontSize: tamano.cuerpo, lineHeight: tamano.cuerpo * 1.45 },
  pequeno: { fontFamily: fuente.regular, fontSize: tamano.pequeno, lineHeight: tamano.pequeno * 1.4 },
});

export function Boton({
  texto,
  alTocar,
  alMantener,
  icono,
  tipo = 'principal',
  deshabilitado,
  style,
}: {
  texto: string;
  alTocar?: () => void;
  alMantener?: () => void;
  icono?: NombreIcono;
  tipo?: 'principal' | 'secundario' | 'peligro' | 'claroSobrePizarra';
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fondo = {
    principal: color.arena,
    secundario: color.placa,
    peligro: color.desconectada,
    claroSobrePizarra: color.sal,
  }[tipo];
  const tinta = tipo === 'peligro' ? '#FFFFFF' : color.tinta;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: !!deshabilitado }}
      disabled={deshabilitado}
      onPress={alTocar}
      onLongPress={alMantener}
      delayLongPress={2000}
      style={({ pressed }) => [
        estilosBoton.base,
        { backgroundColor: fondo },
        tipo === 'secundario' && estilosBoton.conBorde,
        pressed && estilosBoton.presionado,
        deshabilitado && estilosBoton.deshabilitado,
        style,
      ]}
    >
      {icono ? <MaterialCommunityIcons name={icono} size={24} color={tinta} /> : null}
      <Text style={[estilosBoton.texto, { color: tinta }]}>{texto}</Text>
    </Pressable>
  );
}

const estilosBoton = StyleSheet.create({
  base: {
    minHeight: 60,
    borderRadius: radio.boton,
    paddingHorizontal: espacio.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.s,
  },
  conBorde: { borderWidth: 1, borderColor: color.linea },
  presionado: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  deshabilitado: { opacity: 0.4 },
  texto: { fontFamily: fuente.negrita, fontSize: tamano.cuerpo },
});

const ASPECTO_ESTADO: Record<Conexion, { fondo: string; icono: NombreIcono; texto: string }> = {
  'sin-iniciar': { fondo: color.buscando, icono: 'bluetooth', texto: 'Bluetooth sin activar' },
  'bluetooth-apagado': { fondo: color.desconectada, icono: 'bluetooth-off', texto: 'Enciende el Bluetooth' },
  inactiva: { fondo: color.buscando, icono: 'magnify', texto: 'Toca para buscar la placa' },
  buscando: { fondo: color.buscando, icono: 'magnify', texto: 'Buscando la placa…' },
  'no-encontrada': { fondo: color.aviso, icono: 'alert-circle-outline', texto: 'No encontré la placa: toca para buscar' },
  conectando: { fondo: color.buscando, icono: 'bluetooth-connect', texto: 'Conectando…' },
  lista: { fondo: color.lista, icono: 'check-circle-outline', texto: 'Placa lista' },
  activa: { fondo: color.activa, icono: 'waveform', texto: 'Vibrando' },
  desconectada: { fondo: color.desconectada, icono: 'link-variant-off', texto: 'Sin conexión: toca para reconectar' },
};

/** Estado de la placa con color, ícono y texto. En el modo actividad, `ocultarVocal` evita mostrar cuál suena. */
export function EstadoPlaca({
  conexion,
  vocalActiva,
  ocultarVocal,
  simulada,
  alTocar,
}: {
  conexion: Conexion;
  vocalActiva?: string | null;
  ocultarVocal?: boolean;
  simulada?: boolean;
  alTocar?: () => void;
}) {
  const a = ASPECTO_ESTADO[conexion];
  const texto =
    conexion === 'activa' ? (ocultarVocal || !vocalActiva ? 'Activa' : `Vibrando: ${vocalActiva}`) : a.texto;
  const tocable = alTocar && ['inactiva', 'no-encontrada', 'desconectada', 'sin-iniciar'].includes(conexion);
  return (
    <Pressable
      accessibilityRole={tocable ? 'button' : 'text'}
      accessibilityLabel={texto}
      disabled={!tocable}
      onPress={alTocar}
      style={[estilosEstado.pastilla, { backgroundColor: a.fondo }]}
    >
      <MaterialCommunityIcons name={a.icono} size={22} color="#FFFFFF" />
      <Text style={estilosEstado.texto} numberOfLines={1}>
        {texto}
        {simulada ? ' (simulada)' : ''}
      </Text>
    </Pressable>
  );
}

const estilosEstado = StyleSheet.create({
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    alignSelf: 'flex-start',
    borderRadius: radio.pastilla,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: '100%',
  },
  texto: { color: '#FFFFFF', fontFamily: fuente.negrita, fontSize: tamano.pequeno, flexShrink: 1 },
});

/** Foto de la seña en LSM o, mientras no exista una validada, un aviso claro. */
export function Sena({ contenido, tamanoCaja = 96, sobrePizarra }: { contenido: ContenidoVocal; tamanoCaja?: number; sobrePizarra?: boolean }) {
  const tinta = sobrePizarra ? color.sal : color.grafito;
  if (contenido.sena) {
    return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Image source={contenido.sena} style={{ width: tamanoCaja, height: tamanoCaja, borderRadius: 12 }} />
        {!contenido.senaValidada ? <Text style={[estilosRanura.nota, { color: tinta }]}>Pendiente de validación</Text> : null}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel="Seña en LSM pendiente"
      style={[estilosRanura.caja, { width: tamanoCaja, height: tamanoCaja, borderColor: tinta }]}
    >
      <MaterialCommunityIcons name="hand-back-left-outline" size={tamanoCaja * 0.42} color={tinta} />
      {tamanoCaja >= 96 ? <Text style={[estilosRanura.nota, { color: tinta }]}>Seña en LSM</Text> : null}
    </View>
  );
}

/** Foto de referencia del patrón o, antes de calibrar, la ranura vacía. */
export function Patron({ contenido, tamanoCaja = 96 }: { contenido: ContenidoVocal; tamanoCaja?: number }) {
  if (contenido.patron) {
    return <Image source={contenido.patron} style={{ width: tamanoCaja, height: tamanoCaja, borderRadius: 12 }} />;
  }
  return (
    <View
      accessible
      accessibilityLabel="Patrón por calibrar"
      style={[estilosRanura.caja, { width: tamanoCaja, height: tamanoCaja, borderColor: color.grafito }]}
    >
      <MaterialCommunityIcons name="grain" size={tamanoCaja * 0.42} color={color.grafito} />
      {tamanoCaja >= 96 ? <Text style={[estilosRanura.nota, { color: color.grafito }]}>Patrón por calibrar</Text> : null}
    </View>
  );
}

const estilosRanura = StyleSheet.create({
  caja: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: 4,
  },
  nota: { fontFamily: fuente.regular, fontSize: 12, textAlign: 'center' },
});
