// Copies Roadmaps/*.md → public/roadmaps/ + generates manifest.json
// Runs before dev and build so roadmaps are always fresh.

import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const root = resolve(import.meta.dirname, '../..');
const src = join(root, 'Roadmaps');
const dest = join(root, 'HTML', 'public', 'roadmaps');

mkdirSync(dest, { recursive: true });

const files = readdirSync(src).filter(f => f.endsWith('.md')).sort();

for (const f of files) {
  copyFileSync(join(src, f), join(dest, f));
}

writeFileSync(join(dest, 'manifest.json'), JSON.stringify(files));

console.log(`[sync-roadmaps] ${files.length} files → public/roadmaps/`);
