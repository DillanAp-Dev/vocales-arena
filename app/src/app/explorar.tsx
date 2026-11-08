import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTENIDO } from '../contenido/vocales';
import { VOCALES, type Vocal } from '../placa/protocolo';
import { usePlaca } from '../placa/PlacaProvider';
import { Boton, EstadoPlaca, Patron, Sena, Texto } from '../ui/componentes';
import { color, espacio, fuente, radio, tamano } from '../ui/tema';

const DURACION_TONO_MS = 15000;

export default function Explorar() {
  const placa = usePlaca();
  const inset = useSafeAreaInsets();
  const [pendiente, setPendiente] = useState<Vocal | null>(null);

  // La vocal que se muestra en grande: la que confirmó el ESP32 o la recién tocada.
  const mostrada = (placa.conexion === 'activa' && placa.vocalActiva ? placa.vocalActiva : pendiente) as Vocal | null;

  useEffect(
    () =>
      placa.escucharEstado((m) => {
        if (m.tipo === 'FIN' || m.tipo === 'ERROR') setPendiente(null);
      }),
    [placa],
  );

  const tocar = async (v: Vocal) => {
    setPendiente(v);
    const enviada = await placa.enviar(v);
    if (!enviada) setPendiente(null);
  };

  if (mostrada && CONTENIDO[mostrada]) {
    return <Vibrando vocal={mostrada} alDetener={() => placa.enviar('PARA')} margenInferior={inset.bottom} />;
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: inset.bottom + espacio.l }]}
    >
      <EstadoPlaca conexion={placa.conexion} vocalActiva={placa.vocalActiva} simulada={placa.simulada} alTocar={placa.buscar} />
      {!placa.disponible ? (
        <Texto colorTexto={color.grafito}>Conecta la placa para que la arena se mueva al tocar una vocal.</Texto>
      ) : (
        <Texto colorTexto={color.grafito}>Toca una vocal. Mira la arena mientras se forma su patrón.</Texto>
      )}
      <View style={estilos.rejilla}>
        {VOCALES.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Vocal ${v}`}
            accessibilityState={{ disabled: !placa.disponible }}
            disabled={!placa.disponible}
            onPress={() => tocar(v)}
            style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada, !placa.disponible && estilos.apagada]}
          >
            <View style={estilos.letras}>
              <Text style={estilos.mayuscula}>{v}</Text>
              <Text style={estilos.minuscula}>{CONTENIDO[v].minuscula}</Text>
            </View>
            <View style={estilos.ranuras}>
              <Sena contenido={CONTENIDO[v]} tamanoCaja={60} />
              <Patron contenido={CONTENIDO[v]} tamanoCaja={60} />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={estilos.leyenda}>
        <MaterialCommunityIcons name="hand-back-left-outline" size={20} color={color.grafito} />
        <Texto variante="pequeno" colorTexto={color.grafito} style={{ flexShrink: 1 }}>
          Los recuadros punteados se llenarán con la foto de la seña validada y la del patrón calibrado de cada vocal.
        </Texto>
      </View>
    </ScrollView>
  );
}

function Vibrando({ vocal, alDetener, margenInferior }: { vocal: Vocal; alDetener: () => void; margenInferior: number }) {
  const contenido = CONTENIDO[vocal];
  const avance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    avance.setValue(0);
    const anim = Animated.timing(avance, {
      toValue: 1,
      duration: DURACION_TONO_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [avance, vocal]);

  return (
    <View style={[estilos.vibrando, { paddingBottom: margenInferior + espacio.l }]}>
      <View style={estilos.vibrandoCentro}>
        <View style={estilos.letrasGigantes} accessible accessibilityLabel={`Vibrando: ${vocal}`}>
          <Text style={estilos.gigante}>{vocal}</Text>
          <Text style={estilos.giganteMinuscula}>{contenido.minuscula}</Text>
        </View>
        <Sena contenido={contenido} tamanoCaja={132} />
        <Texto colorTexto={color.grafito} style={{ textAlign: 'center' }}>
          Mira cómo se forma el patrón en la arena.
        </Texto>
      </View>
      <View style={estilos.carril}>
        <Animated.View
          style={[estilos.relleno, { width: avance.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
      <Boton texto="Detener" icono="stop-circle-outline" tipo="secundario" alTocar={alDetener} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.aluminio },
  contenido: { padding: espacio.l, gap: espacio.m },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m },
  tarjeta: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: color.placa,
    borderRadius: radio.panel,
    borderWidth: 1,
    borderColor: color.linea,
    padding: espacio.m,
    gap: espacio.m,
  },
  presionada: { backgroundColor: color.arenaSuave },
  apagada: { opacity: 0.5 },
  letras: { flexDirection: 'row', alignItems: 'baseline', gap: espacio.s },
  mayuscula: { fontFamily: fuente.negrita, fontSize: tamano.vocal, lineHeight: tamano.vocal * 1.05, color: color.tinta },
  minuscula: { fontFamily: fuente.regular, fontSize: 40, color: color.grafito },
  ranuras: { flexDirection: 'row', gap: espacio.s },
  vibrando: { flex: 1, backgroundColor: color.aluminio, padding: espacio.l, gap: espacio.l },
  vibrandoCentro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.l },
  letrasGigantes: { flexDirection: 'row', alignItems: 'baseline', gap: espacio.m },
  gigante: { fontFamily: fuente.negrita, fontSize: tamano.vocalGigante, lineHeight: tamano.vocalGigante * 1.05, color: color.tinta },
  giganteMinuscula: { fontFamily: fuente.regular, fontSize: 96, color: color.grafito },
  leyenda: { flexDirection: 'row', gap: espacio.s, alignItems: 'flex-start' },
  carril: { height: 8, borderRadius: 4, backgroundColor: color.linea, overflow: 'hidden' },
  relleno: { height: 8, backgroundColor: color.activa },
});
