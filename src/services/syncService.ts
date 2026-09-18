// Mock Sync Service untuk Netlify (Supaya tidak ada error WebSocket / 404)
export type SyncConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export const realtimeSync = {
  fetchLatest: async () => {
    try {
      const saved = localStorage.getItem('talentpulse_employees_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },
  subscribe: (callback: (data: any[]) => void) => {
    return () => {};
  },
  subscribeStatus: (callback: (status: SyncConnectionStatus) => void) => {
    callback('connected');
    return () => {};
  },
  saveEmployee: (emp: any, all: any[]) => {
    try {
      localStorage.setItem('talentpulse_employees_v3', JSON.stringify(all));
    } catch {}
  },
  saveBatch: (batch: any[], all: any[]) => {
    try {
      localStorage.setItem('talentpulse_employees_v3', JSON.stringify(all));
    } catch {}
  },
  deleteEmployee: (id: string, all: any[]) => {
    try {
      localStorage.setItem('talentpulse_employees_v3', JSON.stringify(all));
    } catch {}
  },
  deleteAllEmployees: () => {
    try {
      localStorage.removeItem('talentpulse_employees_v3');
    } catch {}
  },
  setAllEmployees: (all: any[]) => {
    try {
      localStorage.setItem('talentpulse_employees_v3', JSON.stringify(all));
    } catch {}
  }
};
