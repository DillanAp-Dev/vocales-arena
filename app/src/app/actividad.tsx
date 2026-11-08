// Modo actividad: la app elige en secreto la vocal, la placa forma el patrón sin revelar cuál es,
// la persona responde y solo entonces recibe la confirmación visual.

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { compartirCsv, type Ronda } from '../actividad/registroCsv';
import { generarSecuencia } from '../actividad/secuencia';
import { leerAjustes } from '../ajustes';
import { CONTENIDO } from '../contenido/vocales';
import { VOCALES, type Vocal } from '../placa/protocolo';
import { VERSION_APP, usePlaca } from '../placa/PlacaProvider';
import { Boton, EstadoPlaca, Sena, Texto } from '../ui/componentes';
import { color, espacio, fuente, radio } from '../ui/tema';

type Fase = 'preparar' | 'lista' | 'observando' | 'respondiendo' | 'retro' | 'resumen';

const DURACION_TONO_MS = 15000;
const RESPALDO_FIN_MS = 16500; // si no llega FIN, se pasa a responder de todos modos

export default function Actividad() {
  useKeepAwake();
  const placa = usePlaca();
  const router = useRouter();
  const inset = useSafeAreaInsets();

  const [fase, setFase] = useState<Fase>('preparar');
  const [codigo, setCodigo] = useState('P01');
  const [total, setTotal] = useState<5 | 10>(10);
  const [secuencia, setSecuencia] = useState<Vocal[]>([]);
  const [indice, setIndice] = useState(0);
  const [rondas, setRondas] = useState<Ronda[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  const faseActual = useRef<Fase>(fase);
  faseActual.current = fase;
  const inicioRespuesta = useRef(0);
  const respaldo = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pasarAResponder = useCallback(() => {
    if (faseActual.current !== 'observando') return;
    if (respaldo.current) clearTimeout(respaldo.current);
    inicioRespuesta.current = Date.now();
    setFase('respondiendo');
  }, []);

  useEffect(
    () =>
      placa.escucharEstado((m) => {
        if (faseActual.current !== 'observando') return;
        if (m.tipo === 'FIN') pasarAResponder();
        if (m.tipo === 'ERROR') {
          if (respaldo.current) clearTimeout(respaldo.current);
          setAviso(`La placa no pudo formar el patrón (${m.motivo}). Repite la ronda.`);
          setFase('lista');
        }
      }),
    [placa, pasarAResponder],
  );

  // Si se pierde la conexión a media ronda, la ronda se repite al reconectar.
  useEffect(() => {
    if (fase === 'observando' && (placa.conexion === 'desconectada' || placa.conexion === 'bluetooth-apagado')) {
      if (respaldo.current) clearTimeout(respaldo.current);
      setAviso('Se perdió la conexión con la placa. Cuando vuelva a estar lista, repite la ronda.');
      setFase('lista');
    }
  }, [fase, placa.conexion]);

  useEffect(() => () => {
    if (respaldo.current) clearTimeout(respaldo.current);
  }, []);

  const empezar = () => {
    setSecuencia(generarSecuencia(total));
    setIndice(0);
    setRondas([]);
    setAviso(null);
    setFase('lista');
  };

  const formarPatron = async () => {
    setAviso(null);
    setFase('observando');
    const enviada = await placa.enviar(secuencia[indice]);
    if (!enviada) {
      setAviso('No se pudo enviar la orden a la placa. Revisa la conexión y repite la ronda.');
      setFase('lista');
      return;
    }
    respaldo.current = setTimeout(pasarAResponder, RESPALDO_FIN_MS);
  };

  const responder = (respuesta: Vocal) => {
    const objetivo = secuencia[indice];
    const correcta = respuesta === objetivo;
    setRondas((previas) => [
      ...previas,
      {
        participante: codigo.trim().toUpperCase(),
        ronda: indice + 1,
        objetivo,
        respuesta,
        correcta,
        tiempoRespuestaS: (Date.now() - inicioRespuesta.current) / 1000,
        hora: new Date().toISOString(),
        app: VERSION_APP,
        firmware: placa.firmware ?? 'desconocido',
        voz: leerAjustes().voz,
      },
    ]);
    Haptics.notificationAsync(
      correcta ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => undefined);
    setFase('retro');
  };

  const siguiente = () => {
    if (indice + 1 >= secuencia.length) {
      setFase('resumen');
      return;
    }
    setIndice((i) => i + 1);
    setFase('lista');
  };

  const salir = () => {
    if (fase === 'preparar' || fase === 'resumen' || confirmarSalida) {
      if (fase === 'observando') placa.enviar('PARA');
      router.back();
      return;
    }
    setConfirmarSalida(true);
    setTimeout(() => setConfirmarSalida(false), 3000);
  };

  const oscura = fase === 'observando';
  const ultima = rondas[rondas.length - 1];

  return (
    <View style={[estilos.pantalla, oscura && estilos.pantallaOscura, { paddingTop: inset.top + espacio.s }]}>
      <StatusBar style={oscura ? 'light' : 'dark'} />
      <View style={estilos.barra}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={salir} style={estilos.salir}>
          <MaterialCommunityIcons name="close" size={24} color={oscura ? color.sal : color.grafito} />
          <Text style={[estilos.textoSalir, { color: oscura ? color.sal : color.grafito }]}>
            {confirmarSalida ? 'Toca otra vez para salir' : 'Salir'}
          </Text>
        </Pressable>
        {fase !== 'preparar' && fase !== 'resumen' ? (
          <Text style={[estilos.contador, { color: oscura ? color.sal : color.grafito }]}>
            Ronda {indice + 1} de {secuencia.length}
          </Text>
        ) : null}
      </View>

      {fase === 'preparar' ? (
        <Preparar
          codigo={codigo}
          setCodigo={setCodigo}
          total={total}
          setTotal={setTotal}
          disponible={placa.disponible}
          estado={<EstadoPlaca conexion={placa.conexion} ocultarVocal simulada={placa.simulada} alTocar={placa.buscar} />}
          alEmpezar={empezar}
          margenInferior={inset.bottom}
        />
      ) : null}

      {fase === 'lista' ? (
        <View style={[estilos.centro, { paddingBottom: inset.bottom + espacio.l }]}>
          <View style={estilos.bloqueCentral}>
            <MaterialCommunityIcons name="broom" size={44} color={color.grafito} />
            <Texto variante="encabezado" style={estilos.centrado}>
              Barre y alisa la arena
            </Texto>
            <Texto colorTexto={color.grafito} style={estilos.centrado}>
              Cuando la placa esté lista, toca «Formar patrón». La vocal se elige sin mostrarse.
            </Texto>
            {aviso ? (
              <View style={estilos.aviso}>
                <MaterialCommunityIcons name="alert-circle-outline" size={22} color={color.aviso} />
                <Texto variante="pequeno" colorTexto={color.aviso} style={{ flexShrink: 1 }}>
                  {aviso}
                </Texto>
              </View>
            ) : null}
          </View>
          <EstadoPlaca conexion={placa.conexion} ocultarVocal simulada={placa.simulada} alTocar={placa.buscar} />
          <Boton texto="Formar patrón" icono="waveform" alTocar={formarPatron} deshabilitado={!placa.disponible} />
        </View>
      ) : null}

      {fase === 'observando' ? <Observando margenInferior={inset.bottom} /> : null}

      {fase === 'respondiendo' ? <Responder alResponder={responder} margenInferior={inset.bottom} /> : null}

      {fase === 'retro' && ultima ? (
        <Retroalimentacion
          ronda={ultima}
          ultima={indice + 1 >= secuencia.length}
          alSeguir={siguiente}
          margenInferior={inset.bottom}
        />
      ) : null}

      {fase === 'resumen' ? (
        <Resumen
          rondas={rondas}
          alRepetir={() => setFase('preparar')}
          alTerminar={() => router.back()}
          margenInferior={inset.bottom}
        />
      ) : null}
    </View>
  );
}

function Preparar({
  codigo,
  setCodigo,
  total,
  setTotal,
  disponible,
  estado,
  alEmpezar,
  margenInferior,
}: {
  codigo: string;
  setCodigo: (c: string) => void;
  total: 5 | 10;
  setTotal: (t: 5 | 10) => void;
  disponible: boolean;
  estado: ReactNode;
  alEmpezar: () => void;
  margenInferior: number;
}) {
  const codigoValido = /^P\d{2,3}$/i.test(codigo.trim());
  return (
    <ScrollView contentContainerStyle={[estilos.preparar, { paddingBottom: margenInferior + espacio.l }]}>
      <Texto variante="titulo">Actividad</Texto>
      <Texto colorTexto={color.grafito}>
        La placa formará un patrón sin decir cuál vocal es. Después, la persona elige la vocal que cree que fue.
      </Texto>
      {estado}

      <View style={estilos.campo}>
        <Texto variante="cuerpoNegrita">Código de la persona participante</Texto>
        <TextInput
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={4}
          placeholder="P01"
          placeholderTextColor={color.grafito}
          accessibilityLabel="Código de la persona participante"
          style={[estilos.entrada, !codigoValido && estilos.entradaError]}
        />
        <Texto variante="pequeno" colorTexto={codigoValido ? color.grafito : color.desconectada}>
          {codigoValido ? 'Solo el código: no escribas nombres.' : 'Usa una P y dos o tres números, por ejemplo P01.'}
        </Texto>
      </View>

      <View style={estilos.campo}>
        <Texto variante="cuerpoNegrita">Rondas</Texto>
        <View style={estilos.segmentos}>
          {([5, 10] as const).map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: total === n }}
              onPress={() => setTotal(n)}
              style={[estilos.segmento, total === n && estilos.segmentoActivo]}
            >
              <Text style={[estilos.textoSegmento, total === n && estilos.textoSegmentoActivo]}>{n} rondas</Text>
            </Pressable>
          ))}
        </View>
        <Texto variante="pequeno" colorTexto={color.grafito}>
          Cada vocal aparece {total / 5 === 1 ? 'una vez' : 'dos veces'}, en orden aleatorio.
        </Texto>
      </View>

      <Boton texto="Empezar" icono="play" alTocar={alEmpezar} deshabilitado={!disponible || !codigoValido} />
      {!disponible ? (
        <Texto variante="pequeno" colorTexto={color.grafito}>
          Conecta la placa para empezar.
        </Texto>
      ) : null}
    </ScrollView>
  );
}

