// Estado compartido de la conexión con la placa: buscar, conectar, reconectar y enviar órdenes.

import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { guardarAjustes, leerAjustes } from '../ajustes';
import { NOMBRE_PLACA, interpretarEstado, type MensajeEstado } from './protocolo';
import type { EstadoBluetooth } from './tipos';
import { transporte } from './transporte';

export const VERSION_APP = Constants.expoConfig?.version ?? '0.0.0';

const SEGUNDOS_BUSQUEDA = 5;
const TIEMPO_CONEXION_MS = 8000;
const INTERVALO_REINTENTO_MS = 3000;
const REINTENTOS_MAXIMOS = 10; // 10 intentos cada 3 s = 30 s

export type Conexion =
  | 'sin-iniciar'
  | 'bluetooth-apagado'
  | 'inactiva'
  | 'buscando'
  | 'no-encontrada'
  | 'conectando'
  | 'lista'
  | 'activa'
  | 'desconectada';

type ValorPlaca = {
  conexion: Conexion;
  /** La vocal que está sonando según el ESP32. El modo actividad nunca debe mostrarla. */
  vocalActiva: string | null;
  firmware: string | null;
  registro: string[];
  simulada: boolean;
  disponible: boolean;
  activarBluetooth(): Promise<void>;
  buscar(): Promise<void>;
  olvidar(): Promise<void>;
  enviar(orden: string): Promise<boolean>;
  escucharEstado(fn: (mensaje: MensajeEstado) => void): () => void;
};

const ContextoPlaca = createContext<ValorPlaca | null>(null);

function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error(`sin respuesta en ${ms / 1000} s`)), ms);
    promesa.then(
      (v) => {
        clearTimeout(t);
        resolver(v);
      },
      (e) => {
        clearTimeout(t);
        rechazar(e);
      },
    );
  });
}

