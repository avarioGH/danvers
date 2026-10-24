import fs from 'fs';
import path from 'path';

interface DaemonConfig {
  controlUrl: string;
  workerId: string;
  workerToken: string;
  heartbeatIntervalMs?: number;
  pollIntervalMs?: number;
  workspacesDir?: string;
}

const CONFIG_PATH = path.resolve(process.cwd(), 'data', 'jarvis', 'windows_worker_config.json');

export class WindowsWorkerDaemon {
  private static running = false;
  private static timer: NodeJS.Timeout | null = null;
  private static currentTaskId: string | null = null;

  public static loadConfig(): DaemonConfig | null {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      }
    } catch (e) {
      console.error('[WindowsWorker] Config load error:', e);
    }
    return null;
  }

  public static saveConfig(cfg: DaemonConfig) {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  }

  public static isRunning(): boolean {
    return this.running;
  }

  public static async start(): Promise<{ success: boolean; message: string }> {
    if (this.running) {
      return { success: true, message: 'Windows Worker Daemon is already active.' };
    }

    const cfg = this.loadConfig();
    if (!cfg || !cfg.workerId || !cfg.workerToken) {
      return { success: false, message: 'Windows Worker configuration missing workerId or workerToken.' };
    }

    this.running = true;
    console.log(`[WindowsWorker] Starting daemon for worker: ${cfg.workerId}`);

    const heartbeatMs = cfg.heartbeatIntervalMs || 20000;
    this.timer = setInterval(async () => {
      if (!this.running) return;
      try {
        const url = `${cfg.controlUrl.replace(/\/+$/, '')}/api/jarvis/workers/heartbeat`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cfg.workerToken}`
          }
        });
        if (res.status === 401) {
          console.error('[WindowsWorker] Credentials rejected by control plane. Stopping.');
          this.stop();
        }
      } catch (err) {
        console.warn('[WindowsWorker] Heartbeat warning:', (err as Error).message);
      }
    }, heartbeatMs);

    // Initial heartbeat
    try {
      const url = `${cfg.controlUrl.replace(/\/+$/, '')}/api/jarvis/workers/heartbeat`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.workerToken}`
        }
      });
    } catch {}

    return { success: true, message: `Windows worker daemon online (${cfg.workerId})` };
  }

  public static stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[WindowsWorker] Daemon stopped cleanly.');
  }
}
