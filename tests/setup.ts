import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from '@/db';

// Run migrations before all tests
await migrate(db, { migrationsFolder: './src/db/migrations' });
