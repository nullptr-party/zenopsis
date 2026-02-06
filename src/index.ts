import { initializeBot } from './bot';
import { stopWorker } from './tasks/worker';

async function main() {
  try {
    await initializeBot();
    console.log('Application started successfully');
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

function shutdown() {
  console.log('Shutting down...');
  stopWorker();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
