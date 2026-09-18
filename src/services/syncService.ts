export type SyncConnectionStatus = 'connected' | 'connecting' | 'disconnected';
export const realtimeSync = {
  fetchLatest: async () => [],
  subscribe: () => () => {},
  subscribeStatus: (cb: any) => { cb('connected'); return () => {}; },
  saveEmployee: () => {},
  saveBatch: () => {},
  deleteEmployee: () => {},
  deleteAllEmployees: () => {},
  setAllEmployees: () => {}
};
