// Pantalla técnica para la persona que monta la placa: órdenes directas y registro de eventos.
// Sirve para la Prueba 1 y para el diagnóstico en vivo.

import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOMBRE_PLACA, VOCALES } from '../placa/protocolo';
import { VERSION_APP, usePlaca } from '../placa/PlacaProvider';
import { Boton, EstadoPlaca, Texto } from '../ui/componentes';
import { color, espacio, radio } from '../ui/tema';

export default function Diagnostico() {
  const placa = usePlaca();
  const inset = useSafeAreaInsets();

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: inset.bottom + espacio.l }]}
    >
      <EstadoPlaca conexion={placa.conexion} vocalActiva={placa.vocalActiva} simulada={placa.simulada} alTocar={placa.buscar} />

      <View style={estilos.datos}>
        <Dato etiqueta="Placa" valor={placa.simulada ? 'Simulada (sin Bluetooth)' : NOMBRE_PLACA} />
        <Dato etiqueta="Versión de la app" valor={VERSION_APP} />
        <Dato etiqueta="Firmware" valor={placa.firmware ?? 'sin conexión'} />
      </View>

      <View style={estilos.fila}>
        <Boton texto="Buscar" icono="magnify" tipo="secundario" alTocar={placa.buscar} style={estilos.mitad} />
        <Boton texto="Olvidar" icono="link-variant-off" tipo="secundario" alTocar={placa.olvidar} style={estilos.mitad} />
      </View>

      <Texto variante="cuerpoNegrita">Órdenes directas</Texto>
      <View style={estilos.fila}>
        {VOCALES.map((v) => (
          <Boton
            key={v}
            texto={v}
            tipo="secundario"
            deshabilitado={!placa.disponible}
            alTocar={() => placa.enviar(v)}
            style={estilos.vocal}
          />
        ))}
      </View>
      <Boton texto="PARA" icono="stop-circle-outline" tipo="peligro" deshabilitado={!placa.disponible} alTocar={() => placa.enviar('PARA')} />

      <Texto variante="cuerpoNegrita">Registro</Texto>
      <View style={estilos.registro}>
        {placa.registro.length === 0 ? (
          <Text style={estilos.linea}>Sin eventos todavía</Text>
        ) : (
          placa.registro.map((linea, i) => (
            <Text key={`${i}-${linea}`} style={estilos.linea}>
              {linea}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Texto variante="pequeno" colorTexto={color.grafito}>
        {etiqueta}
      </Texto>
      <Texto variante="cuerpoNegrita">{valor}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.aluminio },
  contenido: { padding: espacio.l, gap: espacio.m },
  datos: {
    backgroundColor: color.placa,
    borderRadius: radio.panel,
    borderWidth: 1,
    borderColor: color.linea,
    padding: espacio.m,
    gap: espacio.s,
  },
  dato: { gap: 0 },
  fila: { flexDirection: 'row', gap: espacio.s, flexWrap: 'wrap' },
  mitad: { flex: 1 },
  vocal: { flex: 1, minWidth: 56, paddingHorizontal: 0 },
  registro: { backgroundColor: color.pizarra, borderRadius: radio.boton, padding: espacio.m, gap: 4 },
  linea: { color: color.sal, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
