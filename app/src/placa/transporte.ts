// Placa simulada para la vista previa web y para revisar la interfaz sin hardware.
// En el iPhone, Metro usa transporte.native.ts en lugar de este archivo.

import type { EstadoBluetooth, ManejadoresTransporte, Transporte } from './tipos';

const ID_SIMULADA = 'placa-simulada';
const DURACION_TONO_MS = 4000;

const manejadores = new Set<ManejadoresTransporte>();
let tonoActivo: { vocal: string; temporizador: ReturnType<typeof setTimeout> } | null = null;

function emitir(fn: (m: ManejadoresTransporte) => void) {
  manejadores.forEach(fn);
}

function terminarTono() {
  if (!tonoActivo) return;
  clearTimeout(tonoActivo.temporizador);
  const vocal = tonoActivo.vocal;
  tonoActivo = null;
  emitir((m) => m.alRecibirEstado(ID_SIMULADA, `FIN ${vocal}`));
}

export const transporte: Transporte = {
  simulado: true,

  async iniciar(): Promise<EstadoBluetooth> {
    setTimeout(() => emitir((m) => m.alCambiarBluetooth('on')), 50);
    return 'on';
  },

  async buscar(segundos) {
    setTimeout(() => emitir((m) => m.alEncontrar(ID_SIMULADA, 'Vocales-ESP32')), 600);
    setTimeout(() => emitir((m) => m.alTerminarBusqueda()), segundos * 1000);
  },

  async detenerBusqueda() {
    emitir((m) => m.alTerminarBusqueda());
  },

  async conectar() {
    await new Promise((r) => setTimeout(r, 300));
  },

  async desconectar() {
    terminarTono();
    emitir((m) => m.alDesconectar(ID_SIMULADA));
  },

  async escribir(_id, texto) {
    if (texto.startsWith('APP ')) {
      setTimeout(() => emitir((m) => m.alRecibirEstado(ID_SIMULADA, 'LISTO simulada')), 100);
      return;
    }
    if (texto === 'PARA') {
      terminarTono();
      return;
    }
    terminarTono();
    const vocal = texto;
    emitir((m) => m.alRecibirEstado(ID_SIMULADA, `ACTIVA ${vocal}`));
    tonoActivo = { vocal, temporizador: setTimeout(terminarTono, DURACION_TONO_MS) };
  },

  suscribir(m) {
    manejadores.add(m);
    return () => {
      manejadores.delete(m);
    };
  },
};
