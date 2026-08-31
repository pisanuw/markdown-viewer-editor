import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
export const mdOpenSh = readFileSync(join(root, 'bin/md-open.sh'), 'utf8');
export const setupSh = readFileSync(join(root, 'bin/setup-macos-app.sh'), 'utf8');

// Extract a top-level function's source from index.html so the tests exercise the
// real shipped code instead of a re-implemented copy. The closing brace is matched
// at column 0 (top-level functions in index.html are not indented).
export function extractFunction(name) {
  const re = new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`, 'm');
  const m = indexHtml.match(re);
  if (!m) throw new Error(`Could not find function ${name}() in index.html`);
  return m[0];
}

// Reconstruct an extracted function with its free variables (marked, DOMPurify,
// escapeHtml) injected, so it can be called directly in the test environment.
export function buildRenderMarkdown({ marked, DOMPurify, escapeHtml }) {
  const src = extractFunction('renderMarkdown');
  return new Function('marked', 'DOMPurify', 'escapeHtml', `${src}\nreturn renderMarkdown;`)(
    marked,
    DOMPurify,
    escapeHtml,
  );
}

// index.html also defines several small utilities as single-line functions
// (e.g. `function escapeHtml(str) { ... }`), so the closing brace is never at
// the start of its own line and extractFunction()'s `\n}` anchor can't find
// it. Grab the whole physical line instead: these one-liners are self
// contained (balanced braces, no embedded newline), so the line *is* the
// function.
export function extractLineFunction(name) {
  const re = new RegExp(`^function ${name}\\([^)]*\\) \\{.*\\}$`, 'm');
  const m = indexHtml.match(re);
  if (!m) throw new Error(`Could not find single-line function ${name}() in index.html`);
  return m[0];
}

// Build a pure (or near-pure) top-level function from index.html with its free
// variables bound, and return it ready to call. `extractor` must be either
// extractFunction (multi-line, closing brace on its own line) or
// extractLineFunction (single-line) -- callers pick explicitly rather than
// letting this guess, because extractFunction's non-greedy `\n}` search will
// happily (and silently) over-match past a one-line function into whatever
// multi-line function happens to follow it in the file.
export function build(name, extractor, freeVars = {}) {
  const src = extractor(name);
  const argNames = Object.keys(freeVars);
  const argValues = Object.values(freeVars);
  return new Function(...argNames, `${src}\nreturn ${name};`)(...argValues);
}
