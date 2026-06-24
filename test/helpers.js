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
