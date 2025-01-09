import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { config } from 'dotenv';
import * as schema from './schema';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Extract the file path from the URL and resolve it relative to project root
const dbPath = resolve(process.cwd(), process.env.DATABASE_URL.replace('sqlite:', ''));

// Ensure the directory exists
await mkdir(dirname(dbPath), { recursive: true });

// Initialize SQLite database
const sqlite = new Database(dbPath);

// Create drizzle database instance
export const db = drizzle(sqlite, { schema });

// Export schema for use in other parts of the application
export { schema }; 