/** Mientras se forma el patrón la pantalla se oscurece: la atención va a la placa, no al teléfono. */
function Observando({ margenInferior }: { margenInferior: number }) {
  const avance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(avance, {
      toValue: 1,
      duration: DURACION_TONO_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [avance]);

  return (
    <View style={[estilos.observando, { paddingBottom: margenInferior + espacio.xl }]}>
      <View style={estilos.observandoCentro}>
        <MaterialCommunityIcons name="eye-outline" size={56} color={color.arena} />
        <Text style={estilos.observaTexto} accessibilityRole="header">
          Observa la arena
        </Text>
      </View>
      <View style={estilos.carrilOscuro}>
        <Animated.View
          style={[estilos.rellenoArena, { width: avance.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
      <Text style={estilos.activa}>Activa</Text>
    </View>
  );
}

function Responder({ alResponder, margenInferior }: { alResponder: (v: Vocal) => void; margenInferior: number }) {
  return (
    <View style={[estilos.responder, { paddingBottom: margenInferior + espacio.l }]}>
      <Texto variante="titulo" style={estilos.centrado}>
        ¿Qué vocal fue?
      </Texto>
      <View style={estilos.respuestas}>
        {VOCALES.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Responder ${v}`}
            onPress={() => alResponder(v)}
            style={({ pressed }) => [estilos.respuesta, pressed && estilos.respuestaPresionada]}
          >
            <Text style={estilos.letraRespuesta}>{v}</Text>
            <Sena contenido={CONTENIDO[v]} tamanoCaja={52} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Retroalimentacion({
  ronda,
  ultima,
  alSeguir,
  margenInferior,
}: {
  ronda: Ronda;
  ultima: boolean;
  alSeguir: () => void;
  margenInferior: number;
}) {
  const tono = ronda.correcta ? color.lista : color.aviso;
  return (
    <View style={[estilos.centro, { paddingBottom: margenInferior + espacio.l }]}>
      <View style={estilos.bloqueCentral}>
        <View style={[estilos.sello, { backgroundColor: tono }]}>
          <MaterialCommunityIcons name={ronda.correcta ? 'check-bold' : 'arrow-right-bold'} size={34} color="#FFFFFF" />
          <Text style={estilos.textoSello}>{ronda.correcta ? 'Correcto' : `Era la ${ronda.objetivo}`}</Text>
        </View>
        <View style={estilos.letrasRetro} accessible accessibilityLabel={`La vocal era ${ronda.objetivo}`}>
          <Text style={estilos.letraRetro}>{ronda.objetivo}</Text>
          <Text style={estilos.minusculaRetro}>{CONTENIDO[ronda.objetivo].minuscula}</Text>
        </View>
        <Sena contenido={CONTENIDO[ronda.objetivo]} tamanoCaja={120} />
        {!ronda.correcta ? (
          <Texto colorTexto={color.grafito} style={estilos.centrado}>
            Respuesta: {ronda.respuesta}
          </Texto>
        ) : null}
      </View>
      <Boton texto={ultima ? 'Ver resultados' : 'Siguiente ronda'} icono="arrow-right" alTocar={alSeguir} />
    </View>
  );
}

function Resumen({
  rondas,
  alRepetir,
  alTerminar,
  margenInferior,
}: {
  rondas: Ronda[];
  alRepetir: () => void;
  alTerminar: () => void;
  margenInferior: number;
}) {
  const [nota, setNota] = useState<string | null>(null);
  const aciertos = rondas.filter((r) => r.correcta).length;
  const promedio = rondas.length ? rondas.reduce((s, r) => s + r.tiempoRespuestaS, 0) / rondas.length : 0;

  const compartir = async () => {
    try {
      const resultado = await compartirCsv(rondas);
      if (resultado === 'no-disponible') setNota('Compartir no está disponible en este dispositivo.');
    } catch (error) {
      setNota(`No se pudo crear el archivo: ${String(error)}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={[estilos.preparar, { paddingBottom: margenInferior + espacio.l }]}>
      <Texto variante="titulo">Resultados de {rondas[0]?.participante ?? ''}</Texto>
      <View style={estilos.marcador}>
        <Text style={estilos.marcadorNumero}>
          {aciertos} de {rondas.length}
        </Text>
        <Texto colorTexto={color.grafito}>respuestas correctas</Texto>
      </View>
      <Texto colorTexto={color.grafito}>Tiempo promedio de respuesta: {promedio.toFixed(1)} s</Texto>

      <View style={estilos.tabla}>
        {VOCALES.map((v) => {
          const deVocal = rondas.filter((r) => r.objetivo === v);
          const bien = deVocal.filter((r) => r.correcta).length;
          return (
            <View key={v} style={estilos.filaTabla}>
              <Text style={estilos.letraTabla}>{v}</Text>
              <View style={estilos.puntos}>
                {deVocal.map((r) => (
                  <MaterialCommunityIcons
                    key={r.ronda}
                    name={r.correcta ? 'check-circle' : 'close-circle-outline'}
                    size={24}
                    color={r.correcta ? color.lista : color.aviso}
                    accessibilityLabel={r.correcta ? 'correcta' : `respondió ${r.respuesta}`}
                  />
                ))}
              </View>
              <Texto variante="pequeno" colorTexto={color.grafito}>
                {bien} de {deVocal.length}
              </Texto>
            </View>
          );
        })}
      </View>

      <Boton texto="Compartir resultados (CSV)" icono="export-variant" alTocar={compartir} />
      {nota ? (
        <Texto variante="pequeno" colorTexto={color.aviso}>
          {nota}
        </Texto>
      ) : null}
      <Boton texto="Otra persona" icono="account-plus-outline" tipo="secundario" alTocar={alRepetir} />
      <Boton texto="Volver al inicio" tipo="secundario" alTocar={alTerminar} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.aluminio },
  pantallaOscura: { backgroundColor: color.pizarra },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.l,
    minHeight: 44,
  },
  salir: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  textoSalir: { fontFamily: fuente.negrita, fontSize: 16 },
  contador: { fontFamily: fuente.negrita, fontSize: 16 },
  centro: { flex: 1, paddingHorizontal: espacio.l, gap: espacio.l },
  bloqueCentral: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.m },
  centrado: { textAlign: 'center' },
  aviso: {
    flexDirection: 'row',
    gap: espacio.s,
    backgroundColor: color.arenaSuave,
    borderRadius: radio.boton,
    padding: espacio.m,
    alignItems: 'flex-start',
  },
  preparar: { padding: espacio.l, gap: espacio.l },
  campo: { gap: espacio.s },
  entrada: {
    backgroundColor: color.placa,
    borderWidth: 1,
    borderColor: color.linea,
    borderRadius: radio.boton,
    minHeight: 56,
    paddingHorizontal: espacio.m,
    fontFamily: fuente.negrita,
    fontSize: 22,
    color: color.tinta,
    letterSpacing: 2,
  },
  entradaError: { borderColor: color.desconectada, borderWidth: 2 },
  segmentos: { flexDirection: 'row', gap: espacio.s },
  segmento: {
    flex: 1,
    minHeight: 52,
    borderRadius: radio.boton,
    borderWidth: 1,
    borderColor: color.linea,
    backgroundColor: color.placa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentoActivo: { backgroundColor: color.tinta, borderColor: color.tinta },
  textoSegmento: { fontFamily: fuente.negrita, fontSize: 17, color: color.tinta },
  textoSegmentoActivo: { color: color.placa },
  observando: { flex: 1, paddingHorizontal: espacio.xl, gap: espacio.l },
  observandoCentro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.m },
  observaTexto: { fontFamily: fuente.negrita, fontSize: 40, lineHeight: 46, color: color.sal, textAlign: 'center' },
  carrilOscuro: { height: 6, borderRadius: 3, backgroundColor: '#25313B', overflow: 'hidden' },
  rellenoArena: { height: 6, backgroundColor: color.arena },
  activa: { fontFamily: fuente.regular, fontSize: 15, color: '#9AA7B2', textAlign: 'center' },
  responder: { flex: 1, paddingHorizontal: espacio.l, paddingTop: espacio.l, gap: espacio.l },
  respuestas: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m, alignContent: 'center' },
  respuesta: {
    flexGrow: 1,
    flexBasis: '28%',
    minHeight: 150,
    backgroundColor: color.placa,
    borderRadius: radio.panel,
    borderWidth: 1,
    borderColor: color.linea,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.s,
    paddingVertical: espacio.m,
  },
  respuestaPresionada: { backgroundColor: color.arenaSuave },
  letraRespuesta: { fontFamily: fuente.negrita, fontSize: 64, lineHeight: 70, color: color.tinta },
  sello: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    borderRadius: radio.pastilla,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  textoSello: { fontFamily: fuente.negrita, fontSize: 24, color: '#FFFFFF' },
  letrasRetro: { flexDirection: 'row', alignItems: 'baseline', gap: espacio.m },
  letraRetro: { fontFamily: fuente.negrita, fontSize: 160, lineHeight: 170, color: color.tinta },
  minusculaRetro: { fontFamily: fuente.regular, fontSize: 72, color: color.grafito },
  marcador: { gap: 2 },
  marcadorNumero: { fontFamily: fuente.negrita, fontSize: 56, lineHeight: 62, color: color.tinta },
  tabla: {
    backgroundColor: color.placa,
    borderRadius: radio.panel,
    borderWidth: 1,
    borderColor: color.linea,
    paddingHorizontal: espacio.m,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.linea,
  },
  letraTabla: { fontFamily: fuente.negrita, fontSize: 26, width: 32, color: color.tinta },
  puntos: { flex: 1, flexDirection: 'row', gap: 6 },
});
