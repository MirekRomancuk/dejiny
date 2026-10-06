/**
 * Image migration from the live legacy Joomla site.
 *
 * Strategy:
 *   1. Pull all unique `images/...` paths from Supabase (pages.content_html, events.content_html, events.image_refs)
 *   2. For each path: download from https://dejinykorunyceske.cz/<path>
 *   3. Upload to Supabase Storage:
 *        - paths under `Popis/`, `Male_*`, `male_obrazky/`, `headers/` etc. → bucket `event-images`
 *        - everything else (rare) → bucket `event-images` too (single bucket simplifies things)
 *   4. Build mapping `{ oldPath: publicUrl }`
 *   5. UPDATE pages and events: rewrite HTML and JSONB image_refs
 *
 * Run:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/upload-images.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LEGACY_BASE = process.env.LEGACY_BASE ?? 'https://dejinykorunyceske.cz';
const BUCKET = 'event-images';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// MIME type by extension (Supabase Storage needs this)
function mimeFor(path: string): string {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  return {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
  }[ext] ?? 'application/octet-stream';
}

function sanitizeStoragePath(legacyPath: string): string {
  // Storage doesn't like leading slash; strip "images/" prefix to keep paths flat-ish
  return legacyPath.replace(/^images\//, '').replace(/[^A-Za-z0-9._/-]/g, '_');
}

async function downloadOne(legacyPath: string): Promise<{ buffer: Uint8Array; mime: string } | null> {
  const url = `${LEGACY_BASE}/${legacyPath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return { buffer: buf, mime: mimeFor(legacyPath) };
  } catch {
    return null;
  }
}

async function uploadOne(legacyPath: string, file: { buffer: Uint8Array; mime: string }): Promise<string | null> {
  const storagePath = sanitizeStoragePath(legacyPath);
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, file.buffer, {
    contentType: file.mime,
    upsert: true,
  });
  if (error) {
    console.error(`  Upload failed for ${legacyPath}: ${error.message}`);
    return null;
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  console.log('▸ Collecting unique image paths from DB…');
  const paths = new Set<string>();

  // 1. From events.content_html
  const { data: ev1 } = await sb.from('events').select('content_html').not('content_html', 'eq', '');
  for (const row of ev1 ?? []) {
    const m = (row as { content_html: string }).content_html.matchAll(/images\/[A-Za-z0-9_./%-]+/g);
    for (const x of m) paths.add(decodeURIComponent(x[0]));
  }

  // 2. From pages.content_html
  const { data: pg1 } = await sb.from('pages').select('content_html');
  for (const row of pg1 ?? []) {
    const m = (row as { content_html: string }).content_html.matchAll(/images\/[A-Za-z0-9_./%-]+/g);
    for (const x of m) paths.add(decodeURIComponent(x[0]));
  }

  // 3. From events.image_refs JSONB
  const { data: ev2 } = await sb.from('events').select('image_refs').filter('image_refs', 'neq', '[]');
  for (const row of ev2 ?? []) {
    const refs = (row as { image_refs: Array<{ url: string }> }).image_refs;
    if (!Array.isArray(refs)) continue;
    for (const r of refs) {
      if (r?.url && r.url.startsWith('images/')) paths.add(decodeURIComponent(r.url));
    }
  }

  console.log(`  Found ${paths.size} unique image paths`);

  // Download + upload each
  const mapping = new Map<string, string>();
  const failed: string[] = [];
  let downloaded = 0;
  let uploaded = 0;
  const skipped = 0;

  const pathList = [...paths].sort();
  for (let i = 0; i < pathList.length; i++) {
    const p = pathList[i];
    process.stdout.write(`\r  [${i + 1}/${pathList.length}] ${p.slice(0, 60).padEnd(60)} `);
    const file = await downloadOne(p);
    if (!file) {
      failed.push(p);
      continue;
    }
    downloaded++;
    const url = await uploadOne(p, file);
    if (!url) {
      failed.push(p);
      continue;
    }
    uploaded++;
    mapping.set(p, url);
  }
  process.stdout.write('\n');
  console.log(`▸ Downloaded: ${downloaded}, Uploaded: ${uploaded}, Failed: ${failed.length}, Skipped: ${skipped}`);
  if (failed.length > 0) {
    console.log('  Failed paths (first 20):');
    failed.slice(0, 20).forEach((p) => console.log(`    - ${p}`));
  }

  // ---- Rewrite HTML in pages ----
  console.log('▸ Rewriting page content_html…');
  const { data: pages } = await sb.from('pages').select('id, slug, content_html');
  let pagesUpdated = 0;
  for (const p of pages ?? []) {
    const row = p as { id: number; slug: string; content_html: string };
    let html = row.content_html;
    let changed = false;
    for (const [old, neu] of mapping) {
      // Replace both raw and URL-encoded forms
      const escaped = old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![A-Za-z0-9_/])${escaped}(?![A-Za-z0-9_./-])`, 'g');
      if (re.test(html)) {
        html = html.replace(re, neu);
        changed = true;
      }
    }
    if (changed) {
      const { error } = await sb
        .from('pages')
        .update({ content_html: html })
        .eq('id', row.id);
      if (!error) pagesUpdated++;
    }
  }
  console.log(`  Pages updated: ${pagesUpdated}`);

  // ---- Rewrite HTML in events ----
  console.log('▸ Rewriting events content_html…');
  const { data: events } = await sb.from('events').select('id, content_html, image_refs').not('content_html', 'eq', '');
  let eventsUpdated = 0;
  for (const e of events ?? []) {
    const row = e as { id: number; content_html: string; image_refs: Array<{ url: string }> };
    let html = row.content_html;
    const refs = Array.isArray(row.image_refs) ? row.image_refs : [];
    let htmlChanged = false;
    let refsChanged = false;
    for (const [old, neu] of mapping) {
      const escaped = old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![A-Za-z0-9_/])${escaped}(?![A-Za-z0-9_./-])`, 'g');
      if (re.test(html)) {
        html = html.replace(re, neu);
        htmlChanged = true;
      }
    }
    const newRefs = refs.map((r) => {
      if (r?.url && mapping.has(r.url)) {
        refsChanged = true;
        return { ...r, url: mapping.get(r.url)! };
      }
      return r;
    });
    if (htmlChanged || refsChanged) {
      const update: Record<string, unknown> = {};
      if (htmlChanged) update.content_html = html;
      if (refsChanged) update.image_refs = newRefs;
      const { error } = await sb
        .from('events')
        .update(update)
        .eq('id', row.id);
      if (!error) eventsUpdated++;
    }
  }
  console.log(`  Events updated: ${eventsUpdated}`);
  console.log('✓ Image migration finished');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
