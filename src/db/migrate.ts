import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from './index';

// Run migrations
export async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running database migrations:', error);
    throw error;
  }
} 