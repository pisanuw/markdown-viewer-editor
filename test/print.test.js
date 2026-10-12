// The screen layout is a viewport-height flex column (html/body height:100%)
// whose preview is a scroll container (.main-container overflow:hidden,
// .preview-content overflow-y:auto). A height-constrained scroll container
// clips instead of paginating, so if the print stylesheet stops resetting any
// link in that chain the browser silently prints only the first screenful --
// one page -- of a long document. Verified against headless Chrome: a 60
// section document printed 1 page (9 sections) before these resets and 8 pages
// (all 60) after, so these are static guards on a fix that cannot be exercised
// in jsdom (which implements no pagination).
import { describe, it, expect } from 'vitest';
import { indexHtml } from './helpers.js';

const printBlock = (() => {
  const start = indexHtml.indexOf('@media print {');
  if (start === -1) throw new Error('Could not find the @media print block in index.html');
  // Brace-match from the opening brace so nested rules are included and the
  // block after it is not.
  const from = indexHtml.indexOf('{', start);
  let depth = 0;
  for (let i = from; i < indexHtml.length; i++) {
    if (indexHtml[i] === '{') depth++;
    else if (indexHtml[i] === '}' && --depth === 0) return indexHtml.slice(start, i + 1);
  }
  throw new Error('Unterminated @media print block in index.html');
})();

// Every selector that must be freed from the screen layout's height/overflow
// constraints, with the declarations it needs. `html, body` is the outermost
// link: leaving height:100% there alone is enough to clip the print to a page.
const RESET = [
  ['html, body', ['height: auto', 'overflow: visible']],
  ['.main-container', ['height: auto', 'overflow: visible']],
  ['.preview-pane', ['height: auto', 'overflow: visible']],
  ['.preview-pane .preview-content', ['height: auto', 'overflow: visible']],
];

// Grab one rule's declaration body out of the print block. Selectors are
// matched at the start of a rule so `.preview-pane` does not match inside
// `.preview-pane .preview-content`.
function declarationsFor(selector) {
  const re = new RegExp(`(?:^|[{};]|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, 'm');
  const m = printBlock.match(re);
  if (!m) throw new Error(`The @media print block has no rule for "${selector}"`);
  return m[1];
}

describe('@media print releases the screen layout so the whole document prints', () => {
  it.each(RESET)('%s is unconstrained and not a clipping container', (selector, decls) => {
    const body = declarationsFor(selector);
    for (const decl of decls) {
      // !important matters: the screen rules it overrides are at least as
      // specific (e.g. body.preview-only .preview-pane .preview-content).
      expect(body).toMatch(new RegExp(`${decl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*!important`));
    }
  });

  it('breaks the preview out of the flex column rather than stretching it', () => {
    for (const selector of ['.main-container', '.preview-pane', '.preview-pane .preview-content']) {
      expect(declarationsFor(selector)).toMatch(/flex: none\s*!important/);
    }
  });

  it('drops the preview-only side padding, which would waste 40% of each page', () => {
    // body.preview-only .preview-pane .preview-content { padding: 2em 20% }
    // outranks a bare .preview-pane .preview-content, so the print override has
    // to name that selector (or carry !important) to take effect. Files opened
    // from Finder start in preview-only mode, so this is the common print path.
    expect(printBlock).toMatch(/body\.preview-only\s+\.preview-pane\s+\.preview-content/);
    expect(printBlock).toMatch(/padding: 0\s*!important/);
  });

  it('hides the editor chrome', () => {
    for (const selector of ['.toolbar-row', '.format-bar', '.tab-bar', '.toc-panel', '.splitter', '.editor-pane', '.status-bar']) {
      expect(printBlock).toContain(selector);
    }
    expect(printBlock).toMatch(/display: none\s*!important/);
  });
});

describe('the screen layout still has the constraints the print rules undo', () => {
  // If these ever change shape, the print block above is solving a problem that
  // no longer exists and should be re-derived rather than carried forward.
  it('keeps html/body at viewport height and the preview as a scroll container', () => {
    expect(indexHtml).toMatch(/html, body \{ height: 100%; \}/);
    expect(indexHtml).toMatch(/\.main-container \{[^}]*overflow: hidden/);
    expect(indexHtml).toMatch(/\.preview-pane \.preview-content \{[^}]*overflow-y: auto/);
  });
});

describe('@media print keeps self-contained blocks off page boundaries', () => {
  // Verified against headless Chrome on a document built so blocks straddle
  // breaks: 5 of 12 code blocks/tables were split across a page before these
  // rules and 0 after, with no content lost either way.
  it('asks the browser not to split code blocks, tables or images', () => {
    const rule = printBlock.match(/\.preview-content pre,[\s\S]*?\}/);
    expect(rule, 'no break-inside rule for pre/table/img in @media print').not.toBeNull();
    for (const sel of ['pre', 'table', 'img']) {
      expect(rule[0]).toContain(`.preview-content ${sel}`);
    }
    expect(rule[0]).toMatch(/break-inside: avoid/);
    // page-break-inside is the pre-fragmentation-spec spelling; harmless to
    // keep and still what some print paths honour.
    expect(rule[0]).toMatch(/page-break-inside: avoid/);
  });

  it('does not clamp image height to the page', () => {
    // A max-height/object-fit clamp looks like it protects tall images, but
    // Chrome already slices a too-tall image across pages without losing any
    // of it; the clamp only shrinks it (measured: 249px -> 101px wide on a
    // 340px page), so a tall screenshot prints unreadably small.
    expect(printBlock).not.toMatch(/max-height: 100vh/);
    expect(printBlock).not.toMatch(/object-fit/);
  });
});
