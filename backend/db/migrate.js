import Database from 'better-sqlite3';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const dbPath = resolve(__dirname, '..', 'fashionhub.db');
const migrationsDir = resolve(__dirname, 'migrations');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function getAppliedMigrations() {
  return db.prepare('SELECT id FROM migrations ORDER BY applied_at').all().map(r => r.id);
}

function getPendingMigrations(applied) {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();
  return files.filter(f => !applied.includes(f.replace('.js', '')));
}

async function runMigration(filename) {
  const migration = await import(`file://${resolve(migrationsDir, filename)}`);
  if (typeof migration.up === 'function') {
    migration.up(db);
  } else if (typeof migration.default === 'function') {
    migration.default(db);
  }
  db.prepare('INSERT INTO migrations (id) VALUES (?)').run(filename.replace('.js', ''));
  console.log(`Applied migration: ${filename}`);
}

async function main() {
  const applied = getAppliedMigrations();
  const pending = getPendingMigrations(applied);

  if (pending.length === 0) {
    console.log('No pending migrations');
  } else {
    console.log(`Running ${pending.length} migration(s)...`);
    for (const migration of pending) {
      await runMigration(migration);
    }
    console.log('All migrations applied');
  }

  db.close();
}

main().catch(err => {
  console.error('Migration failed:', err);
  db.close();
  process.exit(1);
});