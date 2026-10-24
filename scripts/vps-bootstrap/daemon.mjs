/**
 * DANVERS JARVIS — Remote Linux Worker Daemon (v1.1 Hardened)
 * Runs under unprivileged 'jarvis-worker' user.
 * Outbound-only polling over authenticated TLS.
 */

import fs from 'fs';
import path from 'path';

const CONTROL_URL = (process.env.JARVIS_CONTROL_URL || 'https://127.0.0.1:3000').trim().replace(/\/+$/, '');
const WORKER_ID = process.env.JARVIS_WORKER_ID;
const WORKER_TOKEN = process.env.JARVIS_WORKER_TOKEN;
const WORKSPACES_DIR = process.env.WORKSPACES_DIR || '/var/lib/jarvis-worker/workspaces';
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

if (!WORKER_ID || !WORKER_TOKEN) {
  console.error('[FATAL] Missing JARVIS_WORKER_ID or JARVIS_WORKER_TOKEN in environment.');
  process.exit(1);
}

// Ensure TLS verification is NEVER disabled
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.error('[FATAL SECURITY ERROR] NODE_TLS_REJECT_UNAUTHORIZED=0 is prohibited. TLS verification is mandatory.');
  process.exit(1);
}

console.log(`[INIT] Danvers Jarvis Remote Worker Daemon started.`);
console.log(`[INIT] Worker ID: ${WORKER_ID}`);
console.log(`[INIT] Control Plane: ${CONTROL_URL}`);
console.log(`[INIT] Workspaces: ${WORKSPACES_DIR}`);

let running = true;
let currentTaskId = null;
let consecutiveFailures = 0;

// Graceful signal handling
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received. Stopping worker daemon cleanly...');
  running = false;
});
process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received. Stopping worker daemon cleanly...');
  running = false;
});

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${CONTROL_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${WORKER_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': `DanversJarvisWorker/1.1 (${WORKER_ID})`
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
    // Sanitize any token leakage in error text
    const cleanError = text.replace(/jwt_wkr_[a-zA-Z0-9_-]+/g, '[REDACTED_TOKEN]');
    throw new Error(`HTTP ${res.status} from ${endpoint}: ${cleanError}`);
  }
  return await res.json();
}

async function sendHeartbeat() {
  try {
    const res = await apiRequest('/api/jarvis/workers/heartbeat', 'POST');
    consecutiveFailures = 0;
    if (res.leaseExtended && currentTaskId) {
      console.log(`[HEARTBEAT] Lease confirmed for task ${currentTaskId}`);
    }
  } catch (err) {
    consecutiveFailures += 1;
    console.warn(`[HEARTBEAT] Warning: Heartbeat failed (${consecutiveFailures}): ${err.message}`);
    // If worker was revoked (HTTP 401), exit gracefully
    if (err.message.includes('HTTP 401')) {
      console.error('[FATAL] Worker credentials rejected or revoked by control plane. Exiting.');
      process.exit(1);
    }
  }
}

// Start periodic heartbeat timer
const heartbeatTimer = setInterval(() => {
  if (running) {
    sendHeartbeat().catch(() => {});
  }
}, HEARTBEAT_INTERVAL_MS);

// Exponential backoff sleep helper
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Main outbound poll loop
async function pollLoop() {
  while (running) {
    let nextWaitMs = POLL_INTERVAL_MS;

    try {
      // 1. Send heartbeat
      await sendHeartbeat();

      // In production, when task claiming is enabled:
      // const claimRes = await apiRequest('/api/jarvis/workers/claim', 'POST', { taskId });
    } catch (err) {
      console.error(`[POLL] Loop error: ${err.message}`);
      // Backoff if control plane is unreachable
      nextWaitMs = Math.min(POLL_INTERVAL_MS * Math.pow(1.5, Math.min(consecutiveFailures, 5)), 60000);
    }

    await sleep(nextWaitMs);
  }

  clearInterval(heartbeatTimer);
  console.log('[STOPPED] Daemon shut down cleanly.');
}

pollLoop().catch(err => {
  console.error('[FATAL] Unhandled daemon failure:', err);
  process.exit(1);
});
