import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { leerAjustes } from '../ajustes';
import { VOCALES } from '../placa/protocolo';
import { VERSION_APP, usePlaca } from '../placa/PlacaProvider';
import { Boton, EstadoPlaca, Texto } from '../ui/componentes';
import { color, espacio, fuente, radio } from '../ui/tema';

const MANTENER_MS = 2000;

export default function Inicio() {
  const placa = usePlaca();
  const router = useRouter();
  const inset = useSafeAreaInsets();

  if (placa.conexion === 'sin-iniciar' && !leerAjustes().bluetoothExplicado) {
    return <Bienvenida alActivar={placa.activarBluetooth} margenSuperior={inset.top} />;
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingTop: inset.top + espacio.m, paddingBottom: inset.bottom + espacio.l }]}
    >
      <View style={estilos.barra}>
        <View style={{ flexShrink: 1 }}>
          <EstadoPlaca
            conexion={placa.conexion}
            vocalActiva={placa.vocalActiva}
            simulada={placa.simulada}
            alTocar={placa.buscar}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diagnóstico de la placa"
          hitSlop={12}
          onPress={() => router.push('/diagnostico')}
          style={estilos.engrane}
        >
          <MaterialCommunityIcons name="tune-variant" size={26} color={color.grafito} />
        </Pressable>
      </View>

      <View style={estilos.encabezado}>
        <Texto variante="titulo">Vocales en Arena</Texto>
        <Texto colorTexto={color.grafito}>Cada vocal forma su propio patrón en la arena.</Texto>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explorar las vocales"
        onPress={() => router.push('/explorar')}
        style={({ pressed }) => [estilos.explorar, pressed && estilos.presionado]}
      >
        <View style={estilos.filaVocales}>
          {VOCALES.map((v) => (
            <Text key={v} style={estilos.vocalMuestra}>
              {v}
            </Text>
          ))}
        </View>
        <Texto variante="encabezado">Explorar</Texto>
        <Texto colorTexto={color.grafito}>Toca una vocal y mira cómo se forma su patrón.</Texto>
      </Pressable>

      <MantenerParaEmpezar alCompletar={() => router.push('/actividad')} />

      <View style={estilos.pie}>
        <Texto variante="pequeno" colorTexto={color.grafito}>
          Versión de la app {VERSION_APP}
        </Texto>
        <Texto variante="pequeno" colorTexto={color.grafito}>
          Firmware: {placa.firmware ?? 'sin conexión'}
        </Texto>
      </View>
    </ScrollView>
  );
}

/** La actividad se abre manteniendo presionado 2 s, para que nadie la abra o la cierre sin querer. */
function MantenerParaEmpezar({ alCompletar }: { alCompletar: () => void }) {
  const avance = useRef(new Animated.Value(0)).current;

  const iniciar = () => {
    avance.setValue(0);
    Animated.timing(avance, { toValue: 1, duration: MANTENER_MS, easing: Easing.linear, useNativeDriver: false }).start();
  };
  const cancelar = () => {
    avance.stopAnimation();
    Animated.timing(avance, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Actividad de reconocimiento. Mantén presionado dos segundos para empezar."
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={alCompletar}
      onPressIn={iniciar}
      onPressOut={cancelar}
      onLongPress={() => {
        avance.setValue(0);
        alCompletar();
      }}
      delayLongPress={MANTENER_MS}
      style={estilos.actividad}
    >
      <View style={estilos.actividadCabeza}>
        <MaterialCommunityIcons name="eye-outline" size={28} color={color.arena} />
        <Texto variante="encabezado" colorTexto={color.sal}>
          Actividad
        </Texto>
      </View>
      <Texto colorTexto={color.sal}>La placa forma un patrón sin decir cuál vocal es. La persona responde cuál fue.</Texto>
      <View style={estilos.pista}>
        <MaterialCommunityIcons name="gesture-tap-hold" size={20} color={color.arenaSuave} />
        <Texto variante="pequeno" colorTexto={color.arenaSuave}>
          Persona guía: mantén presionado 2 segundos
        </Texto>
      </View>
      <View style={estilos.carril}>
        <Animated.View
          style={[estilos.relleno, { width: avance.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
    </Pressable>
  );
}

function Bienvenida({ alActivar, margenSuperior }: { alActivar: () => void; margenSuperior: number }) {
  return (
    <View style={[estilos.pantalla, estilos.bienvenida, { paddingTop: margenSuperior + espacio.xl }]}>
      <View style={estilos.filaVocales}>
        {VOCALES.map((v) => (
          <Text key={v} style={estilos.vocalMuestra}>
            {v}
          </Text>
        ))}
      </View>
      <Texto variante="titulo">Vocales en Arena</Texto>
      <Texto>
        Esta app se conecta por Bluetooth con la placa de arena para enviarle la vocal elegida y mostrar lo que está
        haciendo.
      </Texto>
      <Texto colorTexto={color.grafito}>No usa internet ni tu ubicación. Al continuar, el iPhone te pedirá permiso para usar Bluetooth.</Texto>
      <Boton texto="Activar Bluetooth" icono="bluetooth" alTocar={alActivar} style={{ marginTop: espacio.m }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.aluminio },
  contenido: { paddingHorizontal: espacio.l, gap: espacio.l },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.m },
  engrane: { padding: 6 },
  encabezado: { gap: espacio.s, marginTop: espacio.s },
  explorar: {
    backgroundColor: color.placa,
    borderRadius: radio.panel,
    borderWidth: 1,
    borderColor: color.linea,
    padding: espacio.l,
    gap: espacio.s,
  },
  presionado: { opacity: 0.85 },
  filaVocales: { flexDirection: 'row', gap: espacio.m, marginBottom: espacio.s },
  vocalMuestra: { fontFamily: fuente.negrita, fontSize: 44, color: color.tinta, lineHeight: 50 },
  actividad: {
    backgroundColor: color.pizarra,
    borderRadius: radio.panel,
    padding: espacio.l,
    gap: espacio.s,
    overflow: 'hidden',
  },
  actividadCabeza: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  pista: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, marginTop: espacio.s },
  carril: { height: 6, borderRadius: 3, backgroundColor: '#25313B', marginTop: espacio.s, overflow: 'hidden' },
  relleno: { height: 6, backgroundColor: color.arena },
  pie: { gap: 2, marginTop: espacio.s },
  bienvenida: { paddingHorizontal: espacio.l, gap: espacio.m },
});
