import { WorkerRegistry } from '../src/lib/jarvis/worker-registry';

async function main() {
  const worker = await WorkerRegistry.registerWorker(
    'vps-worker-01',
    ['code_read', 'code_edit', 'test_run'],
    ['*']
  );
  console.log('Worker registered successfully:');
  console.log(JSON.stringify(worker, null, 2));
}

main().catch(console.error);
