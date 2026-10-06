import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const TABLES = [
  { name: 'events', orderBy: 'id' },
  { name: 'event_types', orderBy: 'id' },
  { name: 'rulers', orderBy: 'id' },
  { name: 'pages', orderBy: 'id' },
  { name: 'calendar_events', orderBy: 'id' },
  { name: 'settings', orderBy: 'key' },
  { name: 'page_blocks', orderBy: 'id' },
  { name: 'bibliography', orderBy: 'id' },
];

const BUCKETS = ['event-images', 'page-content', 'page-backgrounds'];
const PAGE_SIZE = 1_000;
const DOWNLOAD_WORKERS = 6;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('Chybí VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY.');
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.resolve('backups');
const finalRoot = path.join(backupRoot, `supabase-${projectRef}-${stamp}`);
const incompleteMarker = path.join(finalRoot, '.INCOMPLETE');
const databaseRoot = path.join(finalRoot, 'database');
const storageRoot = path.join(finalRoot, 'storage');

const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const manifest = {
  formatVersion: 1,
  createdAt: new Date().toISOString(),
  projectRef,
  scope: 'public-application-data',
  limitations: [
    'Auth users are not included.',
    'The profiles table is not included because anonymous RLS correctly blocks it.',
    'Private schemas, database roles, extensions, functions and Supabase internal schemas require a PostgreSQL dump.',
  ],
  tables: [],
  storage: [],
  schema: {
    source: 'supabase/migrations',
    localPath: 'schema/migrations',
  },
  files: [],
};

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function encodeObjectPath(objectPath) {
  return objectPath.split('/').map((segment) => encodeURIComponent(segment)).join(path.sep);
}

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Nebezpečná cesta mimo zálohu: ${target}`);
  }
  return resolvedTarget;
}

async function writeTracked(relativePath, data) {
  const target = ensureInside(finalRoot, path.join(finalRoot, relativePath));
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  manifest.files.push({
    path: relativePath.replaceAll('\\', '/'),
    size: buffer.length,
    sha256: sha256(buffer),
  });
}

async function exportTable({ name, orderBy }) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(name)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Export tabulky ${name} selhal: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const relativePath = `database/${name}.json`;
  await writeTracked(relativePath, `${JSON.stringify(rows, null, 2)}\n`);
  manifest.tables.push({ name, rows: rows.length, path: relativePath });
  console.log(`Tabulka ${name}: ${rows.length} řádků`);
}

async function listBucketObjects(bucket, prefix = '') {
  const objects = [];
  const folders = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw new Error(`Výpis bucketu ${bucket}/${prefix} selhal: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null || item.metadata === null) folders.push(objectPath);
      else objects.push(objectPath);
    }

    if (data.length < PAGE_SIZE) break;
  }

  for (const folder of folders) {
    objects.push(...await listBucketObjects(bucket, folder));
  }

  return objects;
}

async function downloadObject(bucket, objectPath) {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error) throw new Error(`Stažení ${bucket}/${objectPath} selhalo: ${error.message}`);

  const buffer = Buffer.from(await data.arrayBuffer());
  const encodedPath = encodeObjectPath(objectPath);
  const relativePath = path.join('storage', bucket, encodedPath);
  await writeTracked(relativePath, buffer);

  return {
    objectPath,
    localPath: relativePath.replaceAll('\\', '/'),
    size: buffer.length,
    sha256: sha256(buffer),
  };
}

async function mapWithConcurrency(items, workerCount, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(workerCount, items.length) }, worker));
  return results;
}

async function exportBucket(bucket) {
  const objects = await listBucketObjects(bucket);
  console.log(`Bucket ${bucket}: nalezeno ${objects.length} objektů`);

  let completed = 0;
  const entries = await mapWithConcurrency(objects, DOWNLOAD_WORKERS, async (objectPath) => {
    const entry = await downloadObject(bucket, objectPath);
    completed += 1;
    if (completed % 50 === 0 || completed === objects.length) {
      console.log(`Bucket ${bucket}: staženo ${completed}/${objects.length}`);
    }
    return entry;
  });

  manifest.storage.push({ bucket, objects: entries });
}

await mkdir(databaseRoot, { recursive: true });
await mkdir(storageRoot, { recursive: true });
await writeFile(incompleteMarker, 'Záloha nebyla dokončena. Tento soubor po úspěšném dokončení zmizí.\n');

for (const table of TABLES) await exportTable(table);
for (const bucket of BUCKETS) await exportBucket(bucket);

await cp(path.resolve('supabase/migrations'), path.join(finalRoot, 'schema', 'migrations'), {
  recursive: true,
});

const migrationFiles = manifest.schema.localPath;
const readme = `Dějiny Koruny české — aplikační záloha Supabase\n\nProjekt: ${projectRef}\nVytvořeno: ${manifest.createdAt}\nRozsah: veřejná aplikační data + veřejné Storage buckety + SQL migrace\n\nDŮLEŽITÉ OMEZENÍ\n- Neobsahuje Supabase Auth uživatele.\n- Neobsahuje chráněnou tabulku profiles.\n- Neobsahuje interní ani privátní PostgreSQL schémata.\n- Pro úplnou obnovu platformy je navíc nutný PostgreSQL dump a export Auth.\n\nObnova aplikačních dat se řídí souborem manifest.json. Původní Storage cesty jsou uloženy v poli objectPath; lokální názvy segmentů jsou URL-kódované. SQL migrace jsou v ${migrationFiles}.\n`;
await writeTracked('README.txt', readme);

manifest.files.sort((a, b) => a.path.localeCompare(b.path));
manifest.tables.sort((a, b) => a.name.localeCompare(b.name));
manifest.storage.sort((a, b) => a.bucket.localeCompare(b.bucket));
await writeFile(path.join(finalRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const manifestBuffer = await readFile(path.join(finalRoot, 'manifest.json'));
await writeFile(path.join(finalRoot, 'MANIFEST.SHA256'), `${sha256(manifestBuffer)}  manifest.json\n`);
await unlink(incompleteMarker);

const totalStorageObjects = manifest.storage.reduce((sum, bucket) => sum + bucket.objects.length, 0);
console.log(`Záloha dokončena: ${finalRoot}`);
console.log(`Tabulky: ${manifest.tables.length}; Storage objekty: ${totalStorageObjects}`);
