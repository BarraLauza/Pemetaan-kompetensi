import { Employee } from '../types';

export type SyncConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'offline';

type SyncListener = (employees: Employee[]) => void;
type StatusListener = (status: SyncConnectionStatus) => void;

class RealtimeSyncManager {
  private ws: WebSocket | null = null;
  private syncListeners: Set<SyncListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private status: SyncConnectionStatus = 'connecting';
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private pollTimer: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastKnownVersion = 0;
  private isDestroyed = false;

  constructor() {
    this.initBroadcastChannel();
    this.connectWebSocket();
    this.startPollingFallback();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('talentpulse_realtime_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'EMPLOYEES_UPDATED' && Array.isArray(event.data.data)) {
            this.notifySync(event.data.data);
          }
        };
      } catch (e) {
        console.warn('[Sync] BroadcastChannel not supported:', e);
      }
    }
  }

  private setStatus(newStatus: SyncConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => listener(newStatus));
    }
  }

  public getStatus(): SyncConnectionStatus {
    return this.status;
  }

  public subscribe(onSync: SyncListener): () => void {
    this.syncListeners.add(onSync);
    return () => this.syncListeners.delete(onSync);
  }

  public subscribeStatus(onStatus: StatusListener): () => void {
    this.statusListeners.add(onStatus);
    onStatus(this.status);
    return () => this.statusListeners.delete(onStatus);
  }

  private notifySync(employees: Employee[]) {
    this.lastKnownVersion = Date.now();
    this.syncListeners.forEach((listener) => {
      try {
        listener(employees);
      } catch (err) {
        console.error('[Sync] Error in sync listener:', err);
      }
    });
  }

  // Initial HTTP fetch and Periodic Background Sync
  public async fetchLatest(): Promise<Employee[] | null> {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          this.notifySync(json.data);
          this.setStatus('connected');
          return json.data;
        }
      }
    } catch (e) {
      console.warn('[Sync] HTTP fetch failed:', e);
    }
    return null;
  }

  private startPollingFallback() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    // Poll every 7 seconds as safety net
    this.pollTimer = setInterval(() => {
      this.fetchLatest();
    }, 7000);
  }

  private connectWebSocket() {
    if (typeof window === 'undefined' || this.isDestroyed) return;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Sync] WebSocket connected successfully');
        this.setStatus('connected');
        this.reconnectAttempts = 0;

        // Heartbeat ping every 25 seconds
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if ((msg.type === 'INIT_EMPLOYEES' || msg.type === 'EMPLOYEES_UPDATED') && Array.isArray(msg.data)) {
            this.notifySync(msg.data);
          }
        } catch (e) {
          console.error('[Sync] Error processing WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('offline');
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('offline');
      };
    } catch (e) {
      console.error('[Sync] WebSocket error initializing:', e);
      this.setStatus('offline');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  // Action: Save / Update Employee
  public async saveEmployee(emp: Employee, allEmployees: Employee[]): Promise<void> {
    // 1. Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'UPDATE_EMPLOYEE',
          data: emp
        }));
      } catch (e) {
        console.warn('[Sync] WS send failed:', e);
      }
    }

    // 2. Broadcast to other tabs in the same browser
    if (this.broadcastChannel) {
      try {
        const nextList = allEmployees.some(e => e.id === emp.id)
          ? allEmployees.map(e => e.id === emp.id ? emp : e)
          : [emp, ...allEmployees];
        this.broadcastChannel.postMessage({
          type: 'EMPLOYEES_UPDATED',
          data: nextList
        });
      } catch (_) {}
    }

    // 3. Fallback / guarantee persistence via REST API
    try {
      await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      });
    } catch (err) {
      console.error('[Sync] Failed to post employee to server API:', err);
    }
  }

  // Action: Delete Employee
  public async deleteEmployee(empId: string, remainingEmployees: Employee[]): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'DELETE_EMPLOYEE',
          id: empId
        }));
      } catch (_) {}
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'EMPLOYEES_UPDATED',
          data: remainingEmployees
        });
      } catch (_) {}
    }

    try {
      await fetch(`/api/employees/${empId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('[Sync] Failed to delete employee on server:', err);
    }
  }

  // Action: Batch Save Employees atomically (prevents bulk upload race conditions)
  public async saveBatch(batch: Employee[], allEmployees: Employee[]): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'SET_ALL_EMPLOYEES',
          data: allEmployees
        }));
      } catch (_) {}
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'EMPLOYEES_UPDATED',
          data: allEmployees
        });
      } catch (_) {}
    }

    try {
      await fetch('/api/employees/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      });
    } catch (err) {
      console.warn('[Sync] POST /api/employees/batch failed, falling back to PUT:', err);
      try {
        await fetch('/api/employees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allEmployees)
        });
      } catch (putErr) {
        console.error('[Sync] Failed to save batch employees:', putErr);
      }
    }
  }

  // Action: Replace all employees / Bulk save
  public async setAllEmployees(employees: Employee[]): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'SET_ALL_EMPLOYEES',
          data: employees
        }));
      } catch (_) {}
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'EMPLOYEES_UPDATED',
          data: employees
        });
      } catch (_) {}
    }

    try {
      await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employees)
      });
    } catch (err) {
      console.error('[Sync] Failed to PUT employees on server:', err);
    }
  }

  // Action: Delete ALL Employees
  public async deleteAllEmployees(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'SET_ALL_EMPLOYEES',
          data: []
        }));
      } catch (_) {}
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'EMPLOYEES_UPDATED',
          data: []
        });
      } catch (_) {}
    }

    try {
      localStorage.removeItem('talentpulse_employees_v3');
      localStorage.setItem('talentpulse_employees_v3', JSON.stringify([]));
    } catch (_) {}

    try {
      await fetch('/api/employees', {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[Sync] DELETE /api/employees failed, trying POST /api/employees/clear fallback:', err);
      try {
        await fetch('/api/employees/clear', { method: 'POST' });
      } catch (_) {}
    }
  }

  // Action: Reset employees to Initial Data
  public async resetEmployees(initialList: Employee[]): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'RESET_EMPLOYEES'
        }));
      } catch (_) {}
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'EMPLOYEES_UPDATED',
          data: initialList
        });
      } catch (_) {}
    }

    try {
      await fetch('/api/employees/reset', {
        method: 'POST'
      });
    } catch (err) {
      console.error('[Sync] Failed to reset employees on server:', err);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (_) {}
      this.broadcastChannel = null;
    }
  }
}

export const realtimeSync = new RealtimeSyncManager();
