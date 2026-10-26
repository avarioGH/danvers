/**
 * DANVERS JARVIS — Windows Local Worker Daemon Runner
 * Outbound-only authenticated heartbeat & worker process.
 */

import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'data', 'jarvis', 'windows_worker_config.json');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[FATAL] Configuration file not found at:', CONFIG_PATH);
  console.error('Please run the authenticated provisioning step first.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const { controlUrl, workerId, workerToken, heartbeatIntervalMs = 15000 } = config;

if (!workerId || !workerToken || !controlUrl) {
  console.error('[FATAL] Invalid configuration. Missing controlUrl, workerId, or workerToken.');
  process.exit(1);
}

console.log('================================================================');
console.log('DANVERS JARVIS — WINDOWS LOCAL WORKER DAEMON');
console.log('================================================================');
console.log(`Worker ID:     ${workerId}`);
console.log(`Control Plane: ${controlUrl}`);
console.log(`Heartbeat:     Every ${heartbeatIntervalMs / 1000}s`);
console.log(`Local Ollama:  http://127.0.0.1:11434 (Active)`);
console.log('================================================================\n');

let running = true;
let heartbeatCount = 0;

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] SIGINT received. Stopping worker daemon cleanly...');
  running = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] SIGTERM received. Stopping worker daemon cleanly...');
  running = false;
  process.exit(0);
});

async function sendHeartbeat() {
  if (!running) return;
  try {
    const url = `${controlUrl.replace(/\/+$/, '')}/api/jarvis/workers/heartbeat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    });

    if (res.status === 200) {
      heartbeatCount++;
      const data = await res.json();
      console.log(`[HEARTBEAT #${heartbeatCount}] OK (${new Date().toLocaleTimeString()}) — Control Plane confirmed active lease.`);
    } else if (res.status === 401) {
      console.error(`[HEARTBEAT] 401 Unauthorized: Worker token invalid or revoked on Control Plane. Exiting.`);
      running = false;
      process.exit(1);
    } else {
      console.warn(`[HEARTBEAT] HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.warn(`[HEARTBEAT WARNING] Connection issue:`, err.message);
  }
}

// Initial immediate heartbeat
await sendHeartbeat();

// Recurring interval
setInterval(sendHeartbeat, heartbeatIntervalMs);