function hora(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function PlacaProvider({ children }: { children: ReactNode }) {
  const [conexion, setConexion] = useState<Conexion>('sin-iniciar');
  const [vocalActiva, setVocalActiva] = useState<string | null>(null);
  const [firmware, setFirmware] = useState<string | null>(null);
  const [registro, setRegistro] = useState<string[]>([]);

  const idPlaca = useRef<string | null>(null);
  const conectando = useRef(false);
  const buscando = useRef(false);
  const reintentos = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desconexionManual = useRef(false);
  const oyentes = useRef(new Set<(m: MensajeEstado) => void>());

  const anotar = useCallback((linea: string) => {
    setRegistro((previo) => [`${hora()}  ${linea}`, ...previo].slice(0, 40));
  }, []);

  const conectar = useCallback(
    async (id: string): Promise<boolean> => {
      if (conectando.current) return false;
      conectando.current = true;
      setConexion('conectando');
      try {
        await conTiempoLimite(transporte.conectar(id), TIEMPO_CONEXION_MS);
        idPlaca.current = id;
        reintentos.current = 0;
        desconexionManual.current = false;
        setConexion('lista');
        anotar('Conectada; notificaciones de estado activas');
        await transporte.escribir(id, `APP ${VERSION_APP}`);
        anotar(`Enviado: APP ${VERSION_APP}`);
        return true;
      } catch (error) {
        anotar(`No se pudo conectar: ${String(error)}`);
        desconexionManual.current = true;
        await transporte.desconectar(id).catch(() => undefined);
        setConexion('desconectada');
        return false;
      } finally {
        conectando.current = false;
      }
    },
    [anotar],
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
      const ok = await conectar(id);
      if (!ok && idPlaca.current === id) reintentar();
    }, INTERVALO_REINTENTO_MS);
  }, [anotar, conectar]);

  const buscar = useCallback(async () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    reintentos.current = 0;
    if (idPlaca.current) {
      await conectar(idPlaca.current);
      return;
    }
    if (buscando.current) return;
    buscando.current = true;
    setConexion('buscando');
    anotar(`Buscando ${NOMBRE_PLACA} durante ${SEGUNDOS_BUSQUEDA} s`);
    try {
      await transporte.buscar(SEGUNDOS_BUSQUEDA);
    } catch (error) {
      buscando.current = false;
      anotar(`Error al buscar: ${String(error)}`);
      setConexion('no-encontrada');
    }
  }, [anotar, conectar]);

  const alEstadoBluetooth = useCallback(
    (estado: EstadoBluetooth) => {
      if (estado === 'on') {
        setConexion((c) => {
          if (c === 'sin-iniciar' || c === 'bluetooth-apagado') {
            setTimeout(() => buscar(), 0);
            return 'inactiva';
          }
          return c;
        });
      } else if (estado === 'off' || estado === 'unauthorized' || estado === 'unsupported') {
        setConexion('bluetooth-apagado');
      }
    },
    [buscar],
  );

  useEffect(() => {
    const desuscribir = transporte.suscribir({
      alCambiarBluetooth(estado) {
        anotar(`Bluetooth: ${estado}`);
        alEstadoBluetooth(estado);
      },
      alEncontrar(id, nombre) {
        anotar(`Encontrada: ${nombre || id}`);
        if (!idPlaca.current && !conectando.current) {
          buscando.current = false;
          transporte.detenerBusqueda().catch(() => undefined);
          conectar(id);
        }
      },
      alTerminarBusqueda() {
        buscando.current = false;
        setConexion((c) => (c === 'buscando' ? 'no-encontrada' : c));
      },
      alDesconectar(id) {
        if (id !== idPlaca.current) return;
        setVocalActiva(null);
        setConexion('desconectada');
        anotar('Desconectada');
        if (!desconexionManual.current) reintentar();
        desconexionManual.current = false;
      },
      alRecibirEstado(_id, texto) {
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
          case 'ERROR':
            setVocalActiva(null);
            setConexion('lista');
            break;
        }
        oyentes.current.forEach((fn) => fn(mensaje));
      },
    });
    return () => {
      desuscribir();
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [alEstadoBluetooth, anotar, conectar, reintentar]);

  const activarBluetooth = useCallback(async () => {
    try {
      const estado = await transporte.iniciar();
      guardarAjustes({ bluetoothExplicado: true });
      anotar(`Bluetooth iniciado: ${estado}`);
      alEstadoBluetooth(estado);
    } catch (error) {
      anotar(`Error al iniciar Bluetooth: ${String(error)}`);
    }
  }, [alEstadoBluetooth, anotar]);

  // Si el permiso ya se dio antes, arranca y busca la placa sin pedir nada.
  useEffect(() => {
    if (leerAjustes().bluetoothExplicado) activarBluetooth();
  }, [activarBluetooth]);

  const olvidar = useCallback(async () => {
    const id = idPlaca.current;
    if (temporizador.current) clearTimeout(temporizador.current);
    idPlaca.current = null;
    setVocalActiva(null);
    setConexion('inactiva');
    if (id) {
      desconexionManual.current = true;
      await transporte.desconectar(id).catch(() => undefined);
      anotar('Placa olvidada');
    }
  }, [anotar]);

  const disponible = conexion === 'lista' || conexion === 'activa';

  const enviar = useCallback(
    async (orden: string) => {
      const id = idPlaca.current;
      if (!id || !disponible) {
        anotar(`No se envió ${orden}: la placa no está lista`);
        return false;
      }
      try {
        await transporte.escribir(id, orden);
        anotar(`Enviado: ${orden}`);
        return true;
      } catch (error) {
        anotar(`Error al enviar ${orden}: ${String(error)}`);
        return false;
      }
    },
    [anotar, disponible],
  );

  const escucharEstado = useCallback((fn: (m: MensajeEstado) => void) => {
    oyentes.current.add(fn);
    return () => {
      oyentes.current.delete(fn);
    };
  }, []);

  const valor = useMemo<ValorPlaca>(
    () => ({
      conexion,
      vocalActiva,
      firmware,
      registro,
      simulada: transporte.simulado,
      disponible,
      activarBluetooth,
      buscar,
      olvidar,
      enviar,
      escucharEstado,
    }),
    [conexion, vocalActiva, firmware, registro, disponible, activarBluetooth, buscar, olvidar, enviar, escucharEstado],
  );

  return <ContextoPlaca.Provider value={valor}>{children}</ContextoPlaca.Provider>;
}

export function usePlaca(): ValorPlaca {
  const valor = useContext(ContextoPlaca);
  if (!valor) throw new Error('usePlaca debe usarse dentro de PlacaProvider');
  return valor;
}
