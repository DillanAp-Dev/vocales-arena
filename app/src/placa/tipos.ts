// Contrato entre el proveedor de la placa y la forma de hablar con ella.
// En el iPhone se usa Bluetooth (transporte.native.ts); en la vista previa web, una placa simulada (transporte.ts).

export type EstadoBluetooth = 'on' | 'off' | 'unauthorized' | 'unsupported' | 'unknown' | 'resetting';

export interface ManejadoresTransporte {
  alCambiarBluetooth(estado: EstadoBluetooth): void;
  alEncontrar(id: string, nombre: string): void;
  alTerminarBusqueda(): void;
  alDesconectar(id: string): void;
  alRecibirEstado(id: string, texto: string): void;
}

export interface Transporte {
  /** true si la placa es simulada (vista previa sin hardware). */
  readonly simulado: boolean;
  /** Arranca Bluetooth. En iOS, la primera vez muestra el aviso de permiso. */
  iniciar(): Promise<EstadoBluetooth>;
  buscar(segundos: number): Promise<void>;
  detenerBusqueda(): Promise<void>;
  /** Conecta, descubre el servicio y activa las notificaciones de estado. */
  conectar(id: string): Promise<void>;
  desconectar(id: string): Promise<void>;
  escribir(id: string, texto: string): Promise<void>;
  suscribir(manejadores: ManejadoresTransporte): () => void;
}
