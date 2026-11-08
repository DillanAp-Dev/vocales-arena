// Pantalla de prueba de instalación y de Bluetooth (v0.1).
// Sirve para validar la ruta gratuita de instalación y para la Prueba 1:
// buscar la placa, enviar A–U o PARA y ver los estados que responde el ESP32.
// La interfaz definitiva (modos exploración y actividad) llega en versiones posteriores.

import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BleManager, { BleState } from 'react-native-ble-manager';

import {
  NOMBRE_PLACA,
  UUID_ESTADO,
  UUID_ORDEN,
  UUID_SERVICIO,
  VOCALES,
  aBytes,
  deBytes,
  interpretarEstado,
  mismoUuid,
} from './src/ble/protocolo';

const VERSION_APP = Constants.expoConfig?.version ?? '0.0.0';
const SEGUNDOS_BUSQUEDA = 5;
const INTERVALO_REINTENTO_MS = 3000;
const REINTENTOS_MAXIMOS = 10; // 10 intentos cada 3 s = 30 s
const TIEMPO_CONEXION_MS = 8000;

function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error(`sin respuesta en ${ms / 1000} s`)), ms);
    promesa.then(
      (valor) => {
        clearTimeout(t);
        resolver(valor);
      },
      (error) => {
        clearTimeout(t);
        rechazar(error);
      },
    );
  });
}

type Conexion =
  | 'sin-iniciar'
  | 'bluetooth-apagado'
  | 'inactiva'
  | 'buscando'
  | 'no-encontrada'
  | 'conectando'
  | 'lista'
  | 'activa'
  | 'desconectada';

const ASPECTO: Record<Conexion, { color: string; simbolo: string; texto: string }> = {
  'sin-iniciar': { color: '#5F5E5A', simbolo: '•', texto: 'Bluetooth sin activar' },
  'bluetooth-apagado': { color: '#A32D2D', simbolo: '✕', texto: 'Enciende el Bluetooth del iPhone' },
  inactiva: { color: '#5F5E5A', simbolo: '•', texto: 'Toca «Buscar la placa»' },
  buscando: { color: '#5F5E5A', simbolo: '…', texto: 'Buscando la placa…' },
  'no-encontrada': { color: '#854F0B', simbolo: '!', texto: 'No encontré la placa' },
  conectando: { color: '#5F5E5A', simbolo: '…', texto: 'Conectando…' },
  lista: { color: '#3B6D11', simbolo: '✓', texto: 'Placa lista' },
  activa: { color: '#185FA5', simbolo: '≈', texto: 'Vibrando' },
  desconectada: { color: '#A32D2D', simbolo: '✕', texto: 'Sin conexión: toca para reconectar' },
};

function hora(): string {
  return new Date().toTimeString().slice(0, 8);
}

