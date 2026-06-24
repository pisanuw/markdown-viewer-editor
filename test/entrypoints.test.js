// Guards the two macOS entry points against drift. Both must inject the file
// content as RAW base64 into window.__initialContent (index.html decodes it with
// atob). Pre-decoding in the shell makes index.html atob() a plain-text string
// and throw. Regression guard for F3.
import { describe, it, expect } from 'vitest';
import { mdOpenSh, setupSh } from './helpers.js';

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
