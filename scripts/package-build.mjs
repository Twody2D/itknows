import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { platform } from 'node:os';

/**
 * Packs `dist/` into the ZIP that gets uploaded to the Yandex Games console
 * — but checks it first, because the upload is the last place you want to
 * discover that something is wrong with the build.
 *
 * Every check below corresponds to a real rule this project has to keep
 * (CLAUDE.md #3 no binary assets, #12 no debug output, Yandex's own
 * requirement that `index.html` sit at the archive root). A failure exits
 * non-zero and names what to fix; nothing is written on a failure.
 */

const DIST = 'dist';
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024; // Yandex Games' own cap.

/** Formats intended for the browser and allowed in the archive. */
const ALLOWED_EXTENSIONS = new Set(['.html', '.js', '.css', '.woff2', '.json', '.svg', '.ico', '.webmanifest', '.txt']);

/**
 * Binary asset formats this project deliberately does not ship (CLAUDE.md
 * #3: every texture is drawn in code, every sound is synthesised). Finding
 * one here means something started importing a file instead.
 */
const FORBIDDEN_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.ogg', '.wav', '.ttf', '.otf', '.woff', '.map']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const problems = [];

if (!existsSync(DIST)) {
  console.error(`No "${DIST}" directory. Run "pnpm build" first.`);
  process.exit(1);
}

const files = walk(DIST);

// 1. Yandex serves the archive by opening `index.html` at its root.
if (!existsSync(join(DIST, 'index.html'))) problems.push('index.html is missing from the archive root');

// 2. Nothing this project promised not to ship.
for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (FORBIDDEN_EXTENSIONS.has(ext)) problems.push(`${file} — ${ext} files are not shipped by this project`);
  else if (!ALLOWED_EXTENSIONS.has(ext)) problems.push(`${file} — unexpected file type ${ext || '(none)'}; add it to ALLOWED_EXTENSIONS if it belongs`);
}

// 3. No debug output and no dev-only module survived into the bundle.
for (const file of files.filter((f) => f.endsWith('.js'))) {
  const source = readFileSync(file, 'utf8');
  // Phaser prints its own warnings; only our own code is in scope here.
  if (file.includes('phaser')) continue;
  if (source.includes('console.log(')) problems.push(`${file} — contains console.log (CLAUDE.md #12)`);
  if (source.includes('DebugOverlay')) problems.push(`${file} — contains the dev debug overlay`);
  if (source.includes('ShopDevTools')) problems.push(`${file} — contains the shop dev tools`);
}

// 4. Absolute paths break inside the Yandex iframe, which serves the game
//    from a subdirectory — the build is configured with `base: './'`.
const html = existsSync(join(DIST, 'index.html')) ? readFileSync(join(DIST, 'index.html'), 'utf8') : '';
if (/(?:src|href)="\//.test(html)) problems.push('index.html references an absolute path — the iframe serves from a subdirectory');

const total = files.reduce((sum, file) => sum + statSync(file).size, 0);

if (problems.length > 0) {
  console.error('\nThe build is not ready to upload:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exit(1);
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const archive = resolve(`it-knows-${version}.zip`);
if (existsSync(archive)) rmSync(archive);

// No archiving dependency: every platform this runs on already has one.
if (platform() === 'win32') {
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `Compress-Archive -Path '${resolve(DIST)}\\*' -DestinationPath '${archive}' -CompressionLevel Optimal`],
    { stdio: 'inherit' },
  );
} else {
  execFileSync('zip', ['-r', '-9', '-q', archive, '.'], { cwd: DIST, stdio: 'inherit' });
}

console.log(`\n${files.length} files, ${formatBytes(total)} uncompressed`);
console.log(`Archive: ${archive} (${formatBytes(statSync(archive).size)})`);

if (statSync(archive).size > MAX_ARCHIVE_BYTES) {
  console.error(`\nOver the Yandex Games limit of ${formatBytes(MAX_ARCHIVE_BYTES)}.`);
  process.exit(1);
}

console.log('Ready to upload to the Yandex Games console.\n');
