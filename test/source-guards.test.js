// Static guards over index.html. These lock in the security wiring so a future
// edit cannot silently reintroduce the F1 (unsanitized render) or F6 (missing
// SRI) regressions without turning a test red.
import { describe, it, expect } from 'vitest';
import { indexHtml } from './helpers.js';

describe('index.html render wiring (F1)', () => {
  it('routes both render sites through renderMarkdown()', () => {
    expect(indexHtml).toMatch(/preview\.innerHTML\s*=\s*renderMarkdown\(/);
    expect(indexHtml).toMatch(/slide\.innerHTML\s*=\s*renderMarkdown\(/);
  });

  it('never assigns marked.parse() output directly to innerHTML', () => {
    expect(indexHtml).not.toMatch(/innerHTML\s*=\s*marked\.parse/);
  });

  it('sanitizes with DOMPurify and loads it with SRI', () => {
    expect(indexHtml).toMatch(/DOMPurify\.sanitize\(/);
    expect(indexHtml).toMatch(/dompurify@[\d.]+\/dist\/purify\.min\.js"\s+integrity="sha384-/);
  });

  it('declares a Content-Security-Policy', () => {
    expect(indexHtml).toMatch(/http-equiv="Content-Security-Policy"/);
  });
});

describe('CDN dependencies are pinned with SRI (F6)', () => {
  const cdnTagLines = indexHtml
    .split('\n')
    .filter((line) => /(?:src|href)="https:\/\/cdn\.jsdelivr\.net/.test(line));

  it('finds the expected CDN resource tags', () => {
    expect(cdnTagLines.length).toBeGreaterThanOrEqual(14);
  });

  it('pins every CDN URL to an exact version (no floating major tags)', () => {
    for (const line of cdnTagLines) {
      const url = line.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/([^"]+)/)[1];
      // e.g. codemirror@5.65.21/... — require a dot-separated version, not "@5/"
      expect(url, `floating version in: ${url}`).toMatch(/@\d+\.\d+/);
    }
  });

  it('gives every CDN tag an integrity hash and crossorigin', () => {
    for (const line of cdnTagLines) {
      expect(line, `missing integrity: ${line.trim()}`).toMatch(/integrity="sha384-/);
      expect(line, `missing crossorigin: ${line.trim()}`).toMatch(/crossorigin="anonymous"/);
    }
  });
});
