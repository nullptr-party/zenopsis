import { initializeBot } from './bot';

async function main() {
  try {
    await initializeBot();
    console.log('Application started successfully');
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main(); 