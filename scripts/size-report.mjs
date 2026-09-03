import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST_DIR = 'dist';
const BUDGET_BYTES = 3 * 1024 * 1024;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

let files;
try {
  files = walk(DIST_DIR);
} catch {
  console.error(`No "${DIST_DIR}" directory found. Run "pnpm build" first.`);
  process.exit(1);
}

const byExt = new Map();
let total = 0;
const largest = [];

for (const file of files) {
  const size = statSync(file).size;
  total += size;
  const ext = extname(file) || '(no ext)';
  byExt.set(ext, (byExt.get(ext) ?? 0) + size);
  largest.push([file, size]);
}

largest.sort((a, b) => b[1] - a[1]);

console.log(`\nBundle size report — ${DIST_DIR}/\n`);
console.log(`Total: ${formatBytes(total)} (budget: ${formatBytes(BUDGET_BYTES)})\n`);

console.log('By extension:');
for (const [ext, size] of [...byExt.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ext.padEnd(8)} ${formatBytes(size)}`);
}

console.log('\nLargest files:');
for (const [file, size] of largest.slice(0, 10)) {
  console.log(`  ${formatBytes(size).padStart(9)}  ${file}`);
}

if (total > BUDGET_BYTES) {
  console.error(`\nBUDGET EXCEEDED by ${formatBytes(total - BUDGET_BYTES)}.`);
  process.exit(1);
}

console.log('\nWithin budget.\n');
