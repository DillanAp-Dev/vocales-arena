// Transporte real: Bluetooth de baja energía con react-native-ble-manager.

import BleManager from 'react-native-ble-manager';

import { UUID_ESTADO, UUID_ORDEN, UUID_SERVICIO, aBytes, deBytes, mismoUuid } from './protocolo';
import type { EstadoBluetooth, ManejadoresTransporte, Transporte } from './tipos';

export const transporte: Transporte = {
  simulado: false,

  async iniciar() {
    await BleManager.start({ showAlert: false });
    return (await BleManager.checkState()) as EstadoBluetooth;
  },

  async buscar(segundos) {
    await BleManager.scan({ serviceUUIDs: [UUID_SERVICIO], seconds: segundos });
  },

  async detenerBusqueda() {
    await BleManager.stopScan();
  },

  async conectar(id) {
    await BleManager.connect(id);
    await BleManager.retrieveServices(id, [UUID_SERVICIO]);
    await BleManager.startNotification(id, UUID_SERVICIO, UUID_ESTADO);
  },

  async desconectar(id) {
    await BleManager.disconnect(id);
  },

  async escribir(id, texto) {
    await BleManager.write(id, UUID_SERVICIO, UUID_ORDEN, aBytes(texto));
  },

  suscribir(m: ManejadoresTransporte) {
    const subs = [
      BleManager.onDidUpdateState(({ state }) => m.alCambiarBluetooth(state as EstadoBluetooth)),
      BleManager.onDiscoverPeripheral((p) => m.alEncontrar(p.id, p.name ?? p.advertising.localName ?? '')),
      BleManager.onStopScan(() => m.alTerminarBusqueda()),
      BleManager.onDisconnectPeripheral(({ peripheral }) => m.alDesconectar(peripheral)),
      BleManager.onDidUpdateValueForCharacteristic(({ peripheral, characteristic, value }) => {
        if (mismoUuid(characteristic, UUID_ESTADO)) m.alRecibirEstado(peripheral, deBytes(value));
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  },
};
