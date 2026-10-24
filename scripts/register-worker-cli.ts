import { WorkerRegistry } from '../src/lib/jarvis/worker-registry';

async function main() {
  const worker = await WorkerRegistry.registerWorker({
    name: 'vps-worker-01',
    capabilities: ['code_read', 'code_edit', 'test_run'],
    allowedProjects: ['*']
  }, 'admin-vps-bootstrap');
  console.log('Worker registered successfully:');
  console.log(JSON.stringify(worker, null, 2));
}

main().catch(console.error);
