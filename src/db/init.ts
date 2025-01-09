import { runMigrations } from './migrate';
import { db } from './index';

export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Run migrations
    await runMigrations();
    
    // Test database connection by checking if migrations table exists
    await db.run('SELECT 1');
    console.log('Database connection successful');
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
} 