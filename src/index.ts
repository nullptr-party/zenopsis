import { initializeBot } from './bot';
import express from 'express';
import { db } from './db';
import { messages, summaries, groupConfigs } from './db/schema';
import { count } from 'drizzle-orm';

const app = express();
const PORT = process.env.METRICS_PORT || 9090;

async function setupMetricsEndpoint() {
  app.get('/metrics', async (req, res) => {
    const [messageCount] = await db.select({ value: count() }).from(messages);
    const [summaryCount] = await db.select({ value: count() }).from(summaries);
    const [groupCount] = await db.select({ value: count() }).from(groupConfigs);
    
    res.json({
      total_messages: messageCount.value,
      total_summaries: summaryCount.value,
      active_groups: groupCount.value,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
    });
  });

  app.listen(PORT, () => {
    console.log(`Metrics endpoint listening on port ${PORT}`);
  });
}

async function main() {
  try {
    await initializeBot();
    await setupMetricsEndpoint();
    console.log('Application started successfully');
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main(); 