export default function App() {
  const [conexion, setConexion] = useState<Conexion>('sin-iniciar');
  const [vocalActiva, setVocalActiva] = useState<string | null>(null);
  const [firmware, setFirmware] = useState<string | null>(null);
  const [registro, setRegistro] = useState<string[]>([]);

  const idPlaca = useRef<string | null>(null);
  const conectando = useRef(false);
  const reintentos = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desconexionManual = useRef(false);

  const anotar = useCallback((linea: string) => {
    setRegistro((previo) => [`${hora()}  ${linea}`, ...previo].slice(0, 15));
  }, []);

  const prepararPlaca = useCallback(
    async (id: string) => {
      await BleManager.retrieveServices(id, [UUID_SERVICIO]);
      await BleManager.startNotification(id, UUID_SERVICIO, UUID_ESTADO);
      idPlaca.current = id;
      reintentos.current = 0;
      desconexionManual.current = false;
      setConexion('lista');
      anotar('Conectada; notificaciones de estado activas');
      await BleManager.write(id, UUID_SERVICIO, UUID_ORDEN, aBytes(`APP ${VERSION_APP}`));
      anotar(`Enviado: APP ${VERSION_APP}`);
    },
    [anotar],
  );

  const conectar = useCallback(
    async (id: string): Promise<boolean> => {
      if (conectando.current) return false;
      conectando.current = true;
      setConexion('conectando');
      try {
        await conTiempoLimite(BleManager.connect(id), TIEMPO_CONEXION_MS);
        await prepararPlaca(id);
        return true;
      } catch (error) {
        anotar(`No se pudo conectar: ${String(error)}`);
        // Cancela una conexión pendiente para que el siguiente intento empiece limpio.
        desconexionManual.current = true;
        await BleManager.disconnect(id).catch(() => undefined);
        setConexion('desconectada');
        return false;
      } finally {
        conectando.current = false;
      }
    },
    [anotar, prepararPlaca],
  );

  const reintentar = useCallback(() => {
    const id = idPlaca.current;
    if (!id) return;
    if (reintentos.current >= REINTENTOS_MAXIMOS) {
      anotar('Se agotaron los reintentos automáticos');
      return;
    }
    reintentos.current += 1;
    temporizador.current = setTimeout(async () => {
      anotar(`Reintento ${reintentos.current} de ${REINTENTOS_MAXIMOS}`);
      const conectada = await conectar(id);
      if (!conectada && idPlaca.current === id) reintentar();
    }, INTERVALO_REINTENTO_MS);
  }, [anotar, conectar]);

  useEffect(() => {
    const subs = [
      BleManager.onDidUpdateState(({ state }) => {
        anotar(`Bluetooth: ${state}`);
        if (state === BleState.On) {
          setConexion((c) => (c === 'bluetooth-apagado' || c === 'sin-iniciar' ? 'inactiva' : c));
        } else if (state === BleState.Off || state === BleState.Unauthorized) {
          setConexion('bluetooth-apagado');
        }
      }),
      BleManager.onDiscoverPeripheral((p) => {
        const nombre = p.name ?? p.advertising.localName ?? '';
        anotar(`Encontrada: ${nombre || p.id}`);
        if (!idPlaca.current && !conectando.current) {
          BleManager.stopScan().catch(() => undefined);
          conectar(p.id);
        }
      }),
      BleManager.onStopScan(() => {
        setConexion((c) => (c === 'buscando' ? 'no-encontrada' : c));
      }),
      BleManager.onDisconnectPeripheral(({ peripheral }) => {
        if (peripheral !== idPlaca.current) return;
        setVocalActiva(null);
        setConexion('desconectada');
        anotar('Desconectada');
        if (!desconexionManual.current) reintentar();
        desconexionManual.current = false;
      }),
      BleManager.onDidUpdateValueForCharacteristic(({ characteristic, value }) => {
        if (!mismoUuid(characteristic, UUID_ESTADO)) return;
        const texto = deBytes(value);
        anotar(`Estado: ${texto}`);
        const mensaje = interpretarEstado(texto);
        switch (mensaje.tipo) {
          case 'LISTO':
            setFirmware(mensaje.firmware);
            setConexion('lista');
            break;
          case 'ACTIVA':
            setVocalActiva(mensaje.vocal);
            setConexion('activa');
            break;
          case 'FIN':
            setVocalActiva(null);
            setConexion('lista');
            break;
          case 'ERROR':
            setVocalActiva(null);
            setConexion('lista');
            break;
        }
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [anotar, conectar, reintentar]);

  const activarBluetooth = async () => {
    try {
      await BleManager.start({ showAlert: false });
      const estado = await BleManager.checkState();
      anotar(`Bluetooth iniciado: ${estado}`);
      if (estado === BleState.On) setConexion('inactiva');
      else if (estado === BleState.Off || estado === BleState.Unauthorized) setConexion('bluetooth-apagado');
    } catch (error) {
      anotar(`Error al iniciar Bluetooth: ${String(error)}`);
    }
  };

  const buscarPlaca = async () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    reintentos.current = 0;
    const conocida = idPlaca.current;
    if (conocida) {
      await conectar(conocida);
      return;
    }
    setConexion('buscando');
    anotar(`Buscando ${NOMBRE_PLACA} durante ${SEGUNDOS_BUSQUEDA} s`);
    try {
      await BleManager.scan({ serviceUUIDs: [UUID_SERVICIO], seconds: SEGUNDOS_BUSQUEDA });
    } catch (error) {
      anotar(`Error al buscar: ${String(error)}`);
      setConexion('no-encontrada');
    }
  };

  const enviar = async (orden: string) => {
    const id = idPlaca.current;
    if (!id || (conexion !== 'lista' && conexion !== 'activa')) {
      anotar(`No se envió ${orden}: la placa no está lista`);
      return;
    }
    try {
      await BleManager.write(id, UUID_SERVICIO, UUID_ORDEN, aBytes(orden));
      anotar(`Enviado: ${orden}`);
    } catch (error) {
      anotar(`Error al enviar ${orden}: ${String(error)}`);
    }
  };

  const olvidarPlaca = async () => {
    const id = idPlaca.current;
    if (temporizador.current) clearTimeout(temporizador.current);
    idPlaca.current = null;
    setVocalActiva(null);
    setConexion('inactiva');
    if (id) {
      desconexionManual.current = true;
      await BleManager.disconnect(id).catch(() => undefined);
      anotar('Placa olvidada; vuelve a buscarla');
    }
  };

  const aspecto = ASPECTO[conexion];
  const textoEstado = conexion === 'activa' && vocalActiva ? `Vibrando: ${vocalActiva}` : aspecto.texto;
  const puedeEnviar = conexion === 'lista' || conexion === 'activa';

  if (conexion === 'sin-iniciar') {
    return (
      <View style={[estilos.pantalla, estilos.centro]}>
        <StatusBar style="light" />
        <Text style={estilos.titulo}>Vocales en Arena</Text>
        <Text style={estilos.parrafo}>
          Esta app usa Bluetooth para enviar la vocal elegida a la placa y mostrar lo que está haciendo. No usa
          internet ni tu ubicación.
        </Text>
        <Text style={estilos.parrafo}>Al tocar el botón, el iPhone te pedirá permiso para usar Bluetooth.</Text>
        <Pressable style={[estilos.boton, estilos.botonPrincipal]} onPress={activarBluetooth}>
          <Text style={estilos.textoBotonPrincipal}>Activar Bluetooth</Text>
        </Pressable>
        <Text style={estilos.pie}>Versión de prueba {VERSION_APP}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <StatusBar style="light" />
      <Text style={estilos.titulo}>Vocales en Arena</Text>
      <Text style={estilos.subtitulo}>
        Prueba de Bluetooth · app {VERSION_APP}
        {firmware ? ` · firmware ${firmware}` : ''}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={textoEstado}
        style={[estilos.estado, { borderColor: aspecto.color }]}
        onPress={conexion === 'desconectada' || conexion === 'no-encontrada' ? buscarPlaca : undefined}
      >
        <View style={[estilos.insignia, { backgroundColor: aspecto.color }]}>
          <Text style={estilos.simbolo}>{aspecto.simbolo}</Text>
        </View>
        <Text style={estilos.textoEstado}>{textoEstado}</Text>
      </Pressable>

      <View style={estilos.fila}>
        <Pressable style={[estilos.boton, estilos.botonSecundario, estilos.mitad]} onPress={buscarPlaca}>
          <Text style={estilos.textoBoton}>Buscar la placa</Text>
        </Pressable>
        <Pressable style={[estilos.boton, estilos.botonSecundario, estilos.mitad]} onPress={olvidarPlaca}>
          <Text style={estilos.textoBoton}>Olvidar la placa</Text>
        </Pressable>
      </View>

      <View style={estilos.vocales}>
        {VOCALES.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Vocal ${v}`}
            disabled={!puedeEnviar}
            style={[estilos.vocal, !puedeEnviar && estilos.deshabilitado]}
            onPress={() => enviar(v)}
          >
            <Text style={estilos.letra}>{v}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        disabled={!puedeEnviar}
        style={[estilos.boton, estilos.botonPara, !puedeEnviar && estilos.deshabilitado]}
        onPress={() => enviar('PARA')}
      >
        <Text style={estilos.textoBotonPrincipal}>PARA</Text>
      </Pressable>

      <Text style={estilos.encabezadoRegistro}>Registro</Text>
      <View style={estilos.registro}>
        {registro.length === 0 ? (
          <Text style={estilos.lineaRegistro}>Sin eventos todavía</Text>
        ) : (
          registro.map((linea, i) => (
            <Text key={`${i}-${linea}`} style={estilos.lineaRegistro}>
              {linea}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#22313F' },
  centro: { justifyContent: 'center', padding: 28, gap: 18 },
  contenido: { padding: 20, paddingTop: 64, gap: 16 },
  titulo: { color: '#FFFFFF', fontSize: 30, fontWeight: '600' },
  subtitulo: { color: '#D3D1C7', fontSize: 15 },
  parrafo: { color: '#F1EFE8', fontSize: 18, lineHeight: 26 },
  pie: { color: '#B4B2A9', fontSize: 14, marginTop: 12 },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderRadius: 14,
    padding: 16,
  },
  insignia: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  simbolo: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  textoEstado: { color: '#2C2C2A', fontSize: 22, fontWeight: '600', flexShrink: 1 },
  fila: { flexDirection: 'row', gap: 12 },
  mitad: { flex: 1 },
  boton: { minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  botonPrincipal: { backgroundColor: '#E9C46A' },
  botonSecundario: { backgroundColor: '#F1EFE8' },
  botonPara: { backgroundColor: '#E9C46A', minHeight: 64 },
  textoBoton: { color: '#2C2C2A', fontSize: 17, fontWeight: '600' },
  textoBotonPrincipal: { color: '#2C2C2A', fontSize: 20, fontWeight: '700' },
  vocales: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vocal: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    maxHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letra: { color: '#22313F', fontSize: 56, fontWeight: '700' },
  deshabilitado: { opacity: 0.4 },
  encabezadoRegistro: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginTop: 8 },
  registro: { backgroundColor: '#1A2530', borderRadius: 12, padding: 12, gap: 4 },
  lineaRegistro: { color: '#D3D1C7', fontSize: 13, fontFamily: 'Menlo' },
});
