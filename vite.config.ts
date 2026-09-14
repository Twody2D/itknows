import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

/** The version the main menu prints under SYSTEM ONLINE comes from here — one source of truth, never a string retyped into the UI. */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

/**
 * Drops the `.woff` half of every font Fontsource emits, and the `url(...)`
 * that pointed at it.
 *
 * Fontsource ships each face twice — `.woff2` first in the `src` list and
 * `.woff` behind it as a fallback. Every browser that can run this game
 * takes the `.woff2`: WOFF2 has been supported since Chrome 36, Safari 10,
 * Firefox 39 and Edge 14, which is every browser Yandex Games runs in. So
 * the `.woff` copies were never fetched by anyone — they were 180 KB of a
 * 1.97 MB build, and every one of those kilobytes still had to be uploaded
 * inside the game's archive.
 *
 * The `.woff2` files stay untouched, so nothing about how the game looks
 * changes; what disappears is a fallback with nobody left to fall back.
 */
function dropLegacyWoff(): Plugin {
  return {
    name: 'drop-legacy-woff',
    enforce: 'post',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.woff')) {
          delete bundle[fileName];
        } else if (output.type === 'asset' && fileName.endsWith('.css')) {
          output.source = String(output.source).replace(/,\s*url\([^)]*\.woff\)\s*format\("woff"\)/g, '');
        }
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [dropLegacyWoff()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2018',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
