// Exercises the real updateTOC() extracted from index.html. updateTOC() builds
// its sidebar list by string-concatenating heading text into innerHTML, so a
// heading line containing markup is a second, easy-to-miss injection surface
// distinct from the main renderMarkdown() path already covered by
// sanitize.test.js -- these tests confirm it goes through escapeHtml/escapeAttr
// too.
import { describe, it, expect } from 'vitest';
import { extractFunction, extractLineFunction, build } from './helpers.js';

const escapeHtml = build('escapeHtml', extractLineFunction);
const escapeAttr = build('escapeAttr', extractLineFunction);

function buildUpdateTOC() {
  const tocList = document.createElement('div');
  // updateTOC() only touches `editor` inside a click listener it attaches;
  // it's never invoked synchronously by calling updateTOC() itself, so a
  // stub is enough to satisfy the closure without ever being called.
  const editor = { getValue: () => '', setCursor: () => {}, focus: () => {} };
  const fn = build('updateTOC', extractFunction, { tocList, escapeHtml, escapeAttr, editor });
  return { fn, tocList };
}

describe('updateTOC()', () => {
  it('lists headings in document order with correct levels', () => {
    const { fn, tocList } = buildUpdateTOC();
    fn('# Title\n\nsome text\n\n## Section One\n\ncontent\n\n### Sub Section');
    const items = [...tocList.querySelectorAll('.toc-item')];
    expect(items.map((el) => el.textContent)).toEqual(['Title', 'Section One', 'Sub Section']);
    expect(items.map((el) => el.className)).toEqual(['toc-item h1', 'toc-item h2', 'toc-item h3']);
  });

  it('strips markdown emphasis/code markers from heading text', () => {
    const { fn, tocList } = buildUpdateTOC();
    fn('# **Bold** and `code` and _em_');
    expect(tocList.querySelector('.toc-item')?.textContent).toBe('Bold and code and em');
  });

  it('shows a placeholder when there are no headings', () => {
    const { fn, tocList } = buildUpdateTOC();
    fn('just a paragraph, no headings here');
    expect(tocList.querySelectorAll('.toc-item').length).toBe(0);
    expect(tocList.textContent).toContain('No headings');
  });

  it('does not treat non-ATX text as a heading (e.g. a bare "#" mid-line)', () => {
    const { fn, tocList } = buildUpdateTOC();
    fn('this has a # in the middle, not a heading');
    expect(tocList.querySelectorAll('.toc-item').length).toBe(0);
  });

  it('escapes HTML in heading text so a malicious .md file cannot inject into the TOC sidebar', () => {
    const { fn, tocList } = buildUpdateTOC();
    fn('# <img src=x onerror="alert(1)">');
    expect(tocList.querySelectorAll('img').length).toBe(0);
    expect(tocList.querySelectorAll('.toc-item').length).toBe(1);
    expect(tocList.querySelector('.toc-item')?.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it('escapes a double quote in heading text so it cannot break out of the data-heading attribute', () => {
    const { fn, tocList } = buildUpdateTOC();
    fn('# heading" onclick="alert(1)');
    const item = tocList.querySelector('.toc-item');
    // The attribute must round-trip to the literal string, not create a
    // second live onclick attribute on the element.
    expect(item?.getAttribute('data-heading')).toBe('heading" onclick="alert(1)');
    expect(item?.hasAttribute('onclick')).toBe(false);
  });

  it('supports all six ATX heading levels', () => {
    const { fn, tocList } = buildUpdateTOC();
    fn('# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6');
    const items = [...tocList.querySelectorAll('.toc-item')];
    expect(items.map((el) => el.className)).toEqual([
      'toc-item h1',
      'toc-item h2',
      'toc-item h3',
      'toc-item h4',
      'toc-item h5',
      'toc-item h6',
    ]);
  });
});
