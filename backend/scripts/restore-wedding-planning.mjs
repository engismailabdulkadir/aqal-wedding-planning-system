/**
 * Restore wedding_planning from backups/wedding_planning_backup.gz
 * Run on the OTHER laptop after copying the backup file.
 *
 * Usage: node scripts/restore-wedding-planning.mjs
 * Optional: MONGO_URI=mongodb://127.0.0.1:27017/wedding_planning
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const archivePath = path.join(rootDir, 'backups', 'wedding_planning_backup.gz');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wedding_planning';

async function main() {
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Backup not found: ${archivePath}`);
  }

  const compressed = fs.readFileSync(archivePath);
  const jsonPayload = zlib.gunzipSync(compressed).toString('utf8');
  const { manifest, collections } = JSON.parse(jsonPayload);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log(`Restoring database ${manifest.database} (${manifest.createdAt})`);

  for (const { name, count } of manifest.collections) {
    const docs = collections[name];
    if (!Array.isArray(docs)) continue;
    const col = db.collection(name);
    const existing = await col.countDocuments();
    if (existing > 0) {
      console.log(`Skipping ${name}: already has ${existing} documents (drop manually if you want a clean restore)`);
      continue;
    }
    if (docs.length) {
      await col.insertMany(docs, { ordered: false });
    }
    console.log(`Restored ${name}: ${docs.length} documents (expected ${count})`);
  }

  await mongoose.disconnect();
  console.log('Restore complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
