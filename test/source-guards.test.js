// Static guards over index.html. These lock in the security wiring so a future
// edit cannot silently reintroduce the F1 (unsanitized render) or F6
// (unverified third-party code) regressions without turning a test red.
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

  it('sanitizes with DOMPurify and loads it from vendor/', () => {
    expect(indexHtml).toMatch(/DOMPurify\.sanitize\(/);
    expect(indexHtml).toMatch(/<script src="vendor\/dompurify\/purify\.min\.js">/);
  });

  it('declares a Content-Security-Policy', () => {
    expect(indexHtml).toMatch(/http-equiv="Content-Security-Policy"/);
  });

  it('CSP does not allow any network script/style source', () => {
    const csp = indexHtml.match(/Content-Security-Policy" content="([^"]+)"/)[1];
    for (const directive of ['script-src', 'style-src', 'font-src']) {
      const value = csp.match(new RegExp(`${directive} ([^;]+)`))[1];
      expect(value, `${directive} allows a network origin: ${value}`).not.toMatch(/https?:/);
    }
    expect(csp).toMatch(/connect-src 'none'/);
  });
});

describe('dependencies are vendored locally, never CDN-loaded (F6)', () => {
  it('contains no CDN references at all', () => {
    expect(indexHtml).not.toContain('cdn.jsdelivr.net');
    expect(indexHtml).not.toMatch(/(?:src|href)="https?:\/\//);
  });

  it('loads the expected number of vendored script/style tags', () => {
    const vendorTags = indexHtml
      .split('\n')
      .filter((line) => /(?:src|href)="vendor\//.test(line));
    expect(vendorTags.length).toBeGreaterThanOrEqual(14);
  });

  it('uses only relative vendor/ paths (no absolute paths that break file:// installs)', () => {
    const localTags = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((url) => !url.startsWith('#') && !url.startsWith('data:'));
    for (const url of localTags) {
      expect(url, `non-vendor asset reference: ${url}`).toMatch(/^vendor\//);
    }
  });
});
