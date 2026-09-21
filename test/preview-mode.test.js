// A file opened from Finder (or bin/md-open.sh) arrives via
// window.__initialContent and should start in preview-only mode. Exercises the
// real togglePreviewOnly() extracted from index.html, plus static guards on the
// two call sites that make the feature work.
import { describe, it, expect, beforeEach } from 'vitest';
import { indexHtml, extractFunction, build } from './helpers.js';

function buildToggle() {
  const editor = { refreshes: 0, refresh() { this.refreshes++; } };
  const fn = build('togglePreviewOnly', extractFunction, { editor });
  return { fn, editor };
}

const isOn = () => document.body.classList.contains('preview-only');
const btnActive = () => document.getElementById('previewOnlyBtn').classList.contains('btn-active');

describe('togglePreviewOnly()', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '<button id="previewOnlyBtn">Preview</button>';
  });

  it('toggles preview-only mode and keeps the button state in sync', () => {
    const { fn } = buildToggle();
    fn();
    expect([isOn(), btnActive()]).toEqual([true, true]);
    fn();
    expect([isOn(), btnActive()]).toEqual([false, false]);
  });

  it('force=true turns it on and stays on when repeated', () => {
    const { fn } = buildToggle();
    fn(true);
    fn(true);
    expect([isOn(), btnActive()]).toEqual([true, true]);
  });

  it('refreshes CodeMirror when the editor is shown again', () => {
    const { fn, editor } = buildToggle();
    fn(true);
    expect(editor.refreshes).toBe(0);
    fn();
    expect(editor.refreshes).toBe(1);
  });
});

describe('externally opened files start in preview-only mode', () => {
  it('loadInitialContent() forces preview-only in the __initialContent branch', () => {
    const branch = indexHtml.match(/if \(window\.__initialContent\) \{([\s\S]*?)\} else \{/)[1];
    expect(branch).toMatch(/togglePreviewOnly\(true\)/);
  });

  it('the Preview button does not pass its click event as the force argument', () => {
    // addEventListener('click', togglePreviewOnly) would pass a truthy Event as
    // `force`, so the button could turn preview-only on but never off.
    expect(indexHtml).not.toMatch(/addEventListener\('click', togglePreviewOnly\)/);
    expect(indexHtml).toMatch(/previewOnlyBtn'\)\.addEventListener\('click', \(\) => togglePreviewOnly\(\)\)/);
  });
});
