/**
 * Read-only backup of wedding_planning — does NOT modify the database.
 * Exports each collection to JSON, then writes a gzip archive.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const backupDir = path.join(rootDir, 'backups', 'wedding_planning_dump');
const archivePath = path.join(rootDir, 'backups', 'wedding_planning_backup.gz');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wedding_planning';

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  const collections = await db.listCollections().toArray();

  fs.mkdirSync(backupDir, { recursive: true });

  const manifest = {
    database: dbName,
    createdAt: new Date().toISOString(),
    collections: [],
  };

  for (const { name } of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const filePath = path.join(backupDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 0));
    manifest.collections.push({ name, count: docs.length });
    console.log(`Exported ${name}: ${docs.length} documents`);
  }

  fs.writeFileSync(path.join(backupDir, '_manifest.json'), JSON.stringify(manifest, null, 2));

  const jsonPayload = JSON.stringify({
    manifest,
    collections: Object.fromEntries(
      manifest.collections.map(({ name }) => [
        name,
        JSON.parse(fs.readFileSync(path.join(backupDir, `${name}.json`), 'utf8')),
      ]),
    ),
  });

  await new Promise((resolve, reject) => {
    const gzip = zlib.createGzip();
    const out = fs.createWriteStream(archivePath);
    gzip.pipe(out);
    gzip.end(jsonPayload, 'utf8');
    out.on('finish', resolve);
    out.on('error', reject);
    gzip.on('error', reject);
  });

  const after = await db.listCollections().toArray();
  await mongoose.disconnect();

  console.log('\n--- Backup summary ---');
  console.log('Database:', dbName);
  console.log('Collections before:', collections.length);
  console.log('Collections after:', after.length);
  console.log('Archive:', archivePath);
  console.log('Size bytes:', fs.statSync(archivePath).size);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
