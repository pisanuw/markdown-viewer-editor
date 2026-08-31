// Guards the two macOS entry points against drift. Both must inject the file
// content as RAW base64 into window.__initialContent (index.html decodes it with
// atob). Pre-decoding in the shell makes index.html atob() a plain-text string
// and throw. Regression guard for F3.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mdOpenSh, setupSh, indexHtml } from './helpers.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('macOS entry points inject raw base64 (F3)', () => {
  it('bin/md-open.sh injects raw base64, not pre-decoded', () => {
    expect(mdOpenSh).toMatch(/window\.__initialContent = '\$B64';/);
    expect(mdOpenSh).not.toMatch(/atob\(['"]\$B64['"]\)/);
  });

  it("the app's md-open-helper.sh (in setup-macos-app.sh) matches", () => {
    expect(setupSh).toMatch(/window\.__initialContent = '\$B64';/);
    expect(setupSh).not.toMatch(/atob\(['"]\$B64['"]\)/);
  });
});

describe('macOS bundle identifier (F11)', () => {
  it('does not use the leftover com.opencode identifier', () => {
    expect(setupSh).not.toContain('com.opencode');
  });
});

// The temp-HTML flow copies index.html into /tmp, which would break the
// relative vendor/ asset paths introduced when the CDN was dropped. Both
// entry points must splice a <base> tag into <head> pointing at the real
// install directory, with the path percent-encoded (both the repo path and
// "Markdown Editor.app/Contents/Resources/" can contain spaces).
describe('macOS entry points resolve vendor/ assets from the temp page', () => {
  it('bin/md-open.sh splices a <base> into <head> via first-match-only sed', () => {
    expect(mdOpenSh).toMatch(/sed "1,\/<head>\/s\|<head>\|<head><base href=\\"\$DIR_URL\\">\|"/);
    // and no longer cats index.html verbatim (which would drop the base tag)
    expect(mdOpenSh).not.toMatch(/^\s*cat "\$DIR\/index\.html"$/m);
  });

  it("the app's md-open-helper.sh (in setup-macos-app.sh) matches", () => {
    expect(setupSh).toMatch(/sed "1,\/<head>\/s\|<head>\|<head><base href=\\"\$RES_URL\\">\|"/);
    expect(setupSh).not.toMatch(/^\s*cat "\$\{RES_DIR\}index\.html"$/m);
  });

  it('the sed expression only rewrites the real <head>, not the ones in JS template literals', () => {
    // Behavioral check of the exact expression both scripts use: run it over
    // index.html and confirm exactly one <base> is injected even though
    // "<head>" occurs multiple times (exportHtml/copyHtml templates).
    const headCount = (indexHtml.match(/<head>/g) || []).length;
    expect(headCount).toBeGreaterThan(1); // the very hazard the range guards against
    const out = execFileSync(
      'sed',
      ['1,/<head>/s|<head>|<head><base href="file:///install/dir/">|', join(root, 'index.html')],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 },
    );
    expect((out.match(/<base href=/g) || []).length).toBe(1);
    expect(out).toMatch(/^<head><base href="file:\/\/\/install\/dir\/">$/m);
  });

  it('both entry points percent-encode the directory into a file:// URL', () => {
    expect(mdOpenSh).toMatch(/urllib\.parse.*quote/);
    expect(setupSh).toMatch(/urllib\.parse.*quote/);
  });

  it('setup-macos-app.sh bundles vendor/ into Contents/Resources and refuses to build without it', () => {
    expect(setupSh).toMatch(/cp -R "\$DIR\/vendor" "\$RESOURCES\/"/);
    expect(setupSh).toMatch(/vendor\/ not found\. Run \.\/bin\/vendor\.sh first/);
  });
});
