// Guards the vendored dependencies (the offline replacement for CDN+SRI, F6).
// bin/vendor.sh downloads each pinned library, verifies it against the SHA-384
// hashes that used to live on the CDN tags, and records every file's hash in
// vendor/manifest.json. These tests re-verify that chain on every run:
// a tampered, truncated, or hand-edited vendor file -- or a vendor/ tree that
// drifted from the manifest -- turns the suite red. They also confirm that
// every asset index.html references actually exists, so the app cannot ship
// pointing at a missing local file (the offline analogue of a dead CDN link).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { indexHtml } from './helpers.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(root, 'vendor');
const manifest = JSON.parse(readFileSync(join(vendorDir, 'manifest.json'), 'utf8'));

function sha384(path) {
  return 'sha384-' + createHash('sha384').update(readFileSync(path)).digest('base64');
}

function walk(dir, base = '') {
  return readdirSync(dir).flatMap((name) => {
    const abs = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    return statSync(abs).isDirectory() ? walk(abs, rel) : [rel];
  });
}

const htmlAssetPaths = [...indexHtml.matchAll(/(?:src|href)="(vendor\/[^"]+)"/g)].map((m) => m[1]);

describe('vendor/manifest.json integrity', () => {
  it('records version pins for all five libraries', () => {
    expect(Object.keys(manifest.libraries).sort()).toEqual([
      'codemirror',
      'dompurify',
      'katex',
      'marked',
      'mermaid',
    ]);
    for (const [lib, version] of Object.entries(manifest.libraries)) {
      // exact dot-separated version, not a floating major like "5"
      expect(version, `floating version for ${lib}`).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('pins marked and dompurify to the same versions the test suite runs against', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    // sanitize.test.js exercises the real renderMarkdown() against the npm
    // copies of marked/dompurify; those results are only meaningful if the
    // app ships the same versions.
    expect(manifest.libraries.marked).toBe(pkg.devDependencies.marked);
    expect(manifest.libraries.dompurify).toBe(pkg.devDependencies.dompurify);
  });

  it('every file listed in the manifest exists and matches its recorded sha384', () => {
    const entries = Object.entries(manifest.files);
    expect(entries.length).toBeGreaterThanOrEqual(30);
    for (const [rel, hash] of entries) {
      const abs = join(vendorDir, rel);
      expect(existsSync(abs), `manifest lists a missing file: ${rel}`).toBe(true);
      expect(sha384(abs), `hash mismatch (tampered or partial vendor?): ${rel}`).toBe(hash);
    }
  });

  it('every file on disk under vendor/ is listed in the manifest (no stray files)', () => {
    const onDisk = walk(vendorDir).filter((rel) => rel !== 'manifest.json');
    const listed = new Set(Object.keys(manifest.files));
    for (const rel of onDisk) {
      expect(listed.has(rel), `unlisted file in vendor/: ${rel}`).toBe(true);
    }
  });
});

describe('index.html asset references resolve against vendor/', () => {
  it('references at least the 15 expected vendored assets', () => {
    expect(htmlAssetPaths.length).toBeGreaterThanOrEqual(15);
  });

  it('every referenced asset exists on disk', () => {
    for (const rel of htmlAssetPaths) {
      expect(existsSync(join(root, rel)), `index.html references a missing file: ${rel}`).toBe(
        true,
      );
    }
  });

  it('every referenced asset is covered by the manifest hash check', () => {
    for (const rel of htmlAssetPaths) {
      const manifestKey = rel.replace(/^vendor\//, '');
      expect(manifest.files[manifestKey], `asset not in manifest: ${rel}`).toBeDefined();
    }
  });
});

describe('KaTeX fonts are vendored for offline math rendering', () => {
  it('every woff2 font referenced by katex.min.css exists in vendor/katex/fonts/', () => {
    const css = readFileSync(join(vendorDir, 'katex/katex.min.css'), 'utf8');
    const fonts = [...new Set([...css.matchAll(/url\((fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
    expect(fonts.length).toBeGreaterThanOrEqual(15);
    for (const font of fonts) {
      expect(existsSync(join(vendorDir, 'katex', font)), `missing vendored font: ${font}`).toBe(
        true,
      );
    }
  });
});
