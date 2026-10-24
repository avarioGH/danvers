/**
 * DANVERS JARVIS — Remote Linux Worker Daemon (v1.0)
 * Runs under the unprivileged 'jarvis-worker' user.
 * Outbound-only polling over HTTPS. Zero inbound listening ports.
 */

import fs from 'fs';
import path from 'path';

const CONTROL_URL = process.env.JARVIS_CONTROL_URL || 'https://127.0.0.1:3000';
const WORKER_ID = process.env.JARVIS_WORKER_ID;
const WORKER_TOKEN = process.env.JARVIS_WORKER_TOKEN;
const WORKSPACES_DIR = process.env.WORKSPACES_DIR || '/var/lib/jarvis-worker/workspaces';
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

if (!WORKER_ID || !WORKER_TOKEN) {
  console.error('[FATAL] Missing JARVIS_WORKER_ID or JARVIS_WORKER_TOKEN in environment.');
  process.exit(1);
}

console.log(`[INIT] Danvers Jarvis Remote Worker Daemon started. ID: ${WORKER_ID}`);
console.log(`[INIT] Control Plane URL: ${CONTROL_URL}`);
console.log(`[INIT] Workspaces Path: ${WORKSPACES_DIR}`);

let running = true;
let currentTaskId = null;

// Graceful termination handling
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received. Completing current work and stopping...');
  running = false;
});
process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received. Stopping...');
  running = false;
});

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${CONTROL_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${WORKER_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': `DanversJarvisWorker/1.0.0 (${WORKER_ID})`
  };

  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(15000)
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} from ${endpoint}: ${text}`);
  }
  return await res.json();
}

async function sendHeartbeat() {
  try {
    const res = await apiRequest('/api/jarvis/workers/heartbeat', 'POST');
    if (res.leaseExtended) {
      console.log(`[HEARTBEAT] Lease extended for task ${currentTaskId}`);
    }
  } catch (err) {
    console.warn(`[HEARTBEAT] Warning: Heartbeat failed: ${err.message}`);
  }
}

// Start periodic heartbeat timer
setInterval(() => {
  if (running) {
    sendHeartbeat();
  }
}, HEARTBEAT_INTERVAL_MS);

// Main outbound poll loop
async function pollLoop() {
  while (running) {
    try {
      // 1. Send heartbeat if idle
      await sendHeartbeat();

      // 2. Poll for queued eligible tasks
      // In production, the worker queries for assigned tasks or claims eligible tasks
      // await checkAndClaimTasks();
    } catch (err) {
      console.error(`[POLL] Loop error: ${err.message}`);
    }

    // Wait before next poll tick
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.log('[STOPPED] Daemon shutdown cleanly.');
}

pollLoop().catch(err => {
  console.error('[FATAL] Unhandled daemon failure:', err);
  process.exit(1);
});